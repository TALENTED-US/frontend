<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getTransactionDetailApi } from '@/api/transactions'
import {
  calendarState,
  calendarTransactions,
  loadCalendar,
} from '@/features/finance/calendarStore'
import {
  addTransaction,
  deleteTransaction,
  financeState,
  financeTransactions,
  loadTransactions,
  updateTransaction,
} from '@/features/finance/financeStore'
import SimulationTimelineChart from '@/features/simulation/components/SimulationTimelineChart.vue'
import { useSimulationStore } from '@/features/simulation/stores/simulation'

const router = useRouter()
const simulation = useSimulationStore()
const useCalendarApi = import.meta.env.VITE_USE_MOCK_API !== 'true'
const formatLocalIso = (date = new Date()) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
const todayIso = formatLocalIso()
const currentMonth = todayIso.slice(0, 7)
const minimumMonth = '1980-01'
const currentYear = Number(currentMonth.slice(0, 4))
const currentMonthNumber = Number(currentMonth.slice(5, 7))
const yearOptions = Array.from({ length: currentYear - 1980 + 1 }, (_, index) => currentYear - index)
const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1)
const tab = ref('calendar')
const filter = ref('all')
const categoryFilter = ref('all')
const month = ref(currentMonth)
const selectedDate = ref(todayIso)
const panel = ref('')
const editingId = ref(null)
const selectedTransaction = ref(null)
const actionError = ref('')
const isSaving = ref(false)
const form = reactive({
  type: 'expense',
  amount: '',
  category: '식비',
  date: todayIso,
  time: '12:10',
  memo: '',
})
const money = (value) => new Intl.NumberFormat('ko-KR').format(Math.abs(value))
const signed = (value) => `${value >= 0 ? '+' : '-'}${money(value)}원`
const amountTextStyle = (text) => {
  const length = String(text).length
  const fontSize = length <= 8 ? 20 : length <= 10 ? 18 : length <= 12 ? 15 : length <= 14 ? 13 : 11
  return { fontSize: `${fontSize}px` }
}
const compactCalendarAmount = (value) => {
  const amount = Math.abs(Number(value) || 0)
  if (amount < 10000) return String(amount)

  const tenThousands = amount / 10000
  const compact = Number.isInteger(tenThousands)
    ? tenThousands
    : Number(tenThousands.toFixed(1))
  return `${compact}만`
}
const compactWon = (value) => {
  const tenThousands = Math.abs(Number(value) || 0) / 10000
  const compact = Number.isInteger(tenThousands)
    ? tenThousands
    : Number(tenThousands.toFixed(1))
  return `${compact}만원`
}
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
const periodLabel = computed(() =>
  month.value === currentMonth ? '이번 달' : `${Number(month.value.split('-')[1])}월`,
)
const selectedYear = computed({
  get: () => Number(month.value.slice(0, 4)),
  set: (year) => setSelectedMonth(year, Number(month.value.slice(5, 7))),
})
const selectedMonthNumber = computed({
  get: () => Number(month.value.slice(5, 7)),
  set: (selectedMonth) => setSelectedMonth(Number(month.value.slice(0, 4)), selectedMonth),
})
const canGoPrevious = computed(() => month.value > minimumMonth)
const canGoNext = computed(() => month.value < currentMonth)

function setSelectedMonth(year, selectedMonth) {
  const candidate = `${year}-${String(selectedMonth).padStart(2, '0')}`
  month.value = candidate < minimumMonth
    ? minimumMonth
    : candidate > currentMonth
      ? currentMonth
      : candidate
  selectedDate.value = month.value === currentMonth ? todayIso : `${month.value}-01`
  panel.value = ''
}

function changeMonth(offset) {
  const [year, mon] = month.value.split('-').map(Number)
  const next = new Date(year, mon - 1 + offset, 1)
  setSelectedMonth(next.getFullYear(), next.getMonth() + 1)
}

async function loadSelectedCalendar(force = false) {
  const [year, selectedMonth] = month.value.split('-').map(Number)
  return loadCalendar(year, selectedMonth, force)
}

async function reloadFinanceData() {
  await Promise.allSettled([loadTransactions(true), loadSelectedCalendar(true)])
}

const monthRows = computed(() =>
  (useCalendarApi ? calendarTransactions.value : financeTransactions.value)
    .filter((row) => row.date?.startsWith(month.value))
    .sort((a, b) => `${b.date}${b.time || ''}`.localeCompare(`${a.date}${a.time || ''}`)),
)
const filteredMonthRows = computed(() =>
  monthRows.value.filter(
    (row) =>
      filter.value === 'all' || (filter.value === 'income' ? row.amount > 0 : row.amount < 0),
  ),
)
const categoryOptions = computed(() => [
  'all',
  ...new Set(filteredMonthRows.value.map((row) => row.category)),
])
const visibleRows = computed(() =>
  filteredMonthRows.value.filter(
    (row) => categoryFilter.value === 'all' || row.category === categoryFilter.value,
  ),
)
watch(categoryOptions, (options) => {
  if (!options.includes(categoryFilter.value)) categoryFilter.value = 'all'
})
const income = computed(() =>
  useCalendarApi
    ? calendarState.totalIncome
    : monthRows.value.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0),
)
const expense = computed(() =>
  useCalendarApi
    ? calendarState.totalExpense
    : monthRows.value.filter((r) => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0),
)
const dayRows = computed(() =>
  filteredMonthRows.value.filter((row) => row.date === selectedDate.value),
)
const fixedTotal = computed(() =>
  monthRows.value.filter((r) => r.fixed).reduce((s, r) => s + Math.abs(r.amount), 0),
)
const categoryTotals = computed(() => {
  if (useCalendarApi) {
    return calendarState.categoryExpenses
      .map((item) => [item.category, item.amount])
      .sort((a, b) => b[1] - a[1])
  }

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
  의료: '#4db6ac',
  쇼핑: '#d29b72',
  여가: '#b07cc6',
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
    const rows = current ? filteredMonthRows.value.filter((r) => r.date === iso) : []
    const incomeTotal = rows.filter((r) => r.amount > 0).reduce((sum, row) => sum + row.amount, 0)
    const expenseTotal = rows.filter((r) => r.amount < 0).reduce((sum, row) => sum + Math.abs(row.amount), 0)
    return { date, current, iso, incomeTotal, expenseTotal }
  })
})

function openDate(iso) {
  if (!iso) return
  selectedDate.value = iso
  panel.value = 'day'
}
function openAdd() {
  actionError.value = ''
  selectedTransaction.value = null
  editingId.value = null
  Object.assign(form, {
    type: 'income',
    amount: '500000',
    category: '수입',
    date: todayIso,
    time: '09:20',
    memo: '',
  })
  panel.value = 'form'
}
async function openDetail(row) {
  selectedTransaction.value = row
  editingId.value = null
  actionError.value = ''
  panel.value = 'detail'
  const transactionId = String(row.apiId || row.id || '')
  // 현재 목록 API는 암호화 ID를 반환하지만 상세 API는 숫자 ID를 요구합니다.
  // 숫자 ID가 없을 때는 불필요한 400 요청 대신 목록 응답으로 상세를 표시합니다.
  if (!/^\d+$/.test(transactionId)) return
  try {
    const detail = await getTransactionDetailApi(transactionId)
    const [date = row.date, rawTime = row.time] = String(detail?.transactionAt || '').split('T')
    selectedTransaction.value = {
      ...row,
      date,
      time: rawTime ? rawTime.slice(0, 5) : row.time,
      title: detail?.transactionContent || row.title,
      memo: detail?.transactionMemo || row.memo,
      amount:
        detail?.transactionAmount == null
          ? row.amount
          : Math.abs(Number(detail.transactionAmount)) * (row.amount > 0 ? 1 : -1),
    }
  } catch (error) {
    // 현재 목록 API의 암호화 ID와 상세 API의 숫자 ID 규격이 달라 목록 응답을 상세에 사용합니다.
    if (error.status !== 400) actionError.value = error.message
  }
}
function openEdit(row) {
  actionError.value = ''
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
function editSelectedTransaction() {
  if (!selectedTransaction.value) return
  const transactionId = String(
    selectedTransaction.value.apiId || selectedTransaction.value.id || '',
  )
  if (!/^\d+$/.test(transactionId)) {
    actionError.value =
      '현재 서버에서 이 거래의 수정용 식별자를 제공하지 않아 수정할 수 없습니다.'
    return
  }
  openEdit(selectedTransaction.value)
}
async function save() {
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
  actionError.value = ''
  isSaving.value = true
  try {
    if (editingId.value) await updateTransaction(editingId.value, payload)
    else await addTransaction(payload)
    await loadSelectedCalendar(true).catch(() => {})
    panel.value = ''
  } catch (error) {
    actionError.value = error.message || '거래를 저장하지 못했습니다.'
  } finally {
    isSaving.value = false
  }
}
async function remove() {
  if (!editingId.value || isSaving.value) return
  actionError.value = ''
  isSaving.value = true
  try {
    await deleteTransaction(editingId.value)
    await loadSelectedCalendar(true).catch(() => {})
    panel.value = ''
  } catch (error) {
    actionError.value = error.message || '거래를 삭제하지 못했습니다.'
  } finally {
    isSaving.value = false
  }
}
function dayLabel(value) {
  if (!value) return ''
  const [, m, d] = value.split('-')
  return `${Number(m)}월 ${Number(d)}일 거래`
}
function groupLabel(date) {
  const [, m, d] = date.split('-')
  return `${Number(m)}월 ${Number(d)}일${date === todayIso ? ' (오늘)' : ''}`
}
function detailDateLabel(row) {
  if (!row?.date) return '-'
  const [year, monthNumber, day] = row.date.split('-')
  return `${year}년 ${Number(monthNumber)}월 ${Number(day)}일 ${row.time || ''}`.trim()
}

watch(month, () => {
  loadSelectedCalendar().catch(() => {})
})

onMounted(async () => {
  await Promise.allSettled([
    loadTransactions(),
    loadSelectedCalendar(),
    simulation.hydrateConfirmed(),
  ])
})
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
        <span>{{ periodLabel }} 수입</span
        ><strong class="blue" :style="amountTextStyle(signed(income))">{{ signed(income) }}</strong>
        <small>지난달 대비 +12%</small>
      </article>
      <article>
        <span>{{ periodLabel }} 지출</span
        ><strong class="red" :style="amountTextStyle(`-${money(expense)}원`)">-{{ money(expense) }}원</strong>
        <small>예상 지출 포함</small>
      </article>
      <article>
        <span>순현금흐름</span
        ><strong class="purple" :style="amountTextStyle(signed(income - expense))">{{ signed(income - expense) }}</strong>
        <small>수입 − 지출</small>
      </article>
    </div>
    <p
      v-if="(calendarState.loading && !calendarState.loaded) || (financeState.loading && !financeState.loaded)"
      class="finance-state"
    >
      재정 데이터를 불러오는 중이에요.
    </p>
    <p
      v-else-if="calendarState.error || financeState.error"
      class="finance-state finance-state--error"
    >
      {{ calendarState.error || financeState.error }}
      <button type="button" @click="reloadFinanceData">다시 시도</button>
    </p>
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
          :class="[item[0], { on: filter === item[0] }]"
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
            :class="[item[0], { on: filter === item[0] }]"
            @click="filter = item[0]"
          >
            {{ item[1] }}
          </button>
        </div>
      </div>
      <div class="month-nav">
        <button type="button" aria-label="이전 달" :disabled="!canGoPrevious" @click="changeMonth(-1)">‹</button>
        <div class="month-selectors">
          <select v-model.number="selectedYear" aria-label="연도 선택">
            <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="selectedMonthNumber" aria-label="월 선택">
            <option
              v-for="monthOption in monthOptions"
              :key="monthOption"
              :value="monthOption"
              :disabled="selectedYear === currentYear && monthOption > currentMonthNumber"
            >{{ monthOption }}월</option>
          </select>
        </div>
        <button type="button" aria-label="다음 달" :disabled="!canGoNext" @click="changeMonth(1)">›</button>
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
          <span>{{ day.date }}</span>
          <div class="calendar-amounts">
            <small v-if="day.incomeTotal" class="plus">{{ compactCalendarAmount(day.incomeTotal) }}</small>
            <small v-if="day.expenseTotal" class="minus">{{ compactCalendarAmount(day.expenseTotal) }}</small>
          </div>
        </button>
      </div>
      <div class="legend"><span>입금</span><span>지출</span></div>
    </section>

    <section v-else class="card list-card">
      <div class="list-toolbar">
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
                :class="[item[0], { on: filter === item[0] }]"
                @click="filter = item[0]"
              >
                {{ item[1] }}
              </button>
            </div>
            <span>총 {{ visibleRows.length }}건</span>
          </div>
        </div>
        <div class="list-filter">
          <select v-model="categoryFilter" aria-label="거래 분류 선택">
            <option v-for="category in categoryOptions" :key="category" :value="category">
              {{ category === 'all' ? '전체 거래' : category }}
            </option>
          </select>
        </div>
        <div class="month-nav">
          <button type="button" aria-label="이전 달" :disabled="!canGoPrevious" @click="changeMonth(-1)">‹</button>
          <div class="month-selectors">
            <select v-model.number="selectedYear" aria-label="거래 목록 연도 선택">
              <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}년</option>
            </select>
            <select v-model.number="selectedMonthNumber" aria-label="거래 목록 월 선택">
              <option
                v-for="monthOption in monthOptions"
                :key="monthOption"
                :value="monthOption"
                :disabled="selectedYear === currentYear && monthOption > currentMonthNumber"
              >{{ monthOption }}월</option>
            </select>
          </div>
          <button type="button" aria-label="다음 달" :disabled="!canGoNext" @click="changeMonth(1)">›</button>
        </div>
      </div>
      <div class="transaction-scroll">
        <template v-for="(row, index) in visibleRows" :key="row.id">
          <h3 v-if="index === 0 || visibleRows[index - 1].date !== row.date" class="date-title">
            {{ groupLabel(row.date) }}
          </h3>
          <button class="transaction" @click="openDetail(row)">
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
      <section class="card category expense-analysis-card">
        <div class="expense-analysis-total">
          <h2>지난달 소비</h2>
          <strong>{{ money(expense) }}원</strong>
        </div>
        <div class="expense-analysis-body">
          <div class="finance-category-donut" :style="{ background: donutGradient }"></div>
          <ul>
            <li
              v-for="item in categoryChartRows.slice(0, 4)"
              :key="item.name"
            >
              <i :style="{ background: item.color }" />
              <span>{{ item.name }}</span>
              <strong>
                {{ compactWon(item.total) }}
                <small>{{ Math.round((item.total / Math.max(1, expense)) * 100) }}%</small>
              </strong>
            </li>
          </ul>
        </div>
      </section>
      <section class="card fixed">
        <h2>고정지출</h2>
        <strong>{{ compactWon(fixedTotal) }}</strong>
        <p>고정지출 내역을 한 눈에 볼 수 있어요.</p>
        <p>여기를 눌러서 고정지출을 추가해보세요.</p>
        <hr />
        <button @click="router.push({ name: 'fixedExpenses' })">자세히 보기 ›</button>
      </section>
    </div>

    <section class="card timeline">
      <h2>월별 재정 타임라인</h2>
      <SimulationTimelineChart
        :assets="simulation.availableAssets"
        :monthly-expense="simulation.monthlyExpense"
        :monthly-income="simulation.monthlyIncome"
        :target-months="simulation.targetMonths"
        :current-months="simulation.currentMonths"
        :expected-months="simulation.expectedMonths"
        :monthly-projections="simulation.recentConfirmed?.monthlyProjections || []"
        :unknown="!simulation.state.confirmed"
      />
      <p class="timeline-note">
        직전 3개월 월평균 기준 · 현재 {{ simulation.currentMonths }}개월
        <template v-if="simulation.state.confirmed"> → 시나리오 {{ simulation.expectedMonths }}개월</template>
        <template v-else> · 시나리오 미설정</template>
      </p>
    </section>

    <div v-if="panel" class="overlay" @click.self="panel = ''">
      <aside class="sheet">
        <button class="close" @click="panel = ''">×</button>
        <p v-if="actionError" class="sheet-error">{{ actionError }}</p>
        <template v-if="panel === 'day'">
          <h2>{{ dayLabel(selectedDate) }}</h2>
          <div class="day-total">
            <span>{{ selectedDate === todayIso ? '오늘 합계' : '하루 합계' }}</span
            ><strong>{{ signed(dayRows.reduce((s, r) => s + r.amount, 0)) }}</strong>
          </div>
          <h3>거래 내역</h3>
          <button v-for="row in dayRows" :key="row.id" class="transaction" @click="openDetail(row)">
            <i>{{ row.title.slice(0, 1) }}</i
            ><span
              ><b>{{ row.title }}</b
              ><small>{{ row.detail }} · {{ row.time }}</small></span
            ><strong :class="{ plus: row.amount > 0 }">{{ signed(row.amount) }}</strong>
          </button>
        </template>
        <template v-else-if="panel === 'detail' && selectedTransaction">
          <h2>거래 상세</h2>
          <div class="transaction-detail__summary">
            <i>{{ selectedTransaction.title.slice(0, 1) }}</i>
            <div>
              <span>{{ selectedTransaction.amount > 0 ? '수입' : '지출' }}</span>
              <strong>{{ selectedTransaction.title }}</strong>
            </div>
            <b :class="{ plus: selectedTransaction.amount > 0 }">
              {{ signed(selectedTransaction.amount) }}
            </b>
          </div>
          <dl class="transaction-detail__list">
            <div>
              <dt>거래 일시</dt>
              <dd>{{ detailDateLabel(selectedTransaction) }}</dd>
            </div>
            <div>
              <dt>카테고리</dt>
              <dd>{{ selectedTransaction.category || '-' }}</dd>
            </div>
            <div>
              <dt>결제 수단</dt>
              <dd>{{ selectedTransaction.detail || selectedTransaction.payment || '-' }}</dd>
            </div>
            <div>
              <dt>메모</dt>
              <dd>{{ selectedTransaction.memo || '-' }}</dd>
            </div>
            <div>
              <dt>거래 구분</dt>
              <dd>{{ selectedTransaction.fixed ? '정기 거래' : '일반 거래' }}</dd>
            </div>
          </dl>
          <button class="detail-edit" type="button" @click="editSelectedTransaction">
            <strong>수정하기</strong>
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
          <button v-if="editingId" class="delete" :disabled="isSaving" @click="remove">삭제</button>
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
          <button class="save" :disabled="isSaving" @click="save">
            <strong>{{
              isSaving
                ? '저장 중...'
                : editingId
                  ? '변경사항 저장'
                  : form.type === 'income'
                    ? '수입 저장'
                    : '지출 저장'
            }}</strong>
          </button>
        </template>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.finance {
  width: 100%;
  max-width: 1066px;
  margin: 0 auto;
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
  font-size: var(--type-page-title-size);
  font-weight: var(--type-page-title-weight);
  line-height: 1.3;
}
.heading p {
  margin: 7px 0 0;
  color: var(--type-supporting-color);
  font-size: var(--type-supporting-size);
  font-weight: var(--type-supporting-weight);
}
.finance-state {
  margin: 10px 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: #f4f6fb;
  color: #566074;
  font-size: 13px;
}
.finance-state--error {
  background: #fff1f1;
  color: #d04444;
}
.finance-state button {
  margin-left: 8px;
  border: 0;
  background: transparent;
  color: inherit;
  font-weight: 800;
  text-decoration: underline;
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
  font-size: 14px !important;
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
  color: #666666;
  font-size: 14px;
  font-weight: 600;
}
.summary strong {
  max-width: 100%;
  min-width: 0;
  margin-top: 6px;
  color: #394760 !important;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  overflow: visible;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.summary small {
  display: block;
  margin-top: 7px;
  color: var(--type-supporting-color);
  font-size: var(--type-supporting-size);
  font-weight: var(--type-supporting-weight);
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
  display: grid;
  width: min(72%, 520px);
  height: 44px;
  grid-template-columns: 1fr 1fr;
  box-sizing: border-box;
  margin: 27px auto -60px;
  position: relative;
  z-index: 2;
  padding: 3px;
  border: 1px solid #e1e4ea;
  border-radius: 999px;
  background: #f2f3f6;
}
.tabs button {
  border: 0;
  border-radius: 999px;
  background: transparent;
  padding: 0;
  color: #9a9da5;
  font-size: 16px !important;
  font-weight: 700 !important;
}
.tabs .active {
  background: #fff;
  box-shadow: 0 2px 6px rgb(0 0 0 / 12%);
  color: #222;
  font-weight: 800 !important;
}
.card {
  background: #fff;
  border: 1px solid #d9dce3;
  border-radius: 18px;
  padding: 22px;
  box-shadow: 0 2px 4px #0002;
}
.calendar-card {
  min-height: 798px;
  height: auto;
  padding: 18px 28px 20px;
  box-sizing: border-box;
}
.calendar-card .card-head h2 {
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
}
.calendar-card .filters button {
  font-size: 14px !important;
}
.calendar-card .month-nav button {
  font-size: 20px !important;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
}
.card h2 {
  margin: 0;
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
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
  font-size: 14px !important;
  font-weight: 600 !important;
}
.filters .on {
  background: #0a1680;
  color: #fff;
}
.filters .on.income {
  background: #246bfd;
  color: #fff;
}
.filters .on.expense {
  background: #f0574f;
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
.month-selectors {
  display: flex;
  align-items: center;
  gap: 4px;
}
.month-selectors select {
  border: 0;
  background: transparent;
  color: #222;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  outline-offset: 2px;
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
.month-nav button:disabled {
  cursor: default;
  opacity: 0.3;
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
  font-size: 15px;
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
  font-size: 16px !important;
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
  font-size: 13px;
  font-weight: 700;
}
.legend {
  display: flex;
  gap: 28px;
  padding: 23px 8px 0;
  color: #475569;
  font-size: 14px;
  font-weight: 400;
}
.legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.legend span::before {
  content: '●';
}
.legend span:first-child::before {
  color: #246bfd;
}
.legend span:last-child::before {
  color: #f0574f;
}
.list-card {
  min-height: 798px;
  height: 798px;
  padding: 26px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}
.list-toolbar {
  display: contents;
}
.list-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}
.list-actions > span {
  color: #666;
  font-size: 13px;
  font-weight: 600;
}
.list-filter {
  margin-top: 12px;
  flex: none;
}
.list-filter select {
  border: 0;
  border-radius: 18px;
  background: #f4f6fb;
  padding: 8px 14px;
  color: #475569;
  font-size: 14px !important;
  font-weight: 600 !important;
  line-height: 16px;
  cursor: pointer;
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
  font-size: 16px;
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
  font-size: 15px;
  font-weight: 700;
  line-height: 20px;
}
.transaction small {
  color: #666;
  font-size: 13px;
  font-weight: 400;
  line-height: 17px;
}
.transaction strong {
  margin-left: auto;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 700;
  line-height: 20px;
}
.insights {
  display: grid;
  grid-template-columns: 516px minmax(0, 1fr);
  gap: 24px;
  margin-top: 22px;
}
.insights .card {
  height: 212px;
  padding: 19px 24px 16px;
  box-sizing: border-box;
}
.insights h2 {
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
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
.finance-category-donut {
  width: 92px;
  height: 92px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  position: relative;
  flex: none;
  overflow: hidden;
}
.calendar-amounts {
  display: grid;
  gap: 2px;
  justify-items: center;
  line-height: 1.2;
}
.calendar-amounts .plus {
  color: #0a1680 !important;
}
.calendar-amounts .minus {
  color: #f0574f;
}
.finance-category-donut:after {
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
  font-size: 15px;
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
  font-size: 12px;
  font-weight: 700;
}
.category-insight strong {
  color: #f97360;
  font-weight: 700;
}
.category-insight span {
  font-weight: 700;
}
.expense-analysis-card {
  min-height: 270px;
  height: auto !important;
  padding: 22px 20px !important;
}
.expense-analysis-total {
  display: grid;
  gap: 5px;
}
.expense-analysis-total h2 {
  color: #222;
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
}
.expense-analysis-total strong {
  color: #111;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.15;
}
.expense-analysis-body {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  align-items: center;
  gap: 28px;
  margin-top: 18px;
}
.expense-analysis-body .finance-category-donut {
  width: 140px;
  height: 140px;
}
.expense-analysis-body .finance-category-donut::after {
  inset: 31px;
}
.expense-analysis-body ul {
  display: grid;
  gap: 13px;
}
.expense-analysis-body li {
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr) auto;
  align-items: start;
  gap: 8px;
  padding: 0;
  color: #222;
  font-size: 14px;
  line-height: 1.3;
}
.expense-analysis-body li > i {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 2px;
}
.expense-analysis-body li > span {
  font-weight: 700;
}
.expense-analysis-body li > strong {
  display: grid;
  justify-items: end;
  color: #111;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}
.expense-analysis-body li small {
  color: #a1a5ad;
  font-size: 12px;
  font-weight: 400;
}
.fixed > strong {
  display: block;
  margin: 10px 0 9px;
  font-size: 28px;
  font-weight: 700;
}
.fixed p {
  margin: 0;
  color: #666666;
  font-size: 13px;
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
  font-size: 15px !important;
  font-weight: 700 !important;
}
.timeline {
  position: relative;
  min-height: 298px;
  height: auto;
  margin-top: 26px;
  padding: 15px 26px 30px;
  overflow: visible;
  box-sizing: border-box;
}
.timeline :deep(.timeline-chart) {
  width: 100%;
  height: auto;
  margin-top: 8px;
}
.timeline :deep(.timeline-chart__plot) {
  height: 220px;
}
.timeline :deep(.timeline-chart__plot svg) {
  width: 100%;
  height: 220px !important;
}
.timeline h2 {
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
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
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #17171766;
  box-sizing: border-box;
}
.sheet {
  position: relative;
  width: min(520px, 100%);
  max-height: calc(100vh - 48px);
  padding: 34px 28px;
  border: 1px solid #e4e7ed;
  border-radius: 20px;
  background: #fcfdff;
  overflow: auto;
  box-sizing: border-box;
  font-family: 'Pretendard', sans-serif;
  box-shadow: 0 16px 48px rgb(0 0 0 / 22%);
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
.sheet-error {
  margin: 0 32px 14px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff1f1;
  color: #d04444;
  font-size: 12px;
  line-height: 1.5;
}
.day-total {
  display: flex;
  justify-content: space-between;
  padding: 18px;
  background: #fff8d9;
  border-radius: 14px;
  margin-bottom: 24px;
}
.transaction-detail__summary {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 3px 8px #0000001f;
}
.transaction-detail__summary i {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex: none;
  border-radius: 50%;
  background: #f0f3ff;
  color: #0a1680;
  font-style: normal;
  font-weight: 700;
}
.transaction-detail__summary div {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.transaction-detail__summary div span {
  color: #777;
  font-size: 12px;
}
.transaction-detail__summary div strong {
  overflow: hidden;
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.transaction-detail__summary > b {
  margin-left: auto;
  white-space: nowrap;
  font-size: 17px;
}
.transaction-detail__summary > b.plus {
  color: #0a1680;
}
.transaction-detail__list {
  margin: 0 0 24px;
  padding: 4px 20px;
  border: 1px solid #e4e7ed;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 3px 8px #00000014;
}
.transaction-detail__list > div {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 12px;
  padding: 17px 0;
  border-bottom: 1px solid #edf0f4;
}
.transaction-detail__list > div:last-child {
  border-bottom: 0;
}
.transaction-detail__list dt,
.transaction-detail__list dd {
  margin: 0;
  font-size: 14px;
  line-height: 20px;
}
.transaction-detail__list dt {
  color: #777;
}
.transaction-detail__list dd {
  color: #222;
  font-weight: 700;
  overflow-wrap: anywhere;
}
.detail-edit {
  width: 100%;
  height: 58px;
  border: 0;
  border-radius: 14px;
  background: #ffeda7;
  font-family: 'Pretendard', sans-serif;
  font-size: 16px;
  box-shadow: 0 3px 8px #00000024;
}
.detail-edit strong {
  font-weight: 800;
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
    padding: 14px 4px 14px 12px;
    border-radius: 14px;
    box-shadow: 0 2px 4px #0002;
  }
  .summary span {
    color: #666666;
    font-size: 14px;
    font-weight: 600;
  }
  .summary strong {
    margin-top: 3px;
    color: #394760 !important;
    font-size: 20px;
    font-weight: 700;
  }
  .tabs {
    width: 100%;
    height: 52px;
    margin: 12px 0 8px;
    border-radius: 999px;
  }
  .tabs button {
    padding: 0;
    font-size: 16px !important;
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
    font-size: 14px !important;
    font-weight: 600 !important;
  }
  .mobile-toolbar .filters .on.income {
    background: #246bfd;
    color: #fff;
  }
  .mobile-toolbar .filters .on.expense {
    background: #f0574f;
    color: #fff;
  }
  .mobile-toolbar .add-btn {
    width: auto;
    height: auto;
    padding: 6px 16px;
    background: #999;
    font-size: 14px !important;
    font-weight: 600 !important;
  }
  .calendar-card {
    min-height: 530px;
    height: 530px;
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
  .month-selectors select {
    font-size: 14px;
    font-weight: 700;
  }
  .week b {
    padding: 6px 2px;
    font-size: 14px;
    font-weight: 700;
  }
  .calendar button {
    height: 67px;
    padding: 10px 2px;
    border-top: 0;
    font-size: 14px !important;
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
    font-size: 12px;
    font-weight: 700;
  }
  .legend {
    margin: 0 -8px;
    padding: 10px 12px;
    border-top: 1px solid #e5e8ee;
    font-size: 13px;
    font-weight: 400;
  }
  .list-card {
    height: 530px;
    min-height: 530px;
    padding: 8px 10px 16px;
    border-radius: 14px;
  }
  .list-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    column-gap: 8px;
  }
  .list-card .card-head h2 {
    display: none;
  }
  .list-toolbar > .card-head {
    grid-row: 1;
    grid-column: 3;
    justify-content: flex-end;
    justify-self: end;
    min-height: 30px;
  }
  .list-actions {
    width: 100%;
    justify-content: flex-end;
  }
  .list-actions .filters {
    display: none;
  }
  .list-actions > span {
    color: #666;
    font-size: 13px;
    font-weight: 600;
    line-height: 28px;
  }
  .list-filter {
    grid-row: 1;
    grid-column: 1;
    justify-self: start;
    margin-top: 0;
  }
  .list-filter select {
    padding: 6px 7px;
    font-size: 14px !important;
    font-weight: 600 !important;
  }
  .dropdown-caret {
    font-size: 10px;
    transform: translateY(-1px);
  }
  .list-card .month-nav {
    position: static;
    grid-row: 1;
    grid-column: 2;
    justify-self: center;
    margin: 0;
    padding: 0;
    border-bottom: 0;
    transform: none;
  }
  .date-title {
    font-size: 16px;
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
    font-size: 13px;
  }
  .transaction span b,
  .transaction strong {
    font-size: 15px;
    font-weight: 700;
  }
  .transaction small {
    font-size: 13px;
    font-weight: 400;
  }
  .insights {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-top: 22px;
  }
  .insights .card {
    height: auto;
    padding: 18px 16px;
    border-radius: 14px;
  }
  .insights h2 {
    font-size: var(--type-section-title-size);
    font-weight: var(--type-section-title-weight);
  }
  .category-body {
    gap: 18px;
  }
  .finance-category-donut {
    width: 92px;
    height: 92px;
  }
  .finance-category-donut:after {
    inset: 22px;
  }
  .category li {
    font-size: 14px;
    line-height: 16px;
  }
  .category-insight {
    position: static;
    margin: 14px 0 0;
    padding: 10px 12px;
    font-size: 14px;
    font-weight: 700;
  }
  .expense-analysis-card {
    min-height: 270px;
    padding: 20px 16px !important;
  }
  .expense-analysis-total strong {
    font-size: 25px;
  }
  .expense-analysis-body {
    grid-template-columns: 125px minmax(0, 1fr);
    gap: 14px;
    margin-top: 16px;
  }
  .expense-analysis-body .finance-category-donut {
    width: 125px;
    height: 125px;
  }
  .expense-analysis-body .finance-category-donut::after {
    inset: 28px;
  }
  .expense-analysis-body li {
    font-size: 13px;
  }
  .expense-analysis-body li > strong {
    font-size: 13px;
  }
  .expense-analysis-body li small {
    font-size: 11px;
  }
  .fixed > strong {
    font-size: 28px;
  }
  .fixed p {
    color: #666666;
    font-size: 13px;
    font-weight: 400;
  }
  .fixed button {
    margin-top: 18px;
    font-size: 15px !important;
    font-weight: 700 !important;
  }
  .timeline {
    min-height: 260px;
    height: auto;
    margin-top: 12px;
    padding: 15px 14px 22px;
  }
  .timeline h2 {
    font-size: var(--type-section-title-size);
    font-weight: var(--type-section-title-weight);
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
    position: static;
    display: block;
    margin-top: 8px;
    font-size: 9px;
  }
  .timeline :deep(.timeline-chart__plot),
  .timeline :deep(.timeline-chart__plot svg) {
    height: 175px !important;
  }
  .sheet {
    width: min(100%, 440px);
    max-height: calc(100vh - 32px);
    padding: 34px 22px 24px;
    border-radius: 20px;
  }
  .overlay {
    padding: 16px;
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
