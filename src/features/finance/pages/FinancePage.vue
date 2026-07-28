<script setup>
import { computed, ref } from 'vue'
import { transactions as seed } from '@/data/mockData'

const money = new Intl.NumberFormat('ko-KR')
const activeTab = ref('캘린더')
const filter = ref('전체')
const showForm = ref(false)
const formMode = ref('지출')
const selectedDate = ref(null)
const showFixedDetail = ref(false)
const fixedTab = ref('고정')
const editingId = ref(null)
const transactions = ref([...seed])
const form = ref({ title: '', category: '식비', amount: '', date: '2026-07-16', memo: '' })
const categories = ['전체', '수입', '지출', '저축', '이체']
const dailyRows = ref([
  { id: 101, title: '급여', detail: '카카오뱅크 · 09:20', amount: 500000, category: '급여' },
  { id: 102, title: '점심 식사', detail: '카드 · 식비 · 12:10', amount: -12000, category: '식비' },
  { id: 103, title: '커피', detail: '카드 · 식비 · 15:30', amount: -8000, category: '식비' },
  { id: 104, title: '교통카드', detail: '대중교통 · 18:10', amount: -30000, category: '교통' },
])
const fixedExpenses = ref([
  { id: 1, title: '월세', detail: '매월 1일 · 주거', amount: 550000 },
  { id: 2, title: '넷플릭스', detail: '매월 8일 · 구독', amount: 17000 },
  { id: 3, title: '교통카드', detail: '매월 10일 · 교통', amount: 65000 },
])

const visibleTransactions = computed(() => {
  if (filter.value === '전체') return transactions.value
  if (filter.value === '수입') return transactions.value.filter((item) => item.amount > 0)
  return transactions.value.filter((item) => item.amount < 0)
})

function addTransaction() {
  if (!form.value.title || !form.value.amount) return
  const amount = Math.abs(Number(form.value.amount)) * (formMode.value === '수입' ? 1 : -1)
  if (editingId.value) {
    const row = dailyRows.value.find((item) => item.id === editingId.value)
    if (row) Object.assign(row, { title: form.value.title, category: form.value.category, amount })
  } else {
    transactions.value.unshift({ id: Date.now(), date: form.value.date, title: form.value.title, category: form.value.category, amount })
  }
  form.value = { title: '', category: formMode.value === '수입' ? '급여' : '식비', amount: '', date: '2026-07-16', memo: '' }
  editingId.value = null
  showForm.value = false
}

function openAdd(mode = '지출') {
  formMode.value = mode
  editingId.value = null
  form.value = { title: mode === '수입' ? '급여' : '점심 식사', category: mode === '수입' ? '급여' : '식비', amount: mode === '수입' ? 500000 : 80000, date: '2026-07-16', memo: '' }
  showForm.value = true
}

function editDaily(row) {
  formMode.value = row.amount > 0 ? '수입' : '지출'
  editingId.value = row.id
  form.value = { title: row.title, category: row.category, amount: Math.abs(row.amount), date: '2026-07-01', memo: '' }
  showForm.value = true
}

function removeFixed(id) {
  fixedExpenses.value = fixedExpenses.value.filter((row) => row.id !== id)
}
</script>

<template>
  <section class="page finance-page">
    <header class="page-heading desktop-only">
      <div><h1 class="page-title">내 재정</h1><p class="page-description">이번 달의 수입·지출과 거래 흐름을 확인하세요.</p></div>
    </header>

    <div class="finance-summary desktop-only">
      <article><span>총 자산</span><strong>300만원</strong><small>연결 계좌 기준</small></article>
      <article><span>이번 달 수입</span><strong>+50만원</strong><small>지난달 대비 +12%</small></article>
      <article><span>이번 달 지출</span><strong>-80만원</strong><small>예상 지출 포함</small></article>
      <article><span>순현금흐름</span><strong>-30만원</strong><small>수입 - 지출</small></article>
    </div>

    <div class="finance-tabs">
      <button v-for="tab in ['캘린더', '거래 목록']" :key="tab" :class="{ active: activeTab === tab }" @click="activeTab = tab">
        {{ tab }}
      </button>
    </div>

    <template v-if="activeTab === '캘린더'">
      <div class="finance-main">
        <article class="calendar-card card">
          <div class="calendar-head">
            <h2><span>▣</span> 월별 캘린더</h2>
            <div class="calendar-filters desktop-only">
              <button v-for="item in categories" :key="item" :class="{ active: filter === item }" @click="filter = item">{{ item }}</button>
            </div>
          </div>
          <div class="calendar-month"><button>‹</button><strong>2026년 7월</strong><button>›</button></div>
          <div class="calendar-grid">
            <strong v-for="day in ['일', '월', '화', '수', '목', '금', '토']" :key="day">{{ day }}</strong>
            <button v-for="date in 35" :key="date" :class="{ today: date === 18, muted: date < 3 || date > 33 }" @click="selectedDate = date < 3 ? date + 28 : date > 33 ? date - 33 : date - 2">
              <span>{{ date < 3 ? date + 28 : date > 33 ? date - 33 : date - 2 }}</span>
              <small v-if="[4, 5, 6, 8, 10, 15, 23, 26, 30].includes(date)" :class="{ income: [8, 15].includes(date) }">
                {{ [8, 15].includes(date) ? '+' : '-' }}{{ date === 8 ? '50만' : `${date}만` }}
              </small>
            </button>
          </div>
          <div class="calendar-legend"><span>● 확정 입금</span><span>● 확정 지출</span><span>● 출금 예정</span></div>
        </article>

        <article class="transaction-card card">
          <div class="transaction-card__head">
            <h2>▥ 주요 거래 리스트</h2>
            <div>
              <button v-for="item in categories" :key="item" :class="{ active: filter === item }" @click="filter = item">{{ item }}</button>
            </div>
          </div>
          <div class="transaction-list">
            <div v-for="item in visibleTransactions" :key="item.id" class="transaction-row">
              <span><small>{{ item.date.replace('2026-', '').replace('-', '월 ') }}일</small><strong>{{ item.title }}</strong></span>
              <b :class="{ income: item.amount > 0 }">{{ item.amount > 0 ? '+' : '-' }}{{ money.format(Math.abs(item.amount)) }}원</b>
            </div>
          </div>
          <button class="add-transaction desktop-only" @click="openAdd('지출')">+ 거래 추가</button>
        </article>
      </div>

      <div class="finance-insights">
        <article class="category-chart card">
          <h2>카테고리별 지출</h2>
          <div class="category-chart__body">
            <div class="donut" />
            <ul>
              <li><span>● 주거</span><b>50만원</b></li>
              <li><span>● 식비</span><b>12만원</b></li>
              <li><span>● 교통</span><b>6.5만원</b></li>
              <li><span>● 공과금</span><b>4만원</b></li>
              <li><span>● 통신비</span><b>3.5만원</b></li>
            </ul>
          </div>
          <p><b>인사이트</b> 식비가 지난달보다 38,000원 늘었어요.</p>
        </article>
        <article class="fixed-card card">
          <h2>고정지출</h2><strong>63.2만원</strong>
          <div class="fixed-bar"><span /></div>
          <p>고정지출 내역을 한 번에 볼 수 있어요.<br />여기를 눌러 고정지출을 추가해보세요.</p>
          <button class="fixed-detail-button" @click="showFixedDetail = true">자세히 보기 ›</button>
        </article>
      </div>

      <article class="timeline-chart card">
        <h2>월별 재정 타임라인</h2>
        <div class="timeline-legend"><span>● 현재 기준</span><span>● 시나리오 적용</span><span>● 비상금 50만원</span></div>
        <svg viewBox="0 0 720 190" preserveAspectRatio="none" aria-label="월별 자산 변화 그래프">
          <path class="grid" d="M35 30H700M35 80H700M35 130H700" />
          <path class="base" d="M35 20 210 162" /><path class="scenario" d="M35 20 300 100 455 162" />
          <path class="emergency" d="M35 132H700" /><path class="goal" d="M350 10V170" />
        </svg>
      </article>
    </template>

    <article v-else class="transaction-page card">
      <div class="transaction-page__head">
        <h2>거래 목록</h2><button class="btn btn-primary" @click="openAdd('지출')">+ 거래 추가</button>
      </div>
      <div class="filter-chips">
        <button v-for="item in categories" :key="item" :class="{ active: filter === item }" @click="filter = item">{{ item }}</button>
      </div>
      <div v-for="item in visibleTransactions" :key="item.id" class="transaction-row transaction-row--large">
        <span><small>{{ item.date }}</small><strong>{{ item.title }}</strong><em>{{ item.category }}</em></span>
        <b :class="{ income: item.amount > 0 }">{{ item.amount > 0 ? '+' : '-' }}{{ money.format(Math.abs(item.amount)) }}원</b>
      </div>
    </article>

    <button class="mobile-add mobile-only" aria-label="거래 추가" @click="openAdd('지출')">＋</button>

    <div v-if="showForm" class="modal-backdrop" @click.self="showForm = false">
      <form class="transaction-modal card" @submit.prevent="addTransaction">
        <i class="modal-handle" />
        <div><h2>{{ editingId ? '거래 수정' : `${formMode} 추가` }}</h2><button type="button" @click="showForm = false">×</button></div>
        <div class="income-expense-tabs"><button type="button" :class="{ active: formMode === '수입' }" @click="formMode = '수입'; form.category = '급여'">수입</button><button type="button" :class="{ active: formMode === '지출' }" @click="formMode = '지출'; form.category = '식비'">지출</button></div>
        <label><span class="field-label">금액</span><span class="amount-field"><input v-model="form.amount" type="number" /><b>원</b></span></label>
        <label><span class="field-label">카테고리</span><select v-model="form.category" class="field"><option v-if="formMode === '수입'">급여</option><option v-if="formMode === '수입'">부수입</option><option v-if="formMode === '지출'">식비</option><option v-if="formMode === '지출'">교통</option><option v-if="formMode === '지출'">구독</option><option v-if="formMode === '지출'">교육</option></select></label>
        <label><span class="field-label">거래일</span><span class="date-memo"><input v-model="form.date" class="field" type="date" /><input v-model="form.title" class="field" placeholder="메모 (선택)" /></span></label>
        <button class="modal-save" type="submit">{{ editingId ? '수정 저장' : `${formMode} 저장` }}</button>
      </form>
    </div>

    <div v-if="selectedDate" class="modal-backdrop modal-backdrop--sheet" @click.self="selectedDate = null">
      <article class="daily-modal card">
        <i class="modal-handle" /><header><h2>7월 {{ selectedDate }}일 거래</h2><button @click="selectedDate = null">×</button></header>
        <div class="daily-total"><span>오늘 합계</span><strong>+450,000원</strong></div>
        <div class="daily-summary"><article><span>수입</span><strong>+500,000원</strong></article><article><span>지출</span><strong>-50,000원</strong></article></div>
        <h3>거래 내역</h3>
        <div v-for="row in dailyRows" :key="row.id" class="daily-row">
          <i>{{ row.title.slice(0, 1) }}</i><span><strong>{{ row.title }}</strong><small>{{ row.detail }}</small></span><b :class="{ income: row.amount > 0 }">{{ row.amount > 0 ? '+' : '-' }}{{ money.format(Math.abs(row.amount)) }}원</b><button @click="editDaily(row)">수정</button>
        </div>
      </article>
    </div>

    <div v-if="showFixedDetail" class="modal-backdrop" @click.self="showFixedDetail = false">
      <article class="fixed-detail-modal card">
        <header><h2>지출 상세</h2><button @click="showFixedDetail = false">×</button></header>
        <div class="fixed-tabs"><button :class="{ active: fixedTab === '고정' }" @click="fixedTab = '고정'">고정 지출 63.2만원</button><button :class="{ active: fixedTab === '변동' }" @click="fixedTab = '변동'">변동 지출 16.8만원</button></div>
        <section><h3>{{ fixedTab }} 지출</h3>
          <div v-for="item in fixedExpenses" :key="item.id" class="fixed-row"><span><strong>{{ item.title }}</strong><small>{{ item.detail }}</small></span><b>-{{ money.format(item.amount) }}원</b><button @click="editDaily({ ...item, category: item.title })">수정</button><button class="delete" @click="removeFixed(item.id)">삭제</button></div>
          <footer><span>월 {{ fixedTab }}지출 합계</span><strong>{{ fixedTab === '고정' ? '632,000' : '168,000' }}원</strong></footer>
        </section>
      </article>
    </div>
  </section>
</template>

<style scoped>
.finance-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 12px; }
.finance-summary article { display: grid; gap: 3px; padding: 16px; border-radius: 11px; background: #e8eeff; }
.finance-summary article:nth-child(2) { background: #e8eaf3; }
.finance-summary article:nth-child(3) { background: #fdebed; }
.finance-summary article:nth-child(4) { background: #f1eff9; }
.finance-summary span, .finance-summary small { color: #646464; font-size: 10px; }
.finance-summary strong { color: var(--primary); font-size: 18px; }

.finance-tabs { display: flex; width: fit-content; margin: 0 0 12px; border-radius: 10px; background: #f4f5fa; }
.finance-tabs button { min-width: 130px; padding: 10px 20px; border-radius: 10px; color: #555; font-size: 11px; }
.finance-tabs button.active { background: var(--sky); color: white; font-weight: 800; }

.finance-main { display: grid; grid-template-columns: 1.55fr 1fr; gap: 18px; }
.calendar-card, .transaction-card { padding: 18px; }
.calendar-head, .transaction-card__head, .transaction-page__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.calendar-head h2, .transaction-card h2, .timeline-chart h2, .finance-insights h2, .transaction-page h2 { font-size: 14px; }
.calendar-filters, .transaction-card__head > div, .filter-chips { display: flex; gap: 5px; }
.calendar-filters button, .transaction-card__head button, .filter-chips button { padding: 6px 11px; border: 1px solid var(--border); border-radius: 999px; color: #777; font-size: 9px; }
.calendar-filters button.active, .transaction-card__head button.active, .filter-chips button.active { border-color: var(--primary); background: var(--primary); color: white; }
.calendar-month { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 16px 0 8px; color: #333; font-size: 11px; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
.calendar-grid > strong { padding: 7px; color: var(--primary); text-align: center; font-size: 9px; }
.calendar-grid > strong:first-child { color: var(--danger); }
.calendar-grid button { display: grid; min-height: 50px; align-content: start; gap: 4px; padding: 7px; border: 1px solid #e7e7e7; border-radius: 6px; color: var(--primary); text-align: left; font-size: 9px; }
.calendar-grid button.today span { display: grid; width: 19px; height: 19px; place-items: center; border-radius: 50%; background: var(--sky); color: white; }
.calendar-grid button.muted { color: #aaa; }
.calendar-grid small { padding: 2px 4px; border-radius: 4px; background: #fff0f1; color: var(--danger); text-align: center; font-size: 7px; }
.calendar-grid small.income { background: #eafaf4; color: #27aa7a; }
.calendar-legend { display: flex; justify-content: center; gap: 12px; margin-top: 12px; color: #777; font-size: 8px; }
.calendar-legend span:nth-child(1) { color: var(--primary); }
.calendar-legend span:nth-child(2) { color: var(--danger); }

.transaction-list { max-height: 330px; overflow: auto; margin-top: 13px; }
.transaction-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 5px; border-bottom: 1px solid #e7e7e7; }
.transaction-row > span { display: grid; gap: 2px; }
.transaction-row small { color: #777; font-size: 8px; }
.transaction-row strong { font-size: 10px; }
.transaction-row b { color: var(--danger); font-size: 10px; }
.transaction-row b.income { color: #31be8d; }
.add-transaction { width: 100%; margin-top: 13px; padding: 10px; border-radius: 8px; background: var(--accent); color: var(--primary); font-size: 10px; font-weight: 800; }

.finance-insights { display: grid; grid-template-columns: 1fr 1.12fr; gap: 18px; margin-top: 18px; }
.finance-insights article, .timeline-chart { padding: 18px; }
.category-chart__body { display: grid; grid-template-columns: 100px 1fr; align-items: center; gap: 20px; }
.donut { width: 82px; height: 82px; margin: 10px auto; border-radius: 50%; background: conic-gradient(#ffe595 0 48%, #8eb1ff 48% 68%, #f5a4a9 68% 80%, #7379a8 80% 90%, #26356f 90%); -webkit-mask: radial-gradient(circle, transparent 42%, #000 44%); mask: radial-gradient(circle, transparent 42%, #000 44%); }
.category-chart ul { display: grid; gap: 5px; font-size: 9px; }
.category-chart li { display: flex; justify-content: space-between; }
.category-chart li span { color: #777; }
.category-chart li b { color: var(--primary); }
.category-chart > p { padding: 6px 9px; border-radius: 5px; background: #fff0f1; color: #777; font-size: 8px; }
.category-chart > p b { margin-right: 7px; color: var(--danger); }
.fixed-card { position: relative; }
.fixed-card > strong { display: block; margin-top: 14px; color: var(--primary); font-size: 24px; }
.fixed-card p { margin-top: 10px; color: #777; font-size: 9px; }
.fixed-detail-button { position: absolute; right: 18px; bottom: 18px; color: var(--primary); font-size: 9px; font-weight: 700; }
.fixed-bar { height: 8px; margin-top: 10px; overflow: hidden; border-radius: 999px; background: #ffeda6; }
.fixed-bar span { display: block; width: 79%; height: 100%; border-radius: inherit; background: var(--primary); }
.timeline-chart { margin-top: 18px; }
.timeline-legend { display: flex; gap: 12px; margin-top: 6px; color: #777; font-size: 8px; }
.timeline-chart svg { width: 100%; height: 150px; margin-top: 5px; }
.timeline-chart path { fill: none; }
.timeline-chart .grid { stroke: #e7e7e7; stroke-width: 1; }
.timeline-chart .base { stroke: var(--primary); stroke-width: 3; stroke-dasharray: 8 6; }
.timeline-chart .scenario { stroke: #37be87; stroke-width: 3; }
.timeline-chart .emergency { stroke: #b6e764; stroke-width: 2; stroke-dasharray: 5 5; }
.timeline-chart .goal { stroke: #f0b43b; stroke-width: 2; }

.transaction-page { padding: 22px; }
.filter-chips { margin: 16px 0 8px; overflow-x: auto; }
.transaction-row--large { padding: 16px 5px; }
.transaction-row em { color: #777; font-size: 8px; font-style: normal; }

.modal-backdrop { position: fixed; z-index: 80; inset: 0; display: grid; place-items: center; padding: 18px; background: rgb(4 15 102 / 45%); }
.transaction-modal { display: grid; gap: 15px; width: min(100%, 390px); padding: 24px; box-shadow: var(--shadow-md); }
.transaction-modal > div { display: flex; justify-content: space-between; }
.transaction-modal h2 { color: var(--primary); font-size: 18px; }
.modal-handle { display: block; width: 72px; height: 4px; margin: -12px auto 2px; border-radius: 999px; background: #9ba4b4; }
.income-expense-tabs { display: grid !important; grid-template-columns: 1fr 1fr; }
.income-expense-tabs button { min-height: 38px; border: 1px solid var(--border); border-radius: 9px; color: #777; font-size: 10px; }
.income-expense-tabs button.active:first-child { border-color: transparent; background: #e5f8f2; color: var(--success); font-weight: 800; }
.income-expense-tabs button.active:last-child { border-color: transparent; background: #fdebed; color: var(--danger); font-weight: 800; }
.amount-field { display: flex; height: 46px; align-items: center; padding: 0 15px; border-radius: 9px; background: #fff9df; }
.amount-field input { min-width: 0; flex: 1; color: var(--primary); font-size: 18px; font-weight: 800; }
.amount-field b { color: #777; font-size: 9px; }
.date-memo { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.modal-save { width: 100%; min-height: 42px; border-radius: 9px; background: var(--accent); font-size: 11px; font-weight: 800; }
.daily-modal { width: min(100%, 430px); padding: 24px; box-shadow: var(--shadow-md); }
.daily-modal > header, .fixed-detail-modal > header { display: flex; align-items: center; justify-content: space-between; }
.daily-modal h2, .fixed-detail-modal h2 { color: var(--primary); font-size: 18px; }
.daily-modal header button, .fixed-detail-modal header button { color: #666; font-size: 22px; }
.daily-total { display: flex; justify-content: space-between; margin-top: 20px; padding: 13px; border-radius: 9px; background: #fff9df; font-size: 9px; }
.daily-total strong { color: var(--primary); font-size: 12px; }
.daily-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
.daily-summary article { display: grid; gap: 5px; padding: 13px; border-radius: 9px; background: #eaf9f5; color: var(--primary); }
.daily-summary article:last-child { background: #fdebed; color: var(--danger); }
.daily-summary span { color: #777; font-size: 8px; }
.daily-summary strong { font-size: 13px; }
.daily-modal h3 { margin: 19px 0 10px; color: var(--primary); font-size: 11px; }
.daily-row { display: grid; grid-template-columns: 28px 1fr auto 42px; align-items: center; gap: 9px; min-height: 56px; margin-top: 8px; padding: 9px 11px; border: 1px solid var(--border); border-radius: 9px; }
.daily-row > i { display: grid; width: 26px; height: 26px; place-items: center; border-radius: 7px; background: #fdebed; color: var(--danger); font-size: 8px; font-style: normal; }
.daily-row > span { display: grid; gap: 3px; }
.daily-row strong { color: var(--primary); font-size: 10px; }
.daily-row small { color: #777; font-size: 7px; }
.daily-row > b { color: var(--danger); font-size: 9px; }
.daily-row > b.income { color: var(--primary); }
.daily-row > button { padding: 5px; border: 1px solid var(--border); border-radius: 6px; font-size: 8px; }
.fixed-detail-modal { width: min(100%, 500px); padding: 26px; box-shadow: var(--shadow-md); }
.fixed-tabs { display: grid; grid-template-columns: 1fr 1fr; margin-top: 17px; }
.fixed-tabs button { min-height: 38px; border: 1px solid var(--border); border-radius: 9px; font-size: 10px; }
.fixed-tabs button.active { border-color: var(--sky); background: var(--sky); color: var(--primary); font-weight: 800; }
.fixed-detail-modal > section { margin-top: 15px; padding: 16px; border: 1px solid var(--border); border-radius: 11px; }
.fixed-detail-modal h3 { margin-bottom: 4px; font-size: 12px; }
.fixed-row { display: grid; grid-template-columns: 1fr auto auto auto; align-items: center; gap: 9px; padding: 12px 0; border-bottom: 1px solid var(--border); }
.fixed-row > span { display: grid; gap: 3px; }
.fixed-row strong { font-size: 11px; }
.fixed-row small { color: #777; font-size: 8px; }
.fixed-row > b { color: var(--danger); font-size: 9px; }
.fixed-row button { font-size: 8px; }
.fixed-row .delete { color: var(--danger); }
.fixed-detail-modal footer { display: flex; justify-content: space-between; margin-top: 15px; color: #777; font-size: 9px; }
.fixed-detail-modal footer strong { color: var(--primary); font-size: 12px; }
.mobile-add { position: fixed; z-index: 20; right: 20px; bottom: 82px; width: 46px; height: 46px; border-radius: 50%; background: var(--primary); color: white; box-shadow: var(--shadow-md); font-size: 22px; }

@media (max-width: 767px) {
  .finance-tabs { display: grid; grid-template-columns: 1fr 1fr; width: 100%; margin: 0 0 10px; }
  .finance-tabs button { min-width: 0; padding: 9px; }
  .finance-main, .finance-insights { grid-template-columns: 1fr; gap: 10px; }
  .calendar-card { padding: 12px; box-shadow: var(--shadow-sm); }
  .calendar-head { display: none; }
  .calendar-month { margin-top: 0; }
  .calendar-grid button { min-height: 43px; padding: 4px; border-color: transparent; }
  .calendar-grid > strong { padding: 5px; }
  .calendar-legend { justify-content: flex-start; border-top: 1px solid #eee; padding-top: 8px; }
  .transaction-card { display: none; }
  .finance-insights { margin-top: 10px; }
  .finance-insights article, .timeline-chart { padding: 13px; box-shadow: var(--shadow-sm); }
  .category-chart__body { grid-template-columns: 105px 1fr; }
  .timeline-chart { margin-top: 10px; }
  .timeline-chart svg { height: 135px; }
  .transaction-page { padding: 14px; }
  .transaction-page__head .btn { min-height: 34px; padding: 0 12px; font-size: 10px; }
  .modal-backdrop--sheet { align-items: end; padding: 0; }
  .daily-modal { width: 100%; min-height: 76dvh; padding: 24px 20px; border-radius: 20px 20px 0 0; }
  .transaction-modal { width: 100%; max-width: 390px; border-radius: 20px; }
  .fixed-detail-modal { width: 100%; padding: 22px 17px; }
  .date-memo { grid-template-columns: 1fr; }
}
</style>
