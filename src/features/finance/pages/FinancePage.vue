<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  addTransaction,
  deleteTransaction,
  financeTransactions,
  updateTransaction,
} from '@/features/finance/financeStore'

const router = useRouter()
const tab = ref('calendar')
const filter = ref('all')
const month = ref('2026-07')
const selectedDate = ref('2026-07-16')
const panel = ref('')
const editingId = ref(null)
const form = reactive({
  type: 'expense',
  amount: '',
  category: '식비',
  date: '2026-07-16',
  time: '12:10',
  memo: '',
})
const money = (value) => new Intl.NumberFormat('ko-KR').format(Math.abs(value))
const signed = (value) => `${value >= 0 ? '+' : '-'}${money(value)}원`
const formattedAmount = computed({
  get: () => (form.amount ? money(Number(form.amount)) : ''),
  set: (value) => {
    form.amount = String(value).replace(/\D/g, '')
  },
})
const formattedDate = computed({
  get: () => form.date.replaceAll('-', '.'),
  set: (value) => {
    form.date = String(value).replaceAll('.', '-')
  },
})
const monthLabel = computed(() => {
  const [year, mon] = month.value.split('-').map(Number)
  return `${year}년 ${mon}월`
})

function changeMonth(offset) {
  const [year, mon] = month.value.split('-').map(Number)
  const next = new Date(year, mon - 1 + offset, 1)
  month.value = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  selectedDate.value = `${month.value}-01`
  panel.value = ''
}

const monthRows = computed(() =>
  financeTransactions.value
    .filter((row) => row.date.startsWith(month.value))
    .sort((a, b) => `${b.date}${b.time || ''}`.localeCompare(`${a.date}${a.time || ''}`)),
)
const filteredMonthRows = computed(() =>
  monthRows.value.filter(
    (row) =>
      filter.value === 'all' || (filter.value === 'income' ? row.amount > 0 : row.amount < 0),
  ),
)
const visibleRows = filteredMonthRows
const income = computed(() =>
  monthRows.value.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0),
)
const expense = computed(() =>
  monthRows.value.filter((r) => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0),
)
const dayRows = computed(() =>
  filteredMonthRows.value.filter((row) => row.date === selectedDate.value),
)
const fixedTotal = computed(() =>
  monthRows.value.filter((r) => r.fixed).reduce((s, r) => s + Math.abs(r.amount), 0),
)
const categoryTotals = computed(() => {
  const result = {}
  monthRows.value
    .filter((r) => r.amount < 0)
    .forEach((r) => {
      result[r.category] = (result[r.category] || 0) + Math.abs(r.amount)
    })
  return Object.entries(result).sort((a, b) => b[1] - a[1])
})
const categoryColors = {
  월세: '#fae7a4',
  주거: '#fae7a4',
  식비: '#86a8f1',
  교통: '#f4a2a2',
  공과금: '#9aa6b8',
  통신비: '#f2b43d',
  기타: '#475569',
  구독: '#222222',
  보험: '#8e7cc3',
  교육: '#6fa8dc',
}
const categoryChartRows = computed(() =>
  categoryTotals.value.map(([name, total], index) => ({
    name,
    total,
    color: categoryColors[name] || ['#6d7f9a', '#d29b72', '#73a89b'][index % 3],
  })),
)
const donutGradient = computed(() => {
  const total = categoryChartRows.value.reduce((sum, item) => sum + item.total, 0)
  if (!total) return 'conic-gradient(#edf0f5 0 100%)'

  let start = 0
  const segments = categoryChartRows.value.map((item) => {
    const end = start + (item.total / total) * 100
    const segment = `${item.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`
    start = end
    return segment
  })
  return `conic-gradient(${segments.join(', ')})`
})

const days = computed(() => {
  const [year, mon] = month.value.split('-').map(Number)
  const first = new Date(year, mon - 1, 1).getDay()
  const count = new Date(year, mon, 0).getDate()
  return Array.from({ length: first + count }, (_, index) => {
    const raw = index - first + 1
    const date = raw < 1 ? '' : raw
    const current = raw >= 1
    const iso = current ? `${month.value}-${String(date).padStart(2, '0')}` : ''
    const total = current
      ? filteredMonthRows.value.filter((r) => r.date === iso).reduce((s, r) => s + r.amount, 0)
      : 0
    return { date, current, iso, total }
  })
})

function openDate(iso) {
  if (!iso) return
  selectedDate.value = iso
  panel.value = 'day'
}
function openAdd() {
  editingId.value = null
  Object.assign(form, {
    type: 'income',
    amount: '500000',
    category: '수입',
    date: '2026-07-16',
    time: '09:20',
    memo: '',
  })
  panel.value = 'form'
}
function openEdit(row) {
  editingId.value = row.id
  Object.assign(form, {
    type: row.amount > 0 ? 'income' : 'expense',
    amount: String(Math.abs(row.amount)),
    category: row.category,
    date: row.date,
    time: row.time || '12:00',
    memo: row.memo || row.title,
  })
  panel.value = 'form'
}
function save() {
  if (!Number(form.amount) || !form.date) return
  const payload = {
    date: form.date,
    time: form.time,
    title: form.memo || (form.type === 'income' ? '수입' : form.category),
    category: form.type === 'income' ? '수입' : form.category,
    detail: form.type === 'income' ? '입금' : '카드',
    memo: form.memo,
    amount: Math.abs(Number(form.amount)) * (form.type === 'income' ? 1 : -1),
  }
  if (editingId.value) updateTransaction(editingId.value, payload)
  else addTransaction(payload)
  panel.value = ''
}
function remove() {
  if (editingId.value) deleteTransaction(editingId.value)
  panel.value = ''
}
function dayLabel(value) {
  if (!value) return ''
  const [, m, d] = value.split('-')
  return `${Number(m)}월 ${Number(d)}일 거래`
}
function groupLabel(date) {
  const [, m, d] = date.split('-')
  return `${Number(m)}월 ${Number(d)}일${date === '2026-07-16' ? ' (오늘)' : ''}`
}
</script>

<template>
  <section class="finance">
    <header class="heading">
      <div>
        <h1>내 재정</h1>
        <p>이번 달의 수입·지출과 거래 흐름을 확인하세요.</p>
      </div>
    </header>

    <div class="summary">
      <article>
        <span>이번 달 수입</span><strong class="blue">{{ signed(income) }}</strong>
        <small>지난달 대비 +12%</small>
      </article>
      <article>
        <span>이번 달 지출</span><strong class="red">-{{ money(expense) }}원</strong>
        <small>예상 지출 포함</small>
      </article>
      <article>
        <span>순현금흐름</span><strong class="purple">{{ signed(income - expense) }}</strong>
        <small>수입 − 지출</small>
      </article>
    </div>
    <div class="desktop-add-row">
      <button class="add-btn" @click="openAdd">＋ 거래 추가</button>
    </div>

    <div class="tabs">
      <button :class="{ active: tab === 'calendar' }" @click="tab = 'calendar'">캘린더</button
      ><button :class="{ active: tab === 'list' }" @click="tab = 'list'">거래 목록</button>
    </div>
    <div class="mobile-toolbar">
      <div class="filters">
        <button
          v-for="item in [
            ['income', '수입만'],
            ['expense', '지출만'],
          ]"
          :key="item[0]"
          :class="{ on: filter === item[0] }"
          @click="filter = filter === item[0] ? 'all' : item[0]"
        >
          {{ item[1] }}
        </button>
      </div>
      <button class="add-btn" @click="openAdd">＋ 거래 추가</button>
    </div>

    <section v-if="tab === 'calendar'" class="card calendar-card">
      <div class="card-head">
        <h2>월별 캘린더</h2>
        <div class="filters">
          <button
            v-for="item in [
              ['all', '전체'],
              ['income', '수입만'],
              ['expense', '지출만'],
            ]"
            :key="item[0]"
            :class="{ on: filter === item[0] }"
            @click="filter = item[0]"
          >
            {{ item[1] }}
          </button>
        </div>
      </div>
      <div class="month-nav">
        <button type="button" aria-label="이전 달" @click="changeMonth(-1)">‹</button>
        <b>{{ monthLabel }}</b>
        <button type="button" aria-label="다음 달" @click="changeMonth(1)">›</button>
      </div>
      <div class="week">
        <b v-for="name in ['일', '월', '화', '수', '목', '금', '토']" :key="name">{{ name }}</b>
      </div>
      <div class="calendar">
        <button
          v-for="(day, index) in days"
          :key="index"
          :class="{ muted: !day.current, selected: selectedDate === day.iso }"
          @click="openDate(day.iso)"
        >
          <span>{{ day.date }}</span
          ><small v-if="day.total" :class="{ plus: day.total > 0 }"
            >{{ day.total > 0 ? '+' : '-' }}{{ Math.round(Math.abs(day.total) / 10000) }}만</small
          >
        </button>
      </div>
      <div class="legend"><span>● 입금</span><span>● 지출</span></div>
    </section>

    <section v-else class="card list-card">
      <div class="card-head">
        <h2>거래 목록</h2>
        <div class="list-actions">
          <div class="filters">
            <button
              v-for="item in [
                ['all', '전체'],
                ['income', '수입만'],
                ['expense', '지출만'],
              ]"
              :key="item[0]"
              :class="{ on: filter === item[0] }"
              @click="filter = item[0]"
            >
              {{ item[1] }}
            </button>
          </div>
          <span>총 {{ visibleRows.length }}건</span>
        </div>
      </div>
      <div class="list-filter">
        <button>
          <span>전체 거래</span>
          <span class="dropdown-caret" aria-hidden="true">⌄</span>
        </button>
      </div>
      <div class="month-nav">
        <button type="button" aria-label="이전 달" @click="changeMonth(-1)">‹</button>
        <b>{{ monthLabel }}</b>
        <button type="button" aria-label="다음 달" @click="changeMonth(1)">›</button>
      </div>
      <div class="transaction-scroll">
        <template v-for="(row, index) in visibleRows" :key="row.id">
          <h3 v-if="index === 0 || visibleRows[index - 1].date !== row.date" class="date-title">
            {{ groupLabel(row.date) }}
          </h3>
          <button class="transaction" @click="openEdit(row)">
            <i>{{ row.title.slice(0, 1) }}</i
            ><span
              ><b>{{ row.title }}</b
              ><small>{{ row.detail }} · {{ row.time }}</small></span
            ><strong :class="{ plus: row.amount > 0 }">{{ signed(row.amount) }}</strong>
          </button>
        </template>
      </div>
    </section>

    <div class="insights">
      <section class="card category">
        <h2>카테고리별 지출</h2>
        <div class="category-body">
          <div class="donut" :style="{ background: donutGradient }"></div>
          <ul>
            <li
              v-for="item in categoryChartRows.slice(0, 7)"
              :key="item.name"
              :style="{ '--category-color': item.color }"
            >
              <span>{{ item.name }}</span
              ><b>{{ money(item.total) }}원</b>
            </li>
          </ul>
        </div>
        <p class="category-insight">
          <strong>인사이트</strong>
          <span>식비가 지난달보다 38,000원 늘었어요</span>
        </p>
      </section>
      <section class="card fixed">
        <h2>고정지출</h2>
        <strong>{{ (fixedTotal / 10000).toFixed(1) }}만원</strong>
        <p>고정지출 내역을 한 눈에 볼 수 있어요.</p>
        <p>여기를 눌러서 고정지출을 추가해보세요.</p>
        <hr />
        <button @click="router.push({ name: 'fixedExpenses' })">자세히 보기 ›</button>
      </section>
    </div>

    <section class="card timeline">
      <h2>월별 재정 타임라인</h2>
      <div class="timeline-legend">
        <span class="legend-now">● 현재 기준</span>
        <span class="legend-plan">● 시나리오 적용</span>
        <span class="legend-goal">● 목표 취업 시기</span>
      </div>
      <svg
        class="timeline-chart timeline-chart--desktop"
        viewBox="0 0 1066 224"
        role="img"
        aria-label="월별 재정 변화 그래프"
      >
        <g class="grid">
          <line x1="60" y1="18" x2="1040" y2="18" />
          <line x1="60" y1="60.5" x2="1040" y2="60.5" />
          <line x1="60" y1="103" x2="1040" y2="103" />
          <line x1="60" y1="145.5" x2="1040" y2="145.5" />
          <line x1="60" y1="188" x2="1040" y2="188" />
        </g>
        <g class="axis-y">
          <text x="52" y="22">300만</text>
          <text x="52" y="64">225만</text>
          <text x="52" y="107">150만</text>
          <text x="52" y="150">75만</text>
          <text x="52" y="192">0</text>
        </g>
        <line class="risk" x1="60" y1="160" x2="1040" y2="160" />
        <text class="risk-label" x="1038" y="153">위험 잔액 50만</text>
        <line class="goal-line" x1="632" y1="18" x2="632" y2="188" />
        <polyline points="60,18 222,78 387,188 550,188 1040,188" class="now" />
        <polyline points="60,18 223,58 387,102 550,146 713,188 1040,188" class="plan" />
        <g class="axis-x">
          <text x="60" y="211">7월</text>
          <text x="223" y="211">9월</text>
          <text x="387" y="211">11월</text>
          <text x="550" y="211">1월</text>
          <text x="713" y="211">3월</text>
          <text x="877" y="211">5월</text>
          <text x="1030" y="211">7월</text>
        </g>
        <g class="timeline-label label-now">
          <rect x="150" y="91" width="122" height="24" rx="12" />
          <text x="211" y="107">현재 3.8개월</text>
        </g>
        <g class="timeline-label label-plan">
          <rect x="260" y="68" width="140" height="24" rx="12" />
          <text x="330" y="84">시나리오 6.3개월</text>
        </g>
      </svg>
      <svg
        class="timeline-chart timeline-chart--mobile"
        viewBox="0 0 360 205"
        role="img"
        aria-label="모바일 월별 재정 변화 그래프"
      >
        <g class="grid">
          <line x1="38" y1="18" x2="334" y2="18" />
          <line x1="38" y1="54" x2="334" y2="54" />
          <line x1="38" y1="90" x2="334" y2="90" />
          <line x1="38" y1="126" x2="334" y2="126" />
          <line x1="38" y1="162" x2="334" y2="162" />
        </g>
        <g class="axis-y">
          <text x="31" y="22">300만</text>
          <text x="31" y="58">225만</text>
          <text x="31" y="94">150만</text>
          <text x="31" y="130">75만</text>
          <text x="31" y="166">0</text>
        </g>
        <polygon
          class="mobile-plan-area"
          points="38,18 100,56 164,82 228,122 291,162 334,162 38,162"
        />
        <line class="risk" x1="38" y1="138" x2="334" y2="138" />
        <text class="mobile-risk-amount" x="342" y="142">50만</text>
        <line class="goal-line" x1="210" y1="18" x2="210" y2="162" />
        <polyline class="mobile-now" points="38,18 100,88 146,162" />
        <polyline class="mobile-plan" points="38,18 100,56 164,82 228,122 291,162" />
        <circle class="mobile-now-point" cx="146" cy="162" r="4.5" />
        <circle class="mobile-plan-point" cx="291" cy="162" r="4.5" />
        <g class="axis-x">
          <text x="38" y="180">7월</text>
          <text x="87" y="180">9월</text>
          <text x="137" y="180">11월</text>
          <text x="186" y="180">1월</text>
          <text x="235" y="180">3월</text>
          <text x="284" y="180">5월</text>
          <text x="334" y="180">7월</text>
        </g>
        <g class="timeline-label label-now">
          <rect x="47" y="114" width="96" height="20" rx="10" />
          <text x="95" y="128">현재 3.8개월</text>
        </g>
        <g class="timeline-label label-plan">
          <rect x="91" y="60" width="118" height="20" rx="10" />
          <text x="150" y="74">시나리오 6.3개월</text>
        </g>
        <g class="mobile-risk-key">
          <line x1="277" y1="197" x2="302" y2="197" />
          <text x="307" y="201">위험 잔액</text>
        </g>
      </svg>
      <p class="timeline-note">300만원 기준 · 월 고정수입 45만원 적용 시 3.8 → 6.3개월</p>
    </section>

    <div v-if="panel" class="overlay" @click.self="panel = ''">
      <aside class="sheet">
        <button class="close" @click="panel = ''">×</button>
        <template v-if="panel === 'day'">
          <h2>{{ dayLabel(selectedDate) }}</h2>
          <div class="day-total">
            <span>오늘 합계</span
            ><strong>{{ signed(dayRows.reduce((s, r) => s + r.amount, 0)) }}</strong>
          </div>
          <h3>거래 내역</h3>
          <button v-for="row in dayRows" :key="row.id" class="transaction" @click="openEdit(row)">
            <i>{{ row.title.slice(0, 1) }}</i
            ><span
              ><b>{{ row.title }}</b
              ><small>{{ row.detail }} · {{ row.time }}</small></span
            ><strong :class="{ plus: row.amount > 0 }">{{ signed(row.amount) }}</strong>
          </button>
        </template>
        <template v-else>
          <h2>{{ editingId ? '거래 수정' : '거래 추가' }}</h2>
          <p class="form-label">거래 타입</p>
          <div class="type-toggle">
            <button
              :class="{ income: form.type === 'income' }"
              @click="form.type = 'income'; form.category = '수입'"
            >
              <strong>수입</strong></button
            ><button
              :class="{ expense: form.type === 'expense' }"
              @click="form.type = 'expense'; form.category = '식비'"
            >
              <strong>지출</strong>
            </button>
          </div>
          <button v-if="editingId" class="delete" @click="remove">삭제</button>
          <label
            >금액<input v-model="formattedAmount" type="text" inputmode="numeric" /><span>원</span></label
          >
          <label v-if="form.type === 'expense'"
            >카테고리<select v-model="form.category">
              <option
                v-for="name in ['식비', '주거', '교통', '구독', '보험', '교육', '기타']"
                :key="name"
              >
                {{ name }}
              </option>
            </select></label
          >
          <label class="date-field"
            >거래일<input v-model="formattedDate" type="text" inputmode="numeric"
          /></label>
          <label>메모<input v-model="form.memo" placeholder="메모 (선택)" /></label>
          <button class="save" @click="save">
            <strong>{{
              editingId ? '변경사항 저장' : form.type === 'income' ? '수입 저장' : '지출 저장'
            }}</strong>
          </button>
        </template>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.finance {
  width: calc(100% + 15px);
  max-width: 1066px;
  margin: 0;
  padding-top: 59px;
  color: #222;
  font-weight: 400;
}
.heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin: 0 0 11px;
}
.heading h1 {
  margin: 0;
  color: #222;
  font-size: 24px;
  line-height: 1.25;
}
.heading p {
  margin: 7px 0 0;
  color: #666;
  font-size: 13px;
}
.mobile-toolbar {
  display: none;
}
.desktop-add-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 66px;
}
.desktop-add-row .add-btn {
  transform: translateY(3px);
}
button {
  font: inherit;
}
.add-btn {
  width: 150px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: #999;
  color: #fff;
  padding: 0;
  font-size: 12px !important;
  font-weight: 700 !important;
}
.summary {
  display: grid;
  grid-template-columns: repeat(3, 320px);
  justify-content: space-between;
  gap: 38px;
  padding-right: 30px;
}
.summary article {
  height: 132px;
  padding: 17px 20px;
  border-radius: 16px;
  background: #dfe8ff;
  box-shadow: 0 2px 3px #0003;
  box-sizing: border-box;
}
.summary article:nth-child(2) {
  background: #ffcaca;
}
.summary article:nth-child(3) {
  background: #ded8f0;
}
.summary span,
.summary strong {
  display: block;
}
.summary span {
  font-size: 14px;
  font-weight: 700;
}
.summary strong {
  margin-top: 6px;
  color: #475569;
  font-size: 25px;
  font-weight: 700;
}
.summary small {
  display: block;
  margin-top: 7px;
  color: #666;
  font-size: 12px;
  font-weight: 400;
}
.blue,
.plus {
  color: #0a1680 !important;
}
.red {
  color: #f0574f !important;
}
.purple {
  color: #65529b;
}
.tabs {
  display: flex;
  width: 346px;
  height: 42px;
  box-sizing: border-box;
  margin: 27px auto -60px;
  position: relative;
  z-index: 2;
  border: 1px solid #d9dce3;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 2px 4px #0002;
}
.tabs button {
  flex: 1;
  border: 0;
  background: #f4f4f6;
  padding: 0;
  color: #999;
  font-size: 14px !important;
  font-weight: 600 !important;
}
.tabs .active {
  background: #fff;
  color: #222;
  font-weight: 700 !important;
}
.card {
  background: #fff;
  border: 1px solid #d9dce3;
  border-radius: 18px;
  padding: 22px;
  box-shadow: 0 2px 4px #0002;
}
.calendar-card {
  height: 798px;
  padding: 18px 28px 20px;
  box-sizing: border-box;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
}
.card h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}
.filters {
  display: flex;
  gap: 7px;
}
.filters button {
  border: 0;
  border-radius: 20px;
  padding: 8px 16px;
  background: #f4f6fb;
  color: #475569;
  font-size: 12px !important;
  font-weight: 600 !important;
}
.filters .on {
  background: #0a1680;
  color: #fff;
}
.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 10px 0 3px;
  min-height: 28px;
  color: #475569;
  font-size: 14px;
}
.month-nav b {
  color: #222;
  font-size: 16px;
  font-weight: 700;
}
.month-nav button {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #475569;
  font-family: 'Pretendard', sans-serif !important;
  font-size: 18px !important;
  font-weight: 700 !important;
  line-height: 1;
}
.month-nav button:hover {
  background: #f0f2f7;
}
.week,
.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.week b {
  text-align: center;
  padding: 7px 8px;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}
.week b:first-child {
  color: #f0574f;
}
.calendar button {
  height: 110px;
  border: 0;
  border-top: 1px solid #e5e8ee;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 13px 8px;
  gap: 6px;
  font-size: 14px !important;
  font-weight: 700 !important;
}
.calendar button:hover {
  background: #f8faff;
}
.calendar .selected span {
  min-width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #0a1680;
  color: #fff;
}
.calendar .muted {
  pointer-events: none;
}
.calendar .muted span {
  visibility: hidden;
}
.calendar small {
  color: #f0574f;
  font-size: 11px;
  font-weight: 700;
}
.legend {
  display: flex;
  gap: 28px;
  padding: 23px 8px 0;
  color: #475569;
  font-size: 12px;
  font-weight: 400;
}
.legend span:first-child::first-letter {
  color: #222;
}
.legend span:last-child::first-letter {
  color: #f0574f;
}
.list-card {
  height: 560px;
  padding: 26px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}
.list-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}
.list-actions > span {
  color: #999;
  font-size: 12px;
  font-weight: 400;
}
.list-filter {
  margin-top: 12px;
  flex: none;
}
.list-filter button {
  border: 0;
  border-radius: 18px;
  background: #f4f6fb;
  padding: 8px 14px;
  color: #475569;
  font-size: 12px !important;
  font-weight: 600 !important;
  line-height: 16px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.dropdown-caret {
  display: inline-flex;
  align-items: center;
  height: 12px;
  font-size: 11px;
  line-height: 1;
  transform: translateY(-2px);
}
.transaction-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: #c9ced8 transparent;
}
.transaction-scroll::-webkit-scrollbar {
  width: 6px;
}
.transaction-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #c9ced8;
}
.date-title {
  margin: 16px 0 7px;
  font-size: 14px;
  font-weight: 700;
}
.transaction {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border: 1px solid #d9dce3;
  border-radius: 13px;
  background: #fff;
  margin-bottom: 8px;
  text-align: left;
  box-shadow: 0 2px 4px #0002;
}
.transaction i {
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #eef2ff;
  color: #1b2ca3;
  font-style: normal;
}
.transaction span {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.transaction span b {
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
}
.transaction small {
  color: #666;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
}
.transaction strong {
  margin-left: auto;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
}
.insights {
  display: grid;
  grid-template-columns: 516px minmax(0, 1fr);
  gap: 24px;
  margin-top: 55px;
}
.insights .card {
  height: 212px;
  padding: 19px 24px 16px;
  box-sizing: border-box;
}
.insights h2 {
  font-size: 14px;
}
.category-body {
  display: flex;
  align-items: center;
  gap: 26px;
  margin-top: 10px;
}
.category {
  position: relative;
  overflow: hidden;
}
.donut {
  width: 92px;
  aspect-ratio: 1;
  border-radius: 50%;
  position: relative;
  flex: none;
}
.donut:after {
  content: '';
  position: absolute;
  inset: 21px;
  border-radius: 50%;
  background: #fff;
}
.category ul {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
}
.category li {
  display: flex;
  justify-content: space-between;
  padding: 1px 2px;
  color: #475569;
  font-size: 12px;
  line-height: 16px;
  font-weight: 400;
}
.category li b {
  color: #222;
  font-weight: 600;
}
.category li span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.category li span:before {
  content: '';
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 50%;
  background: var(--category-color);
}
.category-insight {
  position: absolute;
  right: 24px;
  bottom: 16px;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  background: #fff0ed;
  color: #475569;
  padding: 7px 9px;
  border-radius: 7px;
  font-size: 10px;
  font-weight: 700;
}
.category-insight strong {
  color: #f97360;
  font-weight: 700;
}
.category-insight span {
  font-weight: 700;
}
.fixed > strong {
  display: block;
  margin: 10px 0 9px;
  font-size: 28px;
  font-weight: 700;
}
.fixed p {
  margin: 0;
  color: #666;
  font-size: 12px;
  font-weight: 400;
}
.fixed hr {
  margin: 24px 0 0;
  border: 0;
  border-top: 1px solid #e5e8ee;
}
.fixed button {
  float: right;
  margin-top: 9px;
  border: 0;
  background: none;
  font-size: 12px !important;
  font-weight: 700 !important;
}
.timeline {
  position: relative;
  height: 298px;
  margin-top: 26px;
  padding: 15px 26px 0;
  overflow: hidden;
  box-sizing: border-box;
}
.timeline h2 {
  font-size: 16px;
  font-weight: 700;
}
.timeline-chart {
  width: 100%;
  height: 224px;
  margin-top: 7px;
  overflow: visible;
}
.timeline-chart--mobile {
  display: none;
}
.timeline .grid line {
  stroke: #e7e9ef;
  stroke-width: 1;
}
.timeline .risk {
  stroke: #ff6d6d;
  stroke-width: 1;
  stroke-dasharray: 5 4;
}
.timeline .goal-line {
  stroke: #f1b94c;
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
}
.timeline polyline {
  fill: none;
  stroke-width: 3.5;
}
.timeline .now {
  stroke: #0a1680;
}
.timeline .plan {
  stroke: #93b2f8;
  stroke-dasharray: 8;
}
.timeline-legend {
  display: flex;
  gap: 10px;
  margin-top: 6px;
  color: #475569;
  font-size: 10px;
  font-weight: 400;
}
.legend-now {
  color: #0a1680;
}
.legend-plan {
  color: #93b2f8;
}
.legend-goal {
  color: #f1b94c;
}
.axis-y text,
.axis-x text,
.risk-label {
  fill: #94a3b8;
  font-size: 9px;
}
.axis-y text {
  text-anchor: end;
}
.axis-x text {
  text-anchor: middle;
}
.risk-label {
  text-anchor: end;
}
.timeline-label rect {
  stroke: none;
}
.timeline-label text {
  fill: #fff;
  font-size: 10px;
  font-weight: 700;
  text-anchor: middle;
}
.label-now rect {
  fill: #0a1680;
}
.label-plan rect {
  fill: #93b2f8;
}
.mobile-plan-area {
  fill: rgba(147, 178, 248, 0.28);
}
.mobile-now {
  fill: none;
  stroke: #111;
  stroke-width: 2.5;
  stroke-dasharray: 6 5;
}
.mobile-plan {
  fill: none;
  stroke: #93b2f8;
  stroke-width: 3;
}
.mobile-now-point {
  fill: #111;
}
.mobile-plan-point {
  fill: #93b2f8;
}
.mobile-risk-amount,
.mobile-risk-key text {
  fill: #475569;
  font-size: 9px;
}
.mobile-risk-key line {
  stroke: #ff6d6d;
  stroke-width: 1.5;
  stroke-dasharray: 5 4;
}
.timeline-note {
  position: absolute;
  bottom: 3px;
  left: 26px;
  margin: 0;
  color: #666;
  font-size: 10px;
}
.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: #17171766;
}
.sheet {
  position: absolute;
  right: max(0px, calc((100vw - 1440px) / 2));
  top: 0;
  width: 420px;
  height: 100%;
  padding: 34px 28px;
  background: #fcfdff;
  overflow: auto;
  box-sizing: border-box;
  font-family: 'Pretendard', sans-serif;
}
.close {
  position: absolute;
  right: 28px;
  top: 38px;
  border: 0;
  background: none;
  color: #666;
  font-family: inherit;
  font-size: 28px;
  line-height: 1;
}
.sheet h2 {
  margin: 18px 0 32px;
  padding: 0 0 20px;
  border-bottom: 1px solid #e4e7ed;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
}
.day-total {
  display: flex;
  justify-content: space-between;
  padding: 18px;
  background: #fff8d9;
  border-radius: 14px;
  margin-bottom: 24px;
}
.form-label {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
}
.type-toggle {
  display: flex;
  border: 1px solid #d9dce3;
  border-radius: 14px;
  overflow: hidden;
  height: 54px;
  margin-bottom: 28px;
  background: #fff;
  box-shadow: 0 2px 4px #0002;
}
.sheet .type-toggle button {
  flex: 1;
  border: 0;
  background: #fff;
  padding: 0 13px;
  font-family: 'Pretendard', sans-serif !important;
  font-size: 16px !important;
  font-weight: 700 !important;
}
.sheet .type-toggle button strong,
.sheet .save strong {
  font-family: 'Pretendard', sans-serif !important;
  font-weight: 700 !important;
}
.sheet .type-toggle button.income {
  background: #dff8ee !important;
  border-radius: 12px;
}
.sheet .type-toggle button.expense {
  background: #f9a2a2 !important;
  border-radius: 12px;
}
.sheet label {
  display: block;
  position: relative;
  font-weight: 700;
  margin: 0 0 24px;
  font-size: 14px;
}
.sheet input,
.sheet select {
  width: 100%;
  height: 58px;
  border: 1px solid #d9dce3;
  border-radius: 14px;
  padding: 0 18px;
  margin-top: 10px;
  background: #fff;
  font-family: inherit;
  color: #222;
  font-size: 17px;
  font-weight: 700;
  box-sizing: border-box;
  box-shadow: 0 2px 4px #0002;
}
.sheet label > span {
  position: absolute;
  right: 18px;
  bottom: 20px;
  color: #666;
}
.date-field {
  width: 100%;
}
.sheet .save {
  width: 100%;
  height: 58px;
  border: 0;
  border-radius: 14px;
  background: #ffeda7;
  font-family: 'Pretendard', sans-serif !important;
  font-weight: 700 !important;
  margin-top: 4px;
  font-size: 16px !important;
  box-shadow: 0 2px 4px #0002;
}
.delete {
  float: right;
  border: 0;
  background: none;
  color: #222;
  font-weight: 700;
}
@media (max-width: 767px) {
  .finance {
    width: 100%;
    padding: 0 0 8px;
  }
  .heading,
  .desktop-add-row {
    display: none;
  }
  .summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding-right: 0;
    gap: 10px;
  }
  .summary small {
    display: none;
  }
  .summary article {
    height: 74px;
    padding: 14px 12px;
    border-radius: 14px;
    box-shadow: 0 2px 4px #0002;
  }
  .summary span {
    font-size: 12px;
    font-weight: 700;
  }
  .summary strong {
    margin-top: 3px;
    font-size: 16px;
    font-weight: 700;
  }
  .tabs {
    width: 100%;
    margin: 12px 0 8px;
    border-radius: 999px;
  }
  .tabs button {
    padding: 9px;
    font-size: 14px !important;
    font-weight: 700 !important;
  }
  .mobile-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 8px 9px;
  }
  .mobile-toolbar .filters button {
    padding: 5px 12px;
    font-size: 12px !important;
    font-weight: 600 !important;
  }
  .mobile-toolbar .filters .on {
    background: #fff0f1;
    color: #f0574f;
  }
  .mobile-toolbar .add-btn {
    width: auto;
    height: auto;
    padding: 6px 16px;
    background: #999;
    font-size: 12px !important;
    font-weight: 600 !important;
  }
  .calendar-card {
    height: 468px;
    padding: 0 8px 10px;
    border-radius: 14px;
  }
  .calendar-card .card-head {
    display: none;
  }
  .month-nav {
    margin: 0 -8px 3px;
    padding: 10px 0 8px;
    border-bottom: 1px solid #e5e8ee;
    font-size: 14px;
    font-weight: 700;
  }
  .month-nav b {
    font-size: 14px;
    font-weight: 700;
  }
  .week b {
    padding: 6px 2px;
    font-size: 12px;
    font-weight: 700;
  }
  .calendar button {
    height: 67px;
    padding: 10px 2px;
    border-top: 0;
    font-size: 12px !important;
    font-weight: 700 !important;
    gap: 4px;
  }
  .calendar .selected span {
    min-width: 24px;
    height: 24px;
    background: #93b2f8;
    color: #222;
  }
  .calendar small {
    font-size: 10px;
    font-weight: 700;
  }
  .legend {
    margin: 0 -8px;
    padding: 10px 12px;
    border-top: 1px solid #e5e8ee;
    font-size: 11px;
    font-weight: 400;
  }
  .list-card {
    height: 365px;
    min-height: 0;
    padding: 12px 10px 16px;
    border-radius: 14px;
  }
  .list-card .card-head h2 {
    display: none;
  }
  .list-card > .card-head {
    justify-content: flex-end;
  }
  .list-actions {
    width: 100%;
    justify-content: flex-end;
  }
  .list-actions .filters {
    display: none;
  }
  .list-actions > span {
    font-size: 9px;
  }
  .list-filter {
    margin-top: -17px;
  }
  .list-filter button {
    padding: 5px 10px;
    font-size: 11px !important;
    font-weight: 600 !important;
  }
  .dropdown-caret {
    font-size: 10px;
    transform: translateY(-1px);
  }
  .list-card .month-nav {
    margin: 0 -2px 4px;
  }
  .date-title {
    font-size: 12px;
    font-weight: 700;
    margin: 10px 0 5px;
  }
  .transaction {
    padding: 8px;
    border-radius: 11px;
    margin-bottom: 6px;
  }
  .transaction i {
    width: 28px;
    height: 28px;
    font-size: 10px;
  }
  .transaction span b,
  .transaction strong {
    font-size: 12px;
    font-weight: 700;
  }
  .transaction small {
    font-size: 10px;
    font-weight: 400;
  }
  .insights {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-top: 12px;
  }
  .insights .card {
    height: auto;
    padding: 18px 16px;
    border-radius: 14px;
  }
  .insights h2 {
    font-size: 14px;
    font-weight: 700;
  }
  .category-body {
    gap: 18px;
  }
  .donut {
    width: 92px;
  }
  .donut:after {
    inset: 22px;
  }
  .category li {
    font-size: 12px;
    line-height: 16px;
  }
  .category-insight {
    position: static;
    margin: 14px 0 0;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 700;
  }
  .fixed > strong {
    font-size: 28px;
  }
  .fixed p {
    font-size: 12px;
  }
  .fixed button {
    margin-top: 18px;
    font-size: 12px !important;
    font-weight: 700 !important;
  }
  .timeline {
    height: 260px;
    margin-top: 12px;
    padding: 15px 14px 10px;
  }
  .timeline h2 {
    font-size: 16px;
    font-weight: 700;
  }
  .timeline-chart--desktop {
    display: none;
  }
  .timeline-chart--mobile {
    display: block;
    height: 185px;
    margin-top: 4px;
  }
  .timeline-chart--mobile .goal-line {
    stroke-width: 2;
    stroke-dasharray: none;
  }
  .timeline-chart--mobile .risk {
    stroke-width: 1.5;
  }
  .timeline-chart--mobile .axis-y text,
  .timeline-chart--mobile .axis-x text {
    font-size: 9px;
  }
  .timeline-chart--mobile .timeline-label text {
    font-size: 9px;
  }
  .timeline-legend {
    gap: 14px;
    font-size: 10px;
  }
  .timeline-note {
    display: none;
  }
  .sheet {
    top: auto;
    right: 0;
    bottom: 0;
    width: 100%;
    height: min(70vh, 760px);
    padding: 38px 22px 24px;
    border-radius: 20px 20px 0 0;
  }
  .sheet:before {
    content: '';
    position: absolute;
    top: 10px;
    left: 50%;
    width: 62px;
    height: 5px;
    border-radius: 5px;
    background: #ccc;
    transform: translateX(-50%);
  }
  .sheet h2 {
    margin: 10px 0 26px;
    font-size: 22px;
  }
  .sheet .transaction {
    padding: 12px;
  }
  .sheet .transaction i {
    width: 38px;
    height: 38px;
  }
  .sheet .transaction span b,
  .sheet .transaction strong {
    font-size: 14px;
  }
  .sheet .transaction small {
    font-size: 11px;
  }
  .day-total {
    padding: 18px;
  }
  .sheet input,
  .sheet select {
    height: 56px;
  }
  .save {
    height: 56px;
  }
}
</style>
