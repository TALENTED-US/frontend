<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getTransactionDetailApi } from '@/api/transactions'
import { calendarState, calendarTransactions, loadCalendar } from '@/features/finance/calendarStore'
import {
  addTransaction,
  deleteTransaction,
  financeState,
  financeTransactions,
  loadTransactions,
  updateTransaction,
} from '@/features/finance/financeStore'
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
const yearOptions = Array.from(
  { length: currentYear - 1980 + 1 },
  (_, index) => currentYear - index,
)
const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1)

const month = ref(currentMonth)
const selectedDate = ref(todayIso)
const selectedDayActive = ref(false)
const calendarOpen = ref(false)
const listExpanded = ref(false)
const filter = ref('all')
const categoryFilter = ref('all')
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

const money = (value) => new Intl.NumberFormat('ko-KR').format(Math.abs(Number(value) || 0))
const signed = (value) => `${Number(value) >= 0 ? '+' : '-'}${money(value)}원`
const timelineMonths = (value) => {
  const months = Math.max(0, Number(value) || 0)
  return `${Number.isInteger(months) ? months : Number(months.toFixed(1))}개월`
}

const financeTimelineItems = computed(() => [
  { id: 'now', label: '현재', value: '지금', tone: 'current' },
  {
    id: 'current-limit',
    label: '현재 자금 기준',
    value: timelineMonths(simulation.currentMonths),
    tone: 'limit',
  },
  {
    id: 'scenario',
    label: '계획 적용 후',
    value: timelineMonths(simulation.expectedMonths),
    tone: 'scenario',
  },
])

const compactCalendarAmount = (value) => {
  const amount = Math.abs(Number(value) || 0)
  if (amount < 10000) return money(amount)
  const tenThousands = amount / 10000
  return `${Number.isInteger(tenThousands) ? tenThousands : Number(tenThousands.toFixed(1))}만`
}

const compactWon = (value) => {
  const amount = Math.abs(Number(value) || 0)
  if (amount < 10000) return `${money(amount)}원`
  const tenThousands = amount / 10000
  return `${Number.isInteger(tenThousands) ? tenThousands : Number(tenThousands.toFixed(1))}만원`
}

const formattedAmount = computed({
  get: () => (form.amount ? money(form.amount) : ''),
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

const selectedYear = computed({
  get: () => Number(month.value.slice(0, 4)),
  set: (year) => setSelectedMonth(year, Number(month.value.slice(5, 7))),
})

const selectedMonthNumber = computed({
  get: () => Number(month.value.slice(5, 7)),
  set: (selectedMonth) => setSelectedMonth(Number(month.value.slice(0, 4)), selectedMonth),
})

const monthLabel = computed(() => `${selectedYear.value}년 ${selectedMonthNumber.value}월`)
const canGoPrevious = computed(() => month.value > minimumMonth)
const canGoNext = computed(() => month.value < currentMonth)

function setSelectedMonth(year, selectedMonth) {
  const candidate = `${year}-${String(selectedMonth).padStart(2, '0')}`
  month.value =
    candidate < minimumMonth ? minimumMonth : candidate > currentMonth ? currentMonth : candidate
  selectedDate.value = month.value === currentMonth ? todayIso : `${month.value}-01`
  selectedDayActive.value = false
}

function changeMonth(offset) {
  const [year, selectedMonth] = month.value.split('-').map(Number)
  const next = new Date(year, selectedMonth - 1 + offset, 1)
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
  ...new Set(monthRows.value.map((row) => row.category).filter(Boolean)),
])

const quickCategories = computed(() =>
  [
    ...new Set(
      monthRows.value
        .filter((row) => row.amount < 0)
        .map((row) => row.category)
        .filter(Boolean),
    ),
  ].slice(0, 6),
)

const visibleRows = computed(() =>
  filteredMonthRows.value.filter(
    (row) => categoryFilter.value === 'all' || row.category === categoryFilter.value,
  ),
)

const displayedRows = computed(() =>
  selectedDayActive.value
    ? monthRows.value.filter((row) => row.date === selectedDate.value)
    : visibleRows.value,
)
const listPreviewLimit = window.matchMedia('(max-width: 767px)').matches ? 4 : 6
const renderedRows = computed(() =>
  selectedDayActive.value || listExpanded.value
    ? displayedRows.value
    : displayedRows.value.slice(0, listPreviewLimit),
)
const hiddenRowCount = computed(() =>
  Math.max(0, displayedRows.value.length - renderedRows.value.length),
)

const income = computed(() =>
  useCalendarApi
    ? calendarState.totalIncome
    : monthRows.value.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0),
)

const normalizeAnalysisCategory = (category) => (category === '월세' ? '주거' : category || '기타')
const isHousingRow = (row) =>
  ['월세', '주거'].includes(row?.category) ||
  /월세|임대료|관리비|공과금/.test(`${row?.title || ''} ${row?.memo || ''}`)
const housingTransactionTotal = computed(() =>
  monthRows.value
    .filter((row) => row.amount < 0 && isHousingRow(row))
    .reduce((sum, row) => sum + Math.abs(row.amount), 0),
)
const reportedHousingTotal = computed(() =>
  calendarState.categoryExpenses
    .filter((item) => normalizeAnalysisCategory(item.category) === '주거')
    .reduce((sum, item) => sum + Math.abs(Number(item.amount) || 0), 0),
)
const housingExpenseSupplement = computed(() =>
  useCalendarApi ? Math.max(0, housingTransactionTotal.value - reportedHousingTotal.value) : 0,
)

const expense = computed(() =>
  useCalendarApi
    ? calendarState.totalExpense + housingExpenseSupplement.value
    : monthRows.value
        .filter((row) => row.amount < 0)
        .reduce((sum, row) => sum + Math.abs(row.amount), 0),
)

const netCashFlow = computed(() => income.value - expense.value)
const fixedTotal = computed(() =>
  monthRows.value
    .filter((row) => row.amount < 0 && (row.fixed || isHousingRow(row)))
    .reduce((sum, row) => sum + Math.abs(row.amount), 0),
)

const categoryTotals = computed(() => {
  if (useCalendarApi && calendarState.categoryExpenses.length) {
    const totals = {}
    calendarState.categoryExpenses.forEach((item) => {
      const category = normalizeAnalysisCategory(item.category)
      totals[category] = (totals[category] || 0) + Math.abs(Number(item.amount) || 0)
    })
    if (housingExpenseSupplement.value) {
      totals.주거 = (totals.주거 || 0) + housingExpenseSupplement.value
    }
    return Object.entries(totals).sort((a, b) => b[1] - a[1])
  }

  const totals = {}
  monthRows.value
    .filter((row) => row.amount < 0)
    .forEach((row) => {
      const category = normalizeAnalysisCategory(row.category)
      totals[category] = (totals[category] || 0) + Math.abs(row.amount)
    })
  return Object.entries(totals).sort((a, b) => b[1] - a[1])
})

const categoryColors = ['#0a1680', '#93b2f8', '#f1b94c', '#ff8f87', '#8d78cc', '#5eb9a8']
const categoryChartRows = computed(() =>
  categoryTotals.value.map(([name, total], index) => ({
    name,
    total,
    color: categoryColors[index % categoryColors.length],
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
  const [year, selectedMonth] = month.value.split('-').map(Number)
  const first = new Date(year, selectedMonth - 1, 1).getDay()
  const count = new Date(year, selectedMonth, 0).getDate()
  const previousMonthCount = new Date(year, selectedMonth - 1, 0).getDate()
  const totalCells = first + count > 35 ? 42 : 35

  return Array.from({ length: totalCells }, (_, index) => {
    const raw = index - first + 1
    const current = raw >= 1 && raw <= count
    const date = raw < 1 ? previousMonthCount + raw : raw > count ? raw - count : raw
    const iso = current ? `${month.value}-${String(date).padStart(2, '0')}` : ''
    const rows = current ? monthRows.value.filter((row) => row.date === iso) : []
    const incomeTotal = rows
      .filter((row) => row.amount > 0)
      .reduce((sum, row) => sum + row.amount, 0)
    const expenseTotal = rows
      .filter((row) => row.amount < 0)
      .reduce((sum, row) => sum + Math.abs(row.amount), 0)
    return { date, current, iso, incomeTotal, expenseTotal }
  })
})

const selectedDayNet = computed(() => displayedRows.value.reduce((sum, row) => sum + row.amount, 0))

function applyQuickFilter(nextFilter, nextCategory = 'all') {
  filter.value = nextFilter
  categoryFilter.value = nextCategory
  selectedDayActive.value = false
  listExpanded.value = false
}

function openDate(iso) {
  if (!iso) return
  selectedDate.value = iso
  selectedDayActive.value = true
  listExpanded.value = false
}

function clearSelectedDate() {
  selectedDayActive.value = false
  listExpanded.value = false
}

function setLedgerView(view) {
  calendarOpen.value = view === 'calendar'
  selectedDayActive.value = false
  listExpanded.value = false
}

function categoryIcon(category, amount) {
  if (amount > 0) return '💰'
  return (
    {
      식비: '🍚',
      월세: '🏠',
      주거: '🏠',
      교통: '🚌',
      구독: '🎬',
      보험: '🛡️',
      교육: '📚',
      쇼핑: '🛍️',
      의료: '💊',
      여가: '🎮',
      통신비: '📱',
    }[category] || '✨'
  )
}

function groupLabel(date) {
  const [, monthNumber, day] = date.split('-')
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(
    new Date(`${date}T12:00:00`),
  )
  return `${Number(monthNumber)}월 ${Number(day)}일 ${weekday}`
}

function selectedDateLabel(value) {
  const [, monthNumber, day] = value.split('-')
  return `${Number(monthNumber)}월 ${Number(day)}일`
}

function detailDateLabel(row) {
  if (!row?.date) return '-'
  const [year, monthNumber, day] = row.date.split('-')
  return `${year}년 ${Number(monthNumber)}월 ${Number(day)}일 ${row.time || ''}`.trim()
}

function openAdd() {
  actionError.value = ''
  selectedTransaction.value = null
  editingId.value = null
  Object.assign(form, {
    type: 'expense',
    amount: '',
    category: '식비',
    date: selectedDayActive.value ? selectedDate.value : todayIso,
    time: '12:10',
    memo: '',
  })
  panel.value = 'form'
}

function setFormType(type) {
  form.type = type
  form.category = type === 'income' ? '수입' : '식비'
}

async function openDetail(row) {
  selectedTransaction.value = row
  editingId.value = null
  actionError.value = ''
  panel.value = 'detail'
  const transactionId = String(row.apiId || row.id || '')
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
    if (error.status !== 400) actionError.value = error.message
  }
}

function openEdit(row) {
  actionError.value = ''
  editingId.value = row.apiId || row.id
  Object.assign(form, {
    type: row.amount > 0 ? 'income' : 'expense',
    amount: String(Math.abs(row.amount)),
    category: row.amount > 0 ? '수입' : row.category,
    date: row.date,
    time: row.time || '12:00',
    memo: row.memo || row.title,
  })
  panel.value = 'form'
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

watch(categoryOptions, (options) => {
  if (!options.includes(categoryFilter.value)) categoryFilter.value = 'all'
})

watch(categoryFilter, () => {
  listExpanded.value = false
})

watch(month, () => {
  selectedDayActive.value = false
  listExpanded.value = false
  loadSelectedCalendar().catch(() => {})
})

onMounted(async () => {
  await Promise.allSettled([loadTransactions(), loadSelectedCalendar()])
})
</script>

<template>
  <section class="finance">
    <header class="finance-heading">
      <div>
        <p class="finance-heading__eyebrow">MONEY FLOW</p>
        <h1>내 재정</h1>
        <p>흩어진 거래를 월별로 모아보고, 소비 흐름을 가볍게 확인해요.</p>
      </div>
      <button class="add-btn finance-heading__add" type="button" @click="openAdd">
        <span>＋</span> 거래 추가
      </button>
    </header>

    <p
      v-if="
        (calendarState.loading && !calendarState.loaded) ||
        (financeState.loading && !financeState.loaded)
      "
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

    <section class="ledger" :class="{ 'ledger--calendar-open': calendarOpen }">
      <div class="ledger__topbar">
        <div class="month-control">
          <button
            type="button"
            aria-label="이전 달"
            :disabled="!canGoPrevious"
            @click="changeMonth(-1)"
          >
            ‹
          </button>
          <div class="month-control__label">
            <select v-model.number="selectedYear" aria-label="연도 선택">
              <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}년</option>
            </select>
            <select v-model.number="selectedMonthNumber" aria-label="월 선택">
              <option
                v-for="monthOption in monthOptions"
                :key="monthOption"
                :value="monthOption"
                :disabled="selectedYear === currentYear && monthOption > currentMonthNumber"
              >
                {{ monthOption }}월
              </option>
            </select>
          </div>
          <button type="button" aria-label="다음 달" :disabled="!canGoNext" @click="changeMonth(1)">
            ›
          </button>
        </div>
        <div class="view-toggle" role="tablist" aria-label="재정 보기 방식">
          <button
            type="button"
            role="tab"
            :aria-selected="!calendarOpen"
            :class="{ active: !calendarOpen }"
            @click="setLedgerView('list')"
          >
            <span aria-hidden="true">☷</span> 내역
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="calendarOpen"
            :class="{ active: calendarOpen }"
            @click="setLedgerView('calendar')"
          >
            <span aria-hidden="true">▦</span> 달력
          </button>
        </div>
      </div>

      <div v-if="!calendarOpen" class="filter-scroll" aria-label="거래 필터">
        <button
          :class="{ active: filter === 'all' && categoryFilter === 'all' }"
          type="button"
          @click="applyQuickFilter('all')"
        >
          전체
        </button>
        <button
          :class="{ active: filter === 'expense' && categoryFilter === 'all' }"
          type="button"
          @click="applyQuickFilter('expense')"
        >
          지출
        </button>
        <button
          :class="{ active: filter === 'income' }"
          type="button"
          @click="applyQuickFilter('income')"
        >
          수입
        </button>
        <button
          v-for="category in quickCategories"
          :key="category"
          :class="{ active: filter === 'expense' && categoryFilter === category }"
          type="button"
          @click="applyQuickFilter('expense', category)"
        >
          {{ category }}
        </button>
      </div>

      <div v-if="!calendarOpen" class="flow-summary">
        <button type="button" @click="applyQuickFilter('expense')">
          <span>지출</span>
          <strong>{{ money(expense) }}원</strong>
          <i>›</i>
        </button>
        <span class="flow-summary__divider" />
        <button type="button" @click="applyQuickFilter('income')">
          <span>수입</span>
          <strong>{{ money(income) }}원</strong>
          <i>›</i>
        </button>
        <div class="flow-summary__net" :class="{ positive: netCashFlow >= 0 }">
          <span>이번 달 흐름</span>
          <strong>{{ signed(netCashFlow) }}</strong>
        </div>
      </div>

      <div v-if="calendarOpen" id="monthly-calendar" class="calendar-wrap">
        <div class="week-row" aria-hidden="true">
          <span v-for="name in ['일', '월', '화', '수', '목', '금', '토']" :key="name">
            {{ name }}
          </span>
        </div>
        <div class="calendar-grid">
          <button
            v-for="(day, index) in days"
            :key="`${day.iso}-${index}`"
            type="button"
            :disabled="!day.current"
            :class="{
              muted: !day.current,
              today: day.iso === todayIso,
              selected: selectedDayActive && day.iso === selectedDate,
            }"
            :aria-label="day.current ? `${day.date}일 거래 보기` : undefined"
            @click="openDate(day.iso)"
          >
            <span>{{ day.date }}</span>
            <small v-if="day.incomeTotal" class="income"
              >+{{ compactCalendarAmount(day.incomeTotal) }}</small
            >
            <small v-if="day.expenseTotal" class="expense"
              >-{{ compactCalendarAmount(day.expenseTotal) }}</small
            >
          </button>
        </div>
        <section class="calendar-month-summary" aria-label="월간 재정 요약">
          <article class="expense">
            <span><i aria-hidden="true">↗</i> 월 총지출</span>
            <strong>{{ money(expense) }}원</strong>
          </article>
          <article class="income">
            <span><i aria-hidden="true">↙</i> 월 총수입</span>
            <strong>{{ money(income) }}원</strong>
          </article>
          <article class="net" :class="{ positive: netCashFlow >= 0 }">
            <span><i aria-hidden="true">↝</i> 순현금흐름</span>
            <strong>{{ signed(netCashFlow) }}</strong>
          </article>
        </section>
      </div>

      <section v-if="!calendarOpen || selectedDayActive" class="transactions-section">
        <header class="transactions-header">
          <div>
            <button
              v-if="selectedDayActive"
              class="selected-date"
              type="button"
              @click="clearSelectedDate"
            >
              {{ selectedDateLabel(selectedDate) }} <span>×</span>
            </button>
            <h2 v-else>{{ categoryFilter === 'all' ? '전체 내역' : categoryFilter }}</h2>
            <p>
              <template v-if="selectedDayActive">
                하루 합계
                <strong :class="{ positive: selectedDayNet >= 0 }">{{
                  signed(selectedDayNet)
                }}</strong>
              </template>
              <template v-else>총 {{ displayedRows.length }}건의 거래</template>
            </p>
          </div>
          <label v-if="!calendarOpen" class="category-select">
            <span class="sr-only">거래 분류 선택</span>
            <select v-model="categoryFilter">
              <option v-for="category in categoryOptions" :key="category" :value="category">
                {{ category === 'all' ? '전체 분류' : category }}
              </option>
            </select>
          </label>
        </header>

        <template v-if="displayedRows.length">
          <div class="transaction-list">
            <template v-for="(row, index) in renderedRows" :key="row.id">
              <div
                v-if="index === 0 || renderedRows[index - 1].date !== row.date"
                class="date-divider"
              >
                <strong>{{ groupLabel(row.date) }}</strong>
                <span>
                  {{
                    signed(
                      displayedRows
                        .filter((item) => item.date === row.date)
                        .reduce((sum, item) => sum + item.amount, 0),
                    )
                  }}
                </span>
              </div>
              <button class="transaction-row" type="button" @click="openDetail(row)">
                <i :class="{ income: row.amount > 0 }" aria-hidden="true">
                  {{ categoryIcon(row.category, row.amount) }}
                </i>
                <span class="transaction-row__copy">
                  <strong>{{ row.title }}</strong>
                  <small>{{ row.detail || row.category }} · {{ row.time || '시간 미상' }}</small>
                </span>
                <span class="transaction-row__amount" :class="{ income: row.amount > 0 }">
                  <strong>{{ signed(row.amount) }}</strong>
                  <small>{{ row.category }}</small>
                </span>
                <span class="transaction-row__chevron" aria-hidden="true">›</span>
              </button>
            </template>
          </div>

          <button
            v-if="!selectedDayActive && displayedRows.length > listPreviewLimit"
            class="list-toggle"
            type="button"
            :aria-expanded="listExpanded"
            @click="listExpanded = !listExpanded"
          >
            <template v-if="listExpanded">거래 내역 접기</template>
            <template v-else>나머지 {{ hiddenRowCount }}건 더보기</template>
            <span :class="{ 'is-open': listExpanded }">⌄</span>
          </button>
        </template>

        <div v-else class="empty-state">
          <i>₩</i>
          <strong>표시할 거래가 없어요</strong>
          <p>다른 날짜나 분류를 선택하거나 새 거래를 추가해보세요.</p>
          <button type="button" @click="openAdd">거래 추가하기</button>
        </div>
      </section>
    </section>

    <details class="finance-details" open>
      <summary>
        <span>
          <strong>이번 달 재정 분석</strong>
          <small>소비 비중과 고정지출을 확인해요</small>
        </span>
        <i>＋</i>
      </summary>
      <div class="finance-details__body">
        <section class="analysis-card">
          <header>
            <span>카테고리별 지출</span>
            <strong>{{ money(expense) }}원</strong>
          </header>
          <div class="analysis-card__content">
            <div class="donut" :style="{ background: donutGradient }">
              <span>
                <small>지출</small>
                <strong>{{ compactWon(expense) }}</strong>
              </span>
            </div>
            <ul>
              <li v-for="item in categoryChartRows.slice(0, 5)" :key="item.name">
                <i :style="{ background: item.color }" />
                <span>{{ item.name }}</span>
                <strong>{{ compactWon(item.total) }}</strong>
                <small>{{ Math.round((item.total / Math.max(1, expense)) * 100) }}%</small>
              </li>
            </ul>
          </div>
        </section>
        <section class="fixed-card">
          <span>고정지출</span>
          <strong>{{ money(fixedTotal) }}원</strong>
          <p>반복되는 지출을 따로 모아 관리하면 다음 달 예산을 더 쉽게 세울 수 있어요.</p>
          <button type="button" @click="router.push({ name: 'fixedExpenses' })">
            고정지출 관리 <span>›</span>
          </button>
        </section>
      </div>
    </details>

    <section class="finance-timeline" aria-labelledby="finance-timeline-title">
      <h2 id="finance-timeline-title">월별 재정 타임라인</h2>
      <p>현재 자금이 유지되는 기간과 취업 목표 시점을 한눈에 확인하세요.</p>
      <div class="finance-timeline__list" role="list" aria-label="월별 재정 주요 시점">
        <article
          v-for="item in financeTimelineItems"
          :key="item.id"
          :class="`finance-timeline__item--${item.tone}`"
          role="listitem"
        >
          <i aria-hidden="true" />
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>
      <small>
        직전 3개월 월평균 기준 · 계획 적용 시 {{ timelineMonths(simulation.expectedMonths) }}
      </small>
    </section>

    <button class="mobile-add" type="button" aria-label="거래 추가" @click="openAdd">＋</button>

    <div v-if="panel" class="overlay" @click.self="panel = ''">
      <aside class="sheet" role="dialog" aria-modal="true">
        <button class="sheet__close" type="button" aria-label="닫기" @click="panel = ''">×</button>
        <p v-if="actionError" class="sheet-error">{{ actionError }}</p>

        <template v-if="panel === 'detail' && selectedTransaction">
          <p class="sheet__eyebrow">TRANSACTION</p>
          <h2>거래 상세</h2>
          <div class="detail-hero">
            <i :class="{ income: selectedTransaction.amount > 0 }">
              {{ categoryIcon(selectedTransaction.category, selectedTransaction.amount) }}
            </i>
            <span>
              <small>{{ selectedTransaction.amount > 0 ? '수입' : '지출' }}</small>
              <strong>{{ selectedTransaction.title }}</strong>
            </span>
            <b :class="{ income: selectedTransaction.amount > 0 }">
              {{ signed(selectedTransaction.amount) }}
            </b>
          </div>
          <dl class="detail-list">
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
              <dd>{{ selectedTransaction.detail || '-' }}</dd>
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
          <button class="sheet__primary" type="button" @click="openEdit(selectedTransaction)">
            수정하기
          </button>
        </template>

        <template v-else>
          <p class="sheet__eyebrow">NEW TRANSACTION</p>
          <h2>{{ editingId ? '거래 수정' : '거래 추가' }}</h2>
          <p class="form-label">거래 타입</p>
          <div class="type-toggle">
            <button
              type="button"
              :class="{ active: form.type === 'expense' }"
              @click="setFormType('expense')"
            >
              지출
            </button>
            <button
              type="button"
              :class="{ active: form.type === 'income' }"
              @click="setFormType('income')"
            >
              수입
            </button>
          </div>
          <button
            v-if="editingId"
            class="delete-button"
            type="button"
            :disabled="isSaving"
            @click="remove"
          >
            거래 삭제
          </button>
          <label class="sheet-field">
            <span>금액</span>
            <div>
              <input v-model="formattedAmount" type="text" inputmode="numeric" placeholder="0" /><b
                >원</b
              >
            </div>
          </label>
          <label v-if="form.type === 'expense'" class="sheet-field">
            <span>카테고리</span>
            <select v-model="form.category">
              <option
                v-for="name in [
                  '식비',
                  '주거',
                  '교통',
                  '구독',
                  '보험',
                  '교육',
                  '쇼핑',
                  '의료',
                  '여가',
                  '기타',
                ]"
                :key="name"
              >
                {{ name }}
              </option>
            </select>
          </label>
          <div class="form-grid">
            <label class="sheet-field">
              <span>거래일</span>
              <input v-model="formattedDate" type="text" inputmode="numeric" />
            </label>
            <label class="sheet-field">
              <span>시간</span>
              <input v-model="form.time" type="time" />
            </label>
          </div>
          <label class="sheet-field">
            <span>메모</span>
            <input v-model="form.memo" placeholder="거래 내용을 입력해 주세요" />
          </label>
          <button class="sheet__primary" type="button" :disabled="isSaving" @click="save">
            {{ isSaving ? '저장 중...' : editingId ? '변경사항 저장' : '거래 저장' }}
          </button>
        </template>
      </aside>
    </div>
  </section>
</template>

<style scoped>
:global(body:has(.finance)) {
  background-color: #f5f7f9;
  background-image: none;
}

.finance {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 42px 0 40px;
  color: #191f28;
}

button,
select,
input {
  font: inherit;
}

.finance-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 26px;
}

.finance-heading__eyebrow,
.sheet__eyebrow {
  margin: 0 0 6px;
  color: var(--primary);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.finance-heading h1 {
  margin: 0;
  color: var(--primary);
  font-size: 34px;
  line-height: 1.2;
  letter-spacing: -0.04em;
}

.finance-heading > div > p:last-child {
  margin: 8px 0 0;
  color: #6b7684;
  font-size: 15px;
}

.finance-heading__add {
  width: 144px;
  height: 46px;
  border: 0;
}

.finance-heading__add span {
  margin-right: 3px;
  font-size: 18px;
}

.finance-state {
  margin: 0 0 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #f1f4fa;
  color: #5b6574;
  font-size: 13px;
}

.finance-state--error {
  background: #fff1f1;
  color: #d04444;
}

.finance-state button {
  margin-left: 8px;
  border: 0;
  background: none;
  color: inherit;
  font-weight: 800;
  text-decoration: underline;
}

.ledger {
  overflow: hidden;
  border: 1px solid rgb(10 22 128 / 13%);
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 14px 40px rgb(32 42 74 / 9%);
}

.ledger__topbar {
  display: flex;
  min-height: 84px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 30px;
}

.month-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.month-control > button {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #3b4350;
  font-size: 27px;
  line-height: 1;
}

.month-control > button:hover {
  background: #f3f5f8;
}

.month-control > button:disabled {
  opacity: 0.25;
}

.month-control__label {
  display: flex;
  align-items: center;
  gap: 0;
}

.month-control__label select {
  width: auto;
  padding: 5px 2px;
  border: 0 !important;
  background: transparent !important;
  color: #191f28;
  box-shadow: none !important;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.03em;
  cursor: pointer;
}

.view-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border: 1px solid rgb(241 185 76 / 34%);
  border-radius: 14px;
  background: #fff9df;
}

.view-toggle button {
  display: inline-flex;
  min-width: 76px;
  height: 36px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #8b7a5b;
  font-size: 13px;
  font-weight: 800;
}

.view-toggle button > span {
  font-size: 16px;
}

.view-toggle button.active {
  background: #fff;
  color: var(--primary);
  box-shadow: 0 3px 10px rgb(95 76 26 / 12%);
}

.filter-scroll {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 30px 20px;
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-scroll::-webkit-scrollbar {
  display: none;
}

.filter-scroll button {
  box-sizing: border-box;
  min-width: fit-content;
  height: 38px;
  flex: 0 0 auto;
  padding: 0 17px;
  overflow: visible;
  border: 1px solid #e5e8ed;
  border-radius: 999px;
  background: #fff;
  color: #6b7684;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.filter-scroll button:nth-child(-n + 3) {
  min-width: 60px;
}

.filter-scroll button.active {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
}

.flow-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) 220px;
  align-items: center;
  gap: 18px;
  margin: 0 30px 24px;
  padding: 19px 22px;
  border-radius: 18px;
  border: 1px solid rgb(241 185 76 / 28%);
  background: var(--accent);
  box-shadow: 0 8px 22px rgb(111 87 29 / 8%);
}

.flow-summary > button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  background: none;
  text-align: left;
}

.flow-summary > button span {
  color: #806b43;
  font-size: 14px;
}

.flow-summary > button strong {
  color: #191f28;
  font-size: 17px;
  letter-spacing: -0.02em;
}

.flow-summary > button:nth-of-type(2) strong {
  color: var(--primary);
}

.flow-summary > button i {
  color: #a0a7b1;
  font-size: 22px;
  font-style: normal;
}

.flow-summary__divider {
  width: 1px;
  height: 26px;
  background: rgb(141 111 48 / 20%);
}

.flow-summary__net {
  display: grid;
  justify-items: end;
  padding-left: 20px;
  border-left: 1px solid rgb(141 111 48 / 20%);
}

.flow-summary__net span {
  color: #8b764e;
  font-size: 12px;
}

.flow-summary__net strong {
  margin-top: 2px;
  color: #e2574c;
  font-size: 17px;
}

.flow-summary__net.positive strong,
.transactions-header p strong.positive {
  color: var(--primary);
}

.calendar-wrap {
  margin: 0 30px 30px;
  padding: 8px 18px 20px;
  border: 0;
  border-radius: 0;
  background: #fff;
  box-shadow: none;
}

.week-row,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.week-row span {
  padding: 9px 0 7px;
  color: #a0a7b1;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.week-row span:first-child {
  color: #a0a7b1;
}

.calendar-grid button {
  display: grid;
  min-height: 70px;
  align-content: start;
  justify-items: center;
  gap: 3px;
  padding: 10px 3px 5px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #191f28;
}

.calendar-grid button:not(:disabled):hover {
  background: transparent;
}

.calendar-grid button > span {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
}

.calendar-grid button.muted {
  color: #c7ccd3;
}

.calendar-grid button.today > span {
  background: var(--accent);
  color: #191f28;
}

.calendar-grid button.selected > span {
  background: var(--accent);
  color: #191f28;
  box-shadow: none;
}

.calendar-grid small {
  overflow: hidden;
  max-width: 100%;
  font-size: 11px !important;
  font-weight: 600;
  line-height: 1.25 !important;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar-grid small.income {
  color: #4d7bea !important;
}

.calendar-grid small.expense {
  color: #e45e56 !important;
}

.calendar-month-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 20px;
  padding: 16px 18px;
  border-radius: 16px;
  background: var(--accent);
  box-shadow: none;
}

.calendar-month-summary article {
  display: grid;
  min-width: 0;
  gap: 6px;
  padding: 2px 18px;
  border: 0;
  border-left: 1px solid rgb(128 107 67 / 22%);
  border-radius: 0;
  background: transparent;
}

.calendar-month-summary article:first-child {
  padding-left: 0;
  border-left: 0;
}

.calendar-month-summary span {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #806b43;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.calendar-month-summary span > i {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 50%;
  background: #fff;
  color: var(--primary);
  font-style: normal;
}

.calendar-month-summary strong {
  overflow: hidden;
  color: #333d4b;
  font-size: 16px;
  letter-spacing: -0.03em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar-month-summary .income strong,
.calendar-month-summary .net.positive strong {
  color: var(--primary);
}

.calendar-month-summary .expense strong,
.calendar-month-summary .net:not(.positive) strong {
  color: #d95045;
}

.transactions-section {
  padding: 28px 30px 30px;
}

.transactions-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.transactions-header h2 {
  margin: 0;
  color: #191f28;
  font-size: 21px;
  letter-spacing: -0.03em;
}

.transactions-header p {
  margin: 4px 0 0;
  color: #8b95a1;
  font-size: 13px;
}

.transactions-header p strong {
  margin-left: 5px;
  color: #e2574c;
}

.selected-date {
  height: 36px;
  padding: 0 13px;
  border: 0;
  border-radius: 999px;
  background: #edf0ff;
  color: var(--primary);
  font-weight: 850;
}

.selected-date span {
  margin-left: 5px;
  color: #7882aa;
}

.category-select select {
  height: 40px;
  padding: 0 34px 0 14px;
  border: 1px solid #e5e8ed !important;
  border-radius: 12px !important;
  background-color: #fff !important;
  color: #4e5968;
  box-shadow: none !important;
  font-size: 13px;
  font-weight: 700;
}

.date-divider {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 24px;
  padding: 0 4px 10px;
  border-bottom: 1px solid #f0f2f5;
}

.transaction-list .date-divider:first-child {
  margin-top: 0;
}

.list-toggle {
  display: flex;
  width: 100%;
  height: 50px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
  border: 1px solid #e5e8ed;
  border-radius: 14px;
  background: #fff;
  color: var(--primary);
  font-size: 14px;
  font-weight: 850;
}

.list-toggle > span {
  font-size: 17px;
  transition: transform 0.2s ease;
}

.list-toggle > span.is-open {
  transform: rotate(180deg);
}

.date-divider strong {
  color: #4e5968;
  font-size: 14px;
}

.date-divider span {
  color: #8b95a1;
  font-size: 13px;
  font-weight: 700;
}

.transaction-row {
  display: flex;
  width: 100%;
  min-height: 76px;
  align-items: center;
  gap: 14px;
  padding: 10px 6px;
  border: 0;
  border-bottom: 1px solid #f2f3f5;
  background: #fff;
  color: #191f28;
  text-align: left;
}

.transaction-row:hover {
  background: #fafbfc;
}

.transaction-row > i,
.detail-hero > i {
  display: grid;
  width: 44px;
  height: 44px;
  flex: none;
  place-items: center;
  border-radius: 15px;
  background: #fff4c7;
  color: #5a4913;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
  font-size: 20px;
  font-style: normal;
  font-weight: 900;
}

.transaction-row > i.income,
.detail-hero > i.income {
  background: var(--sky-soft);
  color: var(--primary);
}

.transaction-row:nth-of-type(4n + 1) > i {
  background: #fff1db;
}

.transaction-row:nth-of-type(4n + 2) > i {
  background: #e9f7ef;
}

.transaction-row:nth-of-type(4n + 3) > i {
  background: #edf3ff;
}

.transaction-row__copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 4px;
}

.transaction-row__copy strong {
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transaction-row__copy small,
.transaction-row__amount small {
  color: #8b95a1;
  font-size: 12px !important;
}

.transaction-row__amount {
  display: grid;
  justify-items: end;
  gap: 3px;
  color: #333d4b;
}

.transaction-row__amount strong {
  font-size: 15px;
  white-space: nowrap;
}

.transaction-row__amount.income strong {
  color: var(--primary);
}

.transaction-row__chevron {
  color: #b7bdc6;
  font-size: 22px;
}

.empty-state {
  display: grid;
  min-height: 290px;
  place-content: center;
  justify-items: center;
  text-align: center;
}

.empty-state > i {
  display: grid;
  width: 56px;
  height: 56px;
  margin-bottom: 15px;
  place-items: center;
  border-radius: 50%;
  background: #f0f2f6;
  color: #9ba3ae;
  font-size: 22px;
  font-style: normal;
}

.empty-state > p {
  margin: 7px 0 18px;
  color: #8b95a1;
  font-size: 13px;
}

.empty-state > button {
  height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: var(--accent-strong);
  color: var(--primary);
  font-weight: 850;
}

.finance-details {
  margin-top: 22px;
  overflow: hidden;
  border: 1px solid rgb(10 22 128 / 12%);
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 8px 28px rgb(32 42 74 / 6%);
}

.finance-details > summary {
  display: flex;
  min-height: 76px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 24px;
  cursor: pointer;
  list-style: none;
}

.finance-details > summary::-webkit-details-marker {
  display: none;
}

.finance-details > summary > span {
  display: grid;
  gap: 3px;
}

.finance-details > summary strong {
  font-size: 16px;
}

.finance-details > summary small {
  color: #8b95a1;
  font-size: 13px !important;
}

.finance-details > summary > i {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  background: #fff4c7;
  color: var(--primary);
  font-size: 20px;
  font-style: normal;
  transition: transform 0.2s ease;
}

.finance-details[open] > summary > i {
  transform: rotate(45deg);
}

.finance-details__body {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 16px;
  padding: 4px 24px 24px;
}

.analysis-card,
.fixed-card {
  padding: 22px;
  border-radius: 18px;
  background: #f7f8fb;
}

.analysis-card > header,
.fixed-card {
  display: grid;
  gap: 5px;
}

.analysis-card > header span,
.fixed-card > span {
  color: #6b7684;
  font-size: 13px;
  font-weight: 700;
}

.analysis-card > header strong,
.fixed-card > strong {
  font-size: 23px;
}

.analysis-card__content {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  margin-top: 18px;
}

.donut {
  display: grid;
  width: 126px;
  height: 126px;
  place-items: center;
  border-radius: 50%;
}

.donut > span {
  display: grid;
  width: 78px;
  height: 78px;
  place-content: center;
  justify-items: center;
  border-radius: 50%;
  background: #fff;
}

.donut small {
  color: #8b95a1;
  font-size: 11px !important;
}

.donut strong {
  font-size: 13px;
}

.analysis-card ul {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.analysis-card li {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto 34px;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.analysis-card li > i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.analysis-card li > small {
  color: #8b95a1;
  font-size: 11px !important;
  text-align: right;
}

.fixed-card > p {
  margin: 8px 0 20px;
  color: #6b7684;
  font-size: 13px;
  line-height: 1.6;
}

.fixed-card > button {
  display: flex;
  height: 44px;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding: 0 15px;
  border: 0;
  border-radius: 12px;
  background: var(--accent-strong);
  color: var(--primary);
  font-size: 13px;
  font-weight: 850;
}

.fixed-card > button span {
  font-size: 20px;
}

.finance-timeline {
  margin-top: 22px;
  padding: 28px;
  border: 1px solid rgb(10 22 128 / 12%);
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 8px 28px rgb(32 42 74 / 6%);
}

.finance-timeline h2 {
  margin: 0;
  color: #191f28;
  font-size: 21px;
  letter-spacing: -0.03em;
}

.finance-timeline > p {
  margin: 8px 0 0;
  color: #6b7684;
  font-size: 14px;
  line-height: 1.65;
}

.finance-timeline__list {
  position: relative;
  display: grid;
  gap: 12px;
  margin-top: 24px;
}

.finance-timeline__list::before {
  position: absolute;
  top: 23px;
  bottom: 23px;
  left: 21px;
  width: 4px;
  border-radius: 999px;
  background: #d9e0f5;
  content: '';
}

.finance-timeline__item--current,
.finance-timeline__item--limit,
.finance-timeline__item--scenario {
  position: relative;
  display: grid;
  min-height: 54px;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
}

.finance-timeline__list article > i {
  z-index: 1;
  display: block;
  width: 46px;
  height: 46px;
  border: 6px solid #fff;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 3px 12px rgb(10 22 128 / 20%);
}

.finance-timeline__item--limit > i {
  background: #98a3b2 !important;
}

.finance-timeline__item--scenario > i {
  background: #7e9de9 !important;
}

.finance-timeline__list article > span {
  color: #6b7684;
  font-size: 14px;
}

.finance-timeline__list article > strong {
  color: #191f28;
  font-size: 16px;
  white-space: nowrap;
}

.finance-timeline > small {
  display: block;
  margin-top: 14px;
  color: #6b7684 !important;
  font-size: 12px !important;
}

.mobile-add {
  display: none;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(15 18 28 / 48%);
  backdrop-filter: blur(3px);
}

.sheet {
  position: relative;
  width: min(500px, 100%);
  max-height: calc(100dvh - 48px);
  padding: 32px;
  overflow-y: auto;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 24px 80px rgb(0 0 0 / 24%);
}

.sheet__close {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: #f2f4f7;
  color: #6b7684;
  font-size: 23px;
}

.sheet h2 {
  margin: 0 0 26px;
  color: #191f28;
  font-size: 25px;
}

.sheet-error {
  margin: 0 48px 18px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff1f1;
  color: #d04444;
  font-size: 12px;
}

.detail-hero {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 18px;
  border-radius: 18px;
  background: #f7f8fb;
}

.detail-hero > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.detail-hero > span small {
  color: #8b95a1;
  font-size: 12px !important;
}

.detail-hero > span strong {
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-hero > b {
  margin-left: auto;
  color: #333d4b;
  font-size: 16px;
  white-space: nowrap;
}

.detail-hero > b.income {
  color: var(--primary);
}

.detail-list {
  margin: 16px 0 24px;
  padding: 0 18px;
  border: 1px solid #edf0f4;
  border-radius: 17px;
}

.detail-list > div {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 14px;
  padding: 15px 0;
  border-bottom: 1px solid #edf0f4;
}

.detail-list > div:last-child {
  border-bottom: 0;
}

.detail-list dt,
.detail-list dd {
  margin: 0;
  font-size: 13px;
}

.detail-list dt {
  color: #8b95a1;
}

.detail-list dd {
  font-weight: 700;
}

.form-label {
  margin: 0 0 8px;
  color: #4e5968;
  font-size: 13px;
  font-weight: 800;
}

.type-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  padding: 4px;
  border-radius: 14px;
  background: #f0f2f5;
}

.type-toggle button {
  height: 44px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #8b95a1;
  font-weight: 800;
}

.type-toggle button.active {
  background: #fff;
  color: var(--primary);
  box-shadow: 0 2px 8px rgb(32 42 74 / 10%);
}

.delete-button {
  display: block;
  margin: 12px 0 0 auto;
  border: 0;
  background: none;
  color: #e2574c;
  font-size: 12px;
  font-weight: 800;
}

.sheet-field {
  display: grid;
  gap: 8px;
  margin-top: 18px;
}

.sheet-field > span {
  color: #4e5968;
  font-size: 13px;
  font-weight: 800;
}

.sheet-field input,
.sheet-field select,
.sheet-field > div {
  width: 100%;
  height: 52px;
  box-sizing: border-box;
  border: 1px solid #e0e4ea !important;
  border-radius: 13px !important;
  background: #fff !important;
  box-shadow: none !important;
}

.sheet-field input,
.sheet-field select {
  padding: 0 15px;
}

.sheet-field > div {
  display: flex;
  align-items: center;
  padding-right: 15px;
}

.sheet-field > div input {
  height: 50px;
  border: 0 !important;
}

.sheet-field > div b {
  color: #6b7684;
}

.form-grid {
  display: grid;
  grid-template-columns: 1.25fr 0.75fr;
  gap: 12px;
}

.sheet__primary {
  width: 100%;
  height: 54px;
  margin-top: 24px;
  border: 0;
  border-radius: 14px;
  background: var(--accent-strong);
  color: var(--primary);
  font-weight: 900;
}

.sheet__primary:disabled {
  opacity: 0.55;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 767px) {
  .finance {
    padding: 2px 0 88px;
  }

  .finance-heading {
    display: none;
  }

  .ledger {
    margin: 0 -16px;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .ledger__topbar {
    min-height: 66px;
    padding: 0 16px;
  }

  .month-control {
    gap: 1px;
  }

  .month-control > button {
    width: 30px;
    height: 34px;
    font-size: 25px;
  }

  .month-control__label select {
    max-width: none;
    padding-inline: 0;
    font-size: 16px;
  }

  .month-control__label select:first-child {
    display: block;
    width: 88px;
  }

  .month-control__label select:last-child {
    width: 48px;
  }

  .view-toggle {
    gap: 3px;
    padding: 3px;
    border-radius: 12px;
  }

  .view-toggle button {
    min-width: 62px;
    height: 34px;
    gap: 4px;
    padding: 0 8px;
    font-size: 12px;
  }

  .view-toggle button > span {
    font-size: 14px;
  }

  .filter-scroll {
    padding: 2px 16px 18px;
  }

  .filter-scroll::after {
    width: 10px;
    flex: none;
    content: '';
  }

  .filter-scroll button {
    height: 36px;
    padding: 0 16px;
    font-size: 13px;
  }

  .flow-summary {
    grid-template-columns: 1fr 1px 1fr;
    gap: 10px;
    margin: 0 16px 20px;
    padding: 16px;
    border-radius: 16px;
  }

  .flow-summary > button {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    gap: 4px 6px;
  }

  .flow-summary > button span {
    grid-column: 1;
    font-size: 12px;
  }

  .flow-summary > button strong {
    grid-column: 1;
    overflow: visible;
    font-size: 14px;
    text-overflow: clip;
    white-space: nowrap;
  }

  .flow-summary > button i {
    grid-row: 1 / 3;
    grid-column: 2;
    font-size: 18px;
  }

  .flow-summary__net {
    display: none;
  }

  .calendar-wrap {
    margin: 0 12px 18px;
    padding: 4px 4px 14px;
    border-radius: 0;
  }

  .week-row span {
    font-size: 11px;
  }

  .calendar-grid button {
    min-height: 54px;
    padding-top: 7px;
    border-top: 0;
    border-radius: 11px;
  }

  .calendar-grid button > span {
    width: 26px;
    height: 26px;
    font-size: 13px;
  }

  .calendar-grid small {
    max-width: 46px;
    font-size: 9px !important;
  }

  .calendar-month-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    margin-top: 14px;
    padding: 12px;
    border-radius: 14px;
  }

  .calendar-month-summary article {
    gap: 4px;
    padding: 2px 9px;
    border-radius: 0;
  }

  .calendar-month-summary span {
    gap: 4px;
    font-size: 10px;
  }

  .calendar-month-summary span > i {
    width: 18px;
    height: 18px;
  }

  .calendar-month-summary strong {
    font-size: 12px;
  }

  .transactions-section {
    padding: 24px 16px 16px;
  }

  .ledger--calendar-open .transactions-section {
    margin: 0 12px 16px;
    padding: 18px 12px;
    border: 1px solid rgb(241 185 76 / 25%);
    border-radius: 18px;
    background: #fffdf7;
  }

  .transactions-header {
    margin-bottom: 15px;
  }

  .transactions-header h2 {
    font-size: 19px;
  }

  .category-select select {
    width: 128px;
    max-width: 128px;
    height: 38px;
  }

  .date-divider {
    margin-top: 20px;
  }

  .transaction-row {
    min-height: 74px;
    gap: 11px;
    padding-inline: 2px;
  }

  .transaction-row > i {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    font-size: 16px;
  }

  .transaction-row__copy strong,
  .transaction-row__amount strong {
    font-size: 14px;
  }

  .transaction-row__chevron {
    display: none;
  }

  .finance-details {
    margin: 16px -4px 0;
    border-radius: 18px;
  }

  .finance-details > summary {
    min-height: 70px;
    padding: 0 17px;
  }

  .finance-details__body {
    grid-template-columns: 1fr;
    padding: 2px 12px 14px;
  }

  .analysis-card,
  .fixed-card {
    padding: 18px;
  }

  .analysis-card__content {
    grid-template-columns: 108px minmax(0, 1fr);
    gap: 15px;
  }

  .donut {
    width: 106px;
    height: 106px;
  }

  .donut > span {
    width: 66px;
    height: 66px;
  }

  .analysis-card li {
    grid-template-columns: 7px minmax(0, 1fr) auto;
    gap: 6px;
  }

  .analysis-card li > small {
    display: none;
  }

  .finance-timeline {
    margin: 16px -4px 0;
    padding: 24px 20px;
    border-radius: 18px;
  }

  .finance-timeline h2 {
    font-size: 21px;
  }

  .finance-timeline__list {
    margin-top: 22px;
  }

  .mobile-add {
    position: fixed;
    z-index: 20;
    right: 20px;
    bottom: calc(var(--bottom-nav-height) + 18px);
    display: grid;
    width: 54px;
    height: 54px;
    place-items: center;
    border: 0;
    border-radius: 50%;
    background: var(--accent-strong);
    color: var(--primary);
    box-shadow: 0 10px 26px rgb(42 47 72 / 24%);
    font-size: 26px;
    font-weight: 700;
  }

  .overlay {
    align-items: end;
    padding: 0;
  }

  .sheet {
    width: 100%;
    max-height: calc(100dvh - 40px);
    padding: 28px 20px calc(24px + env(safe-area-inset-bottom));
    border-radius: 24px 24px 0 0;
  }

  .sheet__close {
    top: 20px;
    right: 18px;
  }

  .sheet h2 {
    font-size: 23px;
  }

  .detail-hero {
    padding: 15px;
  }

  .detail-hero > b {
    font-size: 14px;
  }

  .form-grid {
    grid-template-columns: 1fr 130px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .view-toggle button,
  .finance-details > summary > i {
    transition: none;
  }
}
</style>
