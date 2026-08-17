<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getFixedExpenseCandidatesApi } from '@/api/mydata'
import { getFixedExpenseDetailsApi, getFixedExpenseSummaryApi } from '@/api/transactions'
import { expenseCategoryToLabel } from '@/constants/expenseCategories'
import { financeState, financeTransactions, setFixed } from '@/features/finance/financeStore'

const route = useRoute()
const router = useRouter()
const selected = ref([])
const query = ref('')
const dismissedSuggestion = ref(false)
const fixedApiLoading = ref(false)
const fixedApiError = ref('')
const serverFixedRows = ref([])
const serverCandidates = ref([])
const serverFixedSummary = ref(null)
const useFixedApi = import.meta.env.VITE_USE_MOCK_API !== 'true'
const now = new Date()
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const fixedMonth = ref(currentMonth)
const money = (value) => new Intl.NumberFormat('ko-KR').format(Math.abs(value))
const fixedMonthLabel = computed(() => {
  const [year, month] = fixedMonth.value.split('-').map(Number)
  return `${year}년 ${month}월`
})
const fixedPeriodLabel = computed(() =>
  fixedMonth.value === currentMonth ? '이번 달' : `${Number(fixedMonth.value.split('-')[1])}월`,
)
const mode = computed(() =>
  route.name === 'fixedExpenseAdd'
    ? 'add'
    : route.name === 'fixedExpenseDelete'
      ? 'delete'
      : 'detail',
)
const isRecognizedFixedRow = (row) => Boolean(row?.fixed)
const localFixedRows = computed(() =>
  financeTransactions.value.filter((row) => isRecognizedFixedRow(row) && row.amount < 0),
)
const fixedSourceRows = computed(() => {
  if (!useFixedApi) return localFixedRows.value
  return serverFixedRows.value
})
const fixedRows = computed(() =>
  fixedSourceRows.value.filter(
    (row) => isRecognizedFixedRow(row) && row.amount < 0 && row.date.startsWith(fixedMonth.value),
  ),
)
const registeredFixedRows = computed(() => {
  return fixedSourceRows.value
    .filter((row) => isRecognizedFixedRow(row) && row.amount < 0)
    .sort((a, b) => b.date.localeCompare(a.date))
})
const candidates = computed(() => {
  const keyword = query.value.trim()
  return serverCandidates.value
    .filter((row) => row.title.includes(keyword))
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
})
const suggestedRow = computed(() =>
  dismissedSuggestion.value ? null : candidates.value[0] || null,
)
const visibleRows = computed(() =>
  mode.value === 'add'
    ? candidates.value
    : mode.value === 'delete'
      ? registeredFixedRows.value
      : fixedRows.value,
)
const allSelected = computed(
  () =>
    visibleRows.value.length > 0 &&
    visibleRows.value.every((row) => selected.value.includes(row.id)),
)
const total = computed(() => {
  if (useFixedApi && fixedMonth.value === currentMonth) {
    const currentTotal = Number(serverFixedSummary.value?.currentMonthTotalFixedExpenseAmount)
    if (Number.isFinite(currentTotal)) return Math.abs(currentTotal)
  }
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonthKey = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`
  if (useFixedApi && fixedMonth.value === previousMonthKey) {
    const previousTotal = Number(serverFixedSummary.value?.lastMonthTotalFixedExpenseAmount)
    if (Number.isFinite(previousTotal)) return Math.abs(previousTotal)
  }
  return fixedRows.value.reduce((sum, row) => sum + Math.abs(row.amount), 0)
})
const grouped = computed(() => {
  const map = {}
  const categoryOrder = [
    '주거·통신',
    '주거',
    '월세',
    '교통·유류비',
    '교통',
    '취업 준비',
    '구독',
    '의료·건강',
    '보험',
    '기타 금융',
    '기타',
  ]
  visibleRows.value.forEach((row) => {
    ;(map[row.category] ||= []).push(row)
  })
  return Object.entries(map).sort(([a], [b]) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b))
})
function categoryClass(category) {
  return (
    {
      보험: 'category-insurance',
      구독: 'category-subscription',
      주거: 'category-rent',
      월세: 'category-rent',
      교통: 'category-transport',
      기타: 'category-other',
      '주거·통신': 'category-rent',
      '교통·유류비': 'category-transport',
      '취업 준비': 'category-subscription',
      '의료·건강': 'category-insurance',
      '기타 금융': 'category-other',
    }[category] || 'category-other'
  )
}
function toggle(id) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((x) => x !== id)
    : [...selected.value, id]
}
function toggleAll() {
  selected.value = allSelected.value ? [] : visibleRows.value.map((row) => row.id)
}
function changeFixedMonth(offset) {
  const [year, month] = fixedMonth.value.split('-').map(Number)
  const next = new Date(year, month - 1 + offset, 1)
  const candidate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  if (candidate <= currentMonth) fixedMonth.value = candidate
}
async function loadFixedExpenseData() {
  if (!useFixedApi) return
  fixedApiLoading.value = true
  fixedApiError.value = ''
  const [detailsResult, candidatesResult, summaryResult] = await Promise.allSettled([
    getFixedExpenseDetailsApi(),
    getFixedExpenseCandidatesApi(),
    getFixedExpenseSummaryApi(),
  ])

  if (detailsResult.status === 'fulfilled') serverFixedRows.value = detailsResult.value
  else if (detailsResult.reason?.code === 'LEDGER_402') serverFixedRows.value = []
  else fixedApiError.value = detailsResult.reason?.message || '고정지출 내역을 불러오지 못했습니다.'

  if (candidatesResult.status === 'fulfilled') {
    serverCandidates.value = (
      Array.isArray(candidatesResult.value) ? candidatesResult.value : []
    ).map((row) => {
      const paymentDay = Math.min(31, Math.max(1, Number(row.expectedPaymentDay) || 1))
      return {
        id: row.representativeTransactionId,
        recurringIds: [row.representativeTransactionId],
        date: `${currentMonth}-${String(paymentDay).padStart(2, '0')}`,
        title: row.transactionContent || '고정지출 후보',
        category: expenseCategoryToLabel(row.expenseCategory),
        detail: '고정지출 후보',
        amount: -Math.abs(Number(row.expectedAmount) || 0),
        occurrenceCount: Number(row.occurrenceCount) || 0,
        transactionSource: row.transactionSource || '',
      }
    })
  } else if (!fixedApiError.value) {
    fixedApiError.value = candidatesResult.reason?.message || '고정지출 후보를 불러오지 못했습니다.'
  }
  if (summaryResult.status === 'fulfilled') serverFixedSummary.value = summaryResult.value
  else if (summaryResult.reason?.code === 'LEDGER_402') serverFixedSummary.value = null
  else if (!fixedApiError.value) {
    fixedApiError.value = summaryResult.reason?.message || '고정지출 합계를 불러오지 못했습니다.'
  }
  fixedApiLoading.value = false
}
async function submit() {
  let saved
  if (mode.value === 'delete') {
    saved = await setFixed([...selected.value], false)
  } else {
    const selectedRules = candidates.value.filter((row) => selected.value.includes(row.id))
    saved = await setFixed(
      selectedRules.flatMap((row) => row.recurringIds),
      true,
    )
  }
  if (saved) {
    await loadFixedExpenseData()
    selected.value = []
    router.push({ name: 'fixedExpenses' })
  }
}
async function registerSuggestion() {
  if (!suggestedRow.value) return
  if (await setFixed(suggestedRow.value.recurringIds, true)) {
    dismissedSuggestion.value = true
    await loadFixedExpenseData()
  }
}
watch(mode, () => {
  selected.value = []
  fixedApiError.value = ''
})
onMounted(loadFixedExpenseData)
</script>
<template>
  <section :class="['fixed-page', `fixed-page--${mode}`]">
    <template v-if="mode === 'detail'">
      <div class="month">
        <button type="button" aria-label="이전 달" @click="changeFixedMonth(-1)">‹</button>
        <b>{{ fixedMonthLabel }}</b>
        <button
          type="button"
          aria-label="다음 달"
          :disabled="fixedMonth === currentMonth"
          @click="changeFixedMonth(1)"
        >
          ›
        </button>
      </div>
      <div class="total">
        <span>{{ fixedPeriodLabel }} 고정지출 합계</span><small>총 {{ fixedRows.length }}건</small
        ><strong>총 {{ money(total) }}원</strong>
      </div>
      <div v-if="suggestedRow" class="suggest">
        <b>고정지출 후보</b
        ><strong
          >{{ suggestedRow.title }} · 최근 {{ suggestedRow.occurrenceCount }}회
          {{ money(suggestedRow.amount) }}원대 결제</strong
        >
        <p>매달 비슷한 금액이 반복돼요. 고정지출로 등록할까요?</p>
        <button type="button" @click="dismissedSuggestion = true">아니에요</button
        ><button type="button" @click="registerSuggestion"><strong>고정지출로 등록</strong></button>
      </div>
    </template>
    <div v-if="mode === 'add'" class="search">
      <input v-model="query" placeholder="거래명 검색 (예: 넷플릭스, 월세)" />
    </div>
    <div v-if="mode !== 'detail'" class="selection-head">
      <b>{{ selected.length }}건 선택됨</b
      ><button
        class="select-all-button"
        type="button"
        :aria-pressed="allSelected"
        @click="toggleAll"
      >
        <strong>{{ allSelected ? '전체 해제' : '전체 선택' }}</strong>
      </button>
    </div>
    <section class="expense-list">
      <p v-if="fixedApiError || financeState.error" class="empty-message">
        {{ fixedApiError || financeState.error }}
      </p>
      <p v-if="!fixedApiLoading && !visibleRows.length" class="empty-message">
        {{
          mode === 'add'
            ? '서버에서 제공한 고정지출 후보가 없어요.'
            : mode === 'delete'
              ? '해제할 고정지출이 없어요.'
              : '서버에 등록된 고정지출이 없어요.'
        }}
      </p>
      <template v-for="[category, rows] in grouped" :key="category">
        <h2 :class="categoryClass(category)">
          <span>●</span>{{ category
          }}<b>{{ (rows.reduce((s, r) => s + Math.abs(r.amount), 0) / 10000).toFixed(1) }}만원</b>
        </h2>
        <button
          v-for="row in rows"
          :key="row.id"
          :class="[categoryClass(category), { chosen: selected.includes(row.id) }]"
          @click="mode !== 'detail' && toggle(row.id)"
        >
          <i>{{ row.title.slice(0, 1) }}</i
          ><span
            ><strong>{{ row.title }}</strong
            ><small
              ><template v-if="mode === 'detail'"
                >매월 {{ Number(row.date.slice(8, 10)) }}일 · {{ row.detail }}</template
              ><template v-else
                >{{ row.date.slice(5).replace('-', '월 ') }}일 · {{ row.detail }}</template
              ><template v-if="row.occurrenceCount">
                · {{ row.occurrenceCount }}회 반복</template
              ></small
            ></span
          ><b>{{ row.originalAmount || `-${money(row.amount)}원` }}</b
          ><em v-if="mode !== 'detail'">{{ selected.includes(row.id) ? '✓' : '' }}</em>
        </button>
      </template>
    </section>
    <div v-if="mode === 'detail'" class="actions">
      <button @click="router.push({ name: 'fixedExpenseAdd' })">
        <strong>+ 고정지출 추가하기</strong></button
      ><button @click="router.push({ name: 'fixedExpenseDelete' })">
        <strong>- 고정지출 삭제하기</strong>
      </button>
    </div>
    <footer v-else>
      <button
        :disabled="!selected.length || financeState.loading || fixedApiLoading"
        @click="submit"
      >
        <strong>{{
          financeState.loading || fixedApiLoading
            ? '처리 중…'
            : mode === 'add'
              ? '고정지출 추가하기'
              : '고정지출 삭제하기'
        }}</strong>
      </button>
    </footer>
  </section>
</template>
<style scoped>
:global(body:has(.fixed-page)) {
  background-color: #f5f7f9;
  background-image: none;
}

.fixed-page {
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding-top: 18px;
  color: var(--text);
}
.month {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 11px;
  border: 0;
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-figma);
  color: var(--muted);
}
.month button {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  font-family: 'Pretendard', sans-serif !important;
  font-size: 18px !important;
  font-weight: 700 !important;
  line-height: 1;
}
.month button:hover {
  background: var(--primary-soft);
  color: var(--primary);
}
.month b {
  color: var(--text);
}
.total {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 16px;
  padding: 20px 22px;
  border: 0;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-figma);
}
.total span,
.total small {
  color: var(--muted);
  font-size: 12px;
}
.total strong {
  grid-column: 1/-1;
  font-size: 25px;
}
.suggest {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 5px 8px;
  margin-bottom: 18px;
  padding: 16px 20px;
  border-radius: 16px;
  background: var(--primary-soft);
}
.suggest > * {
  margin: 0;
}
.suggest > b {
  grid-column: 1/-1;
  width: max-content;
  padding: 5px 12px;
  border-radius: 16px;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
}
.suggest > strong {
  grid-column: 1/-1;
  font-size: 16px;
}
.suggest p {
  grid-column: 1 / -1;
  color: var(--muted);
  font-size: 13px;
}
.suggest button {
  grid-column: 1;
  justify-self: start;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  color: var(--muted);
  padding: 4px 16px;
  font-size: 14px;
  font-weight: 600 !important;
}
.suggest button:last-child {
  grid-column: 3;
  justify-self: end;
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
  font-weight: 600 !important;
}
.search {
  position: relative;
}
.search::before {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 15px;
  width: 7px;
  height: 7px;
  border: 1.5px solid var(--subtle);
  border-radius: 50%;
  content: '';
  pointer-events: none;
  transform: translateY(-65%);
}
.search::after {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 22px;
  width: 5px;
  height: 1.5px;
  background: var(--subtle);
  content: '';
  pointer-events: none;
  transform: translateY(3px) rotate(45deg);
  transform-origin: left center;
}
.search input {
  width: 100%;
  height: 58px;
  padding: 0 20px 0 36px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  box-sizing: border-box;
  box-shadow: none;
  font: inherit;
}
.selection-head {
  display: flex;
  justify-content: space-between;
  padding: 18px 6px 10px;
  font-size: 13px;
}
.selection-head .select-all-button {
  min-height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: var(--accent);
  color: var(--primary);
  box-shadow: var(--shadow-figma);
  font-size: 14px;
  font-weight: 700 !important;
}
.expense-list {
  padding: 18px 20px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-figma);
}
.empty-message {
  margin: 0;
  padding: 32px 12px;
  color: var(--muted);
  text-align: center;
  font-size: 13px;
}
.expense-list h2 {
  display: flex;
  gap: 7px;
  margin: 14px 0 7px;
  font-size: 15px;
}
.expense-list h2:first-child {
  margin-top: 0;
}
.expense-list h2 b {
  margin-left: auto;
  font-size: 15px;
}
.expense-list h2 span {
  color: var(--primary);
}
.expense-list > button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 11px 14px;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--surface);
  text-align: left;
  box-shadow: 0 2px 4px #0002;
}
.expense-list > button.chosen {
  border-color: rgb(10 22 128 / 14%);
  background: var(--primary-soft);
}
.expense-list i {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  font-style: normal;
}
.expense-list button span {
  display: grid;
}
.expense-list button strong {
  font-size: 14px;
}
.expense-list small {
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
}
.expense-list button > b {
  margin-left: auto;
  white-space: nowrap;
  font-size: 14px;
}
.expense-list em {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  flex: none;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--surface);
  color: #fff;
  line-height: 1;
  text-align: center;
  font-style: normal;
}
.expense-list .chosen em {
  border-color: var(--primary);
  background: var(--primary);
}
.actions,
footer {
  display: flex;
  gap: 16px;
  margin-top: 18px;
}
.actions button,
footer button {
  flex: 1;
  border: 0;
  border-radius: 12px;
  padding: 15px;
  font-size: 13px;
  font-weight: 700 !important;
}
.fixed-page .suggest button:last-child,
.fixed-page .selection-head .select-all-button,
.fixed-page .actions button,
.fixed-page footer button,
.fixed-page .suggest button:last-child strong,
.fixed-page .selection-head .select-all-button strong,
.fixed-page .actions button strong,
.fixed-page footer button strong {
  font-family: 'Pretendard', sans-serif !important;
  font-weight: 700 !important;
}
.actions button {
  box-shadow: var(--shadow-figma);
}
.fixed-page .suggest button,
.fixed-page .suggest button strong {
  font-size: 14px;
  font-weight: 600 !important;
}
.actions button:first-child,
footer button {
  background: var(--accent);
  color: var(--primary);
}
.actions button:last-child {
  background: #f2f4f6;
  color: var(--muted);
}
footer {
  display: block;
  padding: 0;
}
footer button {
  width: 100%;
  max-width: none;
}
footer button:disabled {
  opacity: 0.45;
}
.fixed-page--detail {
  max-width: 880px;
}
.fixed-page--detail .expense-list {
  margin-top: 18px;
}
@media (max-width: 767px) {
  .fixed-page {
    padding: 0 10px;
  }
  .month {
    padding: 12px;
    margin-bottom: 16px;
  }
  .total {
    padding: 16px;
    border-radius: 16px;
  }
  .total strong {
    font-size: 25px;
  }
  .suggest {
    display: grid;
    padding: 16px;
    margin-bottom: 14px;
  }
  .suggest > * {
    margin: 0;
  }
  .suggest button {
    margin-top: 5px;
  }
  .search input {
    height: 46px;
    font-size: 12px;
  }
  .selection-head {
    padding: 16px 0 8px;
    font-size: 12px;
  }
  .fixed-page .expense-list {
    border: 0;
    padding: 0 2px;
    box-shadow: none !important;
  }
  .expense-list h2 {
    font-size: 15px;
    line-height: 20px;
    margin: 28px 0 9px;
  }
  .expense-list h2:first-child {
    margin-top: 0;
  }
  .expense-list > button {
    min-height: 78px;
    margin-bottom: 10px;
    padding: 16px 22px;
    border-radius: 14px;
    box-shadow: 0 2px 4px #0002;
  }
  .expense-list > button:last-child {
    margin-bottom: 0;
  }
  .expense-list button strong,
  .expense-list button > b {
    font-size: 14px;
  }
  .expense-list small {
    font-size: 10px;
  }
  .actions {
    gap: 10px;
    margin: 12px 2px 0;
    padding: 2px 0 0;
    background: transparent;
  }
  .fixed-page--detail .expense-list {
    margin-top: 0;
  }
  .expense-list h2.category-subscription span {
    color: var(--text);
  }
  .expense-list h2.category-rent span {
    color: var(--accent-strong);
  }
  .expense-list h2.category-transport span {
    color: var(--danger);
  }
  .expense-list h2.category-other span {
    color: var(--subtle);
  }
  .expense-list > button.category-subscription i {
    background: var(--primary-soft);
    color: var(--primary);
  }
  .expense-list > button.category-rent i {
    background: var(--accent);
    color: var(--accent-strong);
  }
  .expense-list > button.category-transport i {
    background: var(--danger-soft);
    color: var(--danger);
  }
  .expense-list > button.category-other i {
    background: #f2f4f6;
    color: var(--subtle);
  }
  .actions button {
    padding: 15px 7px;
    font-size: 12px;
  }
  footer {
    margin: 10px 0 0;
    padding: 8px 0;
    background: transparent;
    font-size: 12px;
  }
  footer button {
    max-width: none;
    padding: 15px 8px;
  }
  .fixed-page--add .expense-list,
  .fixed-page--delete .expense-list {
    padding-bottom: 2px;
  }
}
</style>
