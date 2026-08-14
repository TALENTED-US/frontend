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
const fixedCandidateCategories = new Set([
  '주거·통신',
  '교통·유류비',
  '취업 준비',
  '의료·건강',
  '기타 금융',
])
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
const fixedSourceRows = computed(() =>
  useFixedApi ? serverFixedRows.value : financeTransactions.value.filter((row) => row.fixed),
)
const fixedRows = computed(() =>
  fixedSourceRows.value.filter(
    (row) => row.fixed && row.amount < 0 && row.date.startsWith(fixedMonth.value),
  ),
)
const registeredFixedRows = computed(() => {
  const latestByRule = new Map()
  fixedSourceRows.value
    .filter((row) => row.fixed && row.amount < 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((row) => {
      const key = `${row.title}|${row.category}`
      const saved = latestByRule.get(key)
      if (saved) saved.fixedIds.push(row.id)
      else latestByRule.set(key, { ...row, fixedIds: [row.id] })
    })
  return [...latestByRule.values()]
})
const candidates = computed(() => {
  if (useFixedApi) {
    const keyword = query.value.trim()
    return serverCandidates.value
      .filter((row) => row.title.includes(keyword))
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
  }

  const recurringByRule = new Map()
  financeTransactions.value
    .filter((row) => row.amount < 0 && !row.fixed && fixedCandidateCategories.has(row.category))
    .forEach((row) => {
      const key = `${row.title}|${row.category}`
      const rows = recurringByRule.get(key) || []
      rows.push(row)
      recurringByRule.set(key, rows)
    })

  return [...recurringByRule.values()]
    .filter((rows) => rows.length >= 2)
    .map((rows) => {
      const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date))
      return {
        ...sorted[0],
        recurringIds: sorted.map((row) => row.id),
        occurrenceCount: sorted.length,
      }
    })
    .filter((row) => row.title.includes(query.value.trim()))
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount || b.date.localeCompare(a.date))
    .slice(0, 15)
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
  const categoryOrder = ['주거·통신', '교통·유류비', '취업 준비', '의료·건강', '기타 금융']
  visibleRows.value.forEach((row) => {
    ;(map[row.category] ||= []).push(row)
  })
  return Object.entries(map).sort(([a], [b]) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b))
})
function categoryClass(category) {
  return (
    {
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
  else fixedApiError.value = detailsResult.reason?.message || '고정지출 내역을 불러오지 못했습니다.'

  if (candidatesResult.status === 'fulfilled') {
    serverCandidates.value = (
      Array.isArray(candidatesResult.value) ? candidatesResult.value : []
    ).map(
      (row) => {
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
      },
    )
  } else if (!fixedApiError.value) {
    fixedApiError.value =
      candidatesResult.reason?.message || '고정지출 후보를 불러오지 못했습니다.'
  }
  if (summaryResult.status === 'fulfilled') serverFixedSummary.value = summaryResult.value
  fixedApiLoading.value = false
}
async function submit() {
  let saved
  if (mode.value === 'delete') {
    const fixedIds = registeredFixedRows.value
      .filter((row) => selected.value.includes(row.id))
      .flatMap((row) => row.fixedIds)
    saved = await setFixed(fixedIds, false)
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
        {{ mode === 'delete' ? '삭제할 고정지출이 없어요.' : '표시할 거래가 없어요.' }}
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
      <button :disabled="!selected.length || financeState.loading || fixedApiLoading" @click="submit">
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
.fixed-page {
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding-top: 18px;
  color: #222;
}
.month {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 11px;
  border: 0;
  border-radius: 14px;
  box-shadow: var(--shadow-figma);
  color: #475569;
}
.month button {
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
.month button:hover {
  background: #f0f2f7;
}
.month b {
  color: #222222;
}
.total {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 16px;
  padding: 20px 22px;
  border: 0;
  border-radius: 18px;
  box-shadow: var(--shadow-figma);
}
.total span,
.total small {
  color: #666;
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
  background: #e8efff;
}
.suggest > * {
  margin: 0;
}
.suggest > b {
  grid-column: 1/-1;
  width: max-content;
  padding: 5px 12px;
  border-radius: 16px;
  background: #93b2f8;
  color: #fff;
  font-size: 13px;
}
.suggest > strong {
  grid-column: 1/-1;
  font-size: 16px;
}
.suggest p {
  grid-column: 1 / -1;
  color: #666;
  font-size: 13px;
}
.suggest button {
  grid-column: 1;
  justify-self: start;
  border: 1px solid #d9dce3;
  border-radius: 20px;
  background: #fff;
  padding: 4px 16px;
  font-size: 14px;
  font-weight: 600 !important;
}
.suggest button:last-child {
  grid-column: 3;
  justify-self: end;
  border-color: #93b2f8;
  background: #93b2f8;
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
  border: 1.5px solid #8b8f98;
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
  background: #8b8f98;
  content: '';
  pointer-events: none;
  transform: translateY(3px) rotate(45deg);
  transform-origin: left center;
}
.search input {
  width: 100%;
  height: 58px;
  padding: 0 20px 0 36px;
  border: 1px solid #d9dce3;
  border-radius: 14px;
  background: #fff;
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
  background: #fcf2c8;
  box-shadow: var(--shadow-figma);
  font-size: 14px;
  font-weight: 700 !important;
}
.expense-list {
  padding: 18px 20px;
  border: 1px solid #d9dce3;
  border-radius: 18px;
  box-shadow: 0 2px 4px #0002;
}
.empty-message {
  margin: 0;
  padding: 32px 12px;
  color: #666;
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
  color: #8e7cc3;
}
.expense-list > button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 11px 14px;
  border: 1px solid #d9dce3;
  border-radius: 13px;
  background: #fff;
  text-align: left;
  box-shadow: 0 2px 4px #0002;
}
.expense-list > button.chosen {
  background: #fff5c8;
}
.expense-list i {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 50%;
  background: #f0f1fa;
  color: #8e7cc3;
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
  color: #666;
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
  border: 1px solid #cfd4df;
  border-radius: 50%;
  background: #fff;
  color: #fff;
  line-height: 1;
  text-align: center;
  font-style: normal;
}
.expense-list .chosen em {
  border-color: #ffb21c;
  background: #ffb21c;
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
  background: #ffeda7;
}
.actions button:last-child {
  background: #eee;
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
    color: #222;
  }
  .expense-list h2.category-rent span {
    color: #f4cf63;
  }
  .expense-list h2.category-transport span {
    color: #f49a9a;
  }
  .expense-list h2.category-other span {
    color: #94a3b8;
  }
  .expense-list > button.category-subscription i {
    background: #eef0f7;
    color: #343a46;
  }
  .expense-list > button.category-rent i {
    background: #fff4d5;
    color: #e7ad21;
  }
  .expense-list > button.category-transport i {
    background: #fff0f0;
    color: #ef5350;
  }
  .expense-list > button.category-other i {
    background: #eef1f5;
    color: #8290a5;
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
