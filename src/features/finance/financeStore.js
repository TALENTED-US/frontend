import { computed, reactive } from 'vue'
import { transactions as seedTransactions } from '@/data/mockData'
import {
  createTransactionApi,
  deleteFixedExpenseApi,
  deleteTransactionApi,
  getFixedExpensesApi,
  getTransactionsApi,
  mapFixedExpenseResponse,
  mapTransactionResponse,
  registerFixedTransactionApi,
  updateTransactionApi,
  updateTransactionMemoApi,
} from '@/api/transactions'

const STORAGE_KEY = 'buttie-finance-v7'
const PREVIOUS_STORAGE_KEY = 'buttie-finance-v6'
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'
const storeToday = new Date()
const TODAY_KEY = [
  storeToday.getFullYear(),
  String(storeToday.getMonth() + 1).padStart(2, '0'),
  String(storeToday.getDate()).padStart(2, '0'),
].join('-')

const sampleTransactions = [
  { id: 101, date: '2026-07-16', time: '09:20', title: '급여', category: '수입', detail: '카카오뱅크', amount: 500000, memo: '급여', fixed: false },
  { id: 102, date: '2026-07-16', time: '12:10', title: '점심 식사', category: '식비', detail: '카드', amount: -12000, memo: '점심 식사', fixed: false },
  { id: 103, date: '2026-07-16', time: '15:30', title: '커피', category: '식비', detail: '카드', amount: -8000, memo: '커피', fixed: false },
  { id: 104, date: '2026-07-16', time: '18:10', title: '교통카드', category: '교통', detail: '대중교통', amount: -30000, memo: '교통카드', fixed: false },
  { id: 105, date: '2026-07-15', time: '08:20', title: '교통카드 정기권', category: '교통', detail: '티머니', amount: -55000, memo: '정기권', fixed: true },
  { id: 106, date: '2026-07-15', time: '22:10', title: '택시', category: '교통', detail: '카카오T', amount: -30000, memo: '택시', fixed: false },
  { id: 107, date: '2026-07-14', time: '10:00', title: '넷플릭스', category: '구독', detail: '넷플릭스', amount: -17000, memo: '넷플릭스', fixed: true },
  { id: 108, date: '2026-07-10', time: '07:00', title: '헬스장 이용권', category: '기타', detail: 'OO피트니스', amount: -89000, memo: '헬스장', fixed: true },
  { id: 109, date: '2026-07-05', time: '09:00', title: '실비보험', category: '보험', detail: '삼성화재', amount: -45000, memo: '실비보험', fixed: true },
  { id: 110, date: '2026-07-01', time: '08:00', title: '월세', category: '월세', detail: '한빛공인중개사', amount: -500000, memo: '월세', fixed: true },
  { id: 111, date: '2026-06-20', time: '11:00', title: '유튜브 프리미엄', category: '구독', detail: '구글', amount: -14900, memo: '유튜브 프리미엄', fixed: true },
]

function load() {
  let saved = null
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.seedDate === TODAY_KEY && Array.isArray(saved?.transactions)) return saved
  } catch {}
  if (!saved) {
    try {
      saved = JSON.parse(localStorage.getItem(PREVIOUS_STORAGE_KEY))
    } catch {}
  }
  const richSeed = seedTransactions.some((item) => item.time)
  const normalizedSeed = seedTransactions.map((item) => ({
    ...item,
    category: item.category === '급여' ? '수입' : item.category === '주거' ? '월세' : item.category,
    detail: item.detail || item.payment || '',
  }))
  const baseTransactions = richSeed ? normalizedSeed : sampleTransactions
  const userTransactions = Array.isArray(saved?.transactions)
    ? saved.transactions.filter((row) => Number(row.id) >= 1_000_000_000_000)
    : []
  return {
    transactions: [...baseTransactions, ...userTransactions],
    seedDate: TODAY_KEY,
  }
}

export const financeState = reactive(
  USE_MOCK_API
    ? { ...load(), loading: false, loaded: true, error: '' }
    : { transactions: [], seedDate: TODAY_KEY, loading: false, loaded: false, error: '' },
)
export const financeTransactions = computed(() => financeState.transactions)

export const fixedExpenseState = reactive({ items: [], loading: false, loaded: false, error: '' })
export const fixedExpenses = computed(() => fixedExpenseState.items)

export async function loadFixedExpenses(force = false) {
  if (USE_MOCK_API || (fixedExpenseState.loaded && !force)) return fixedExpenseState.items

  fixedExpenseState.loading = true
  fixedExpenseState.error = ''
  try {
    const rows = await getFixedExpensesApi()
    fixedExpenseState.items = Array.isArray(rows) ? rows.map(mapFixedExpenseResponse) : []
    fixedExpenseState.loaded = true
    return fixedExpenseState.items
  } catch (error) {
    fixedExpenseState.error = error.message || '고정지출 목록을 불러오지 못했습니다.'
    throw error
  } finally {
    fixedExpenseState.loading = false
  }
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ transactions: financeState.transactions, seedDate: TODAY_KEY }),
  )
}

export async function loadTransactions(force = false) {
  if (USE_MOCK_API || (financeState.loaded && !force)) return financeState.transactions

  financeState.loading = true
  financeState.error = ''
  try {
    const rows = await getTransactionsApi()
    financeState.transactions = Array.isArray(rows) ? rows.map(mapTransactionResponse) : []
    financeState.loaded = true
    return financeState.transactions
  } catch (error) {
    financeState.error = error.message || '거래 내역을 불러오지 못했습니다.'
    throw error
  } finally {
    financeState.loading = false
  }
}

export async function addTransaction(payload) {
  if (USE_MOCK_API) {
    financeState.transactions.push({ ...payload, id: Date.now(), fixed: false })
    persist()
    return
  }

  await createTransactionApi(payload)
  await loadTransactions(true)
}

export async function updateTransaction(id, payload) {
  if (USE_MOCK_API) {
    const item = financeState.transactions.find((row) => row.id === id)
    if (item) Object.assign(item, payload)
    persist()
    return
  }

  await updateTransactionApi(id, payload)
  await loadTransactions(true)
}

export async function updateTransactionMemo(id, memo) {
  const result = await updateTransactionMemoApi(id, memo)
  const nextMemo = result?.transactionMemo ?? memo
  const item = financeState.transactions.find((row) => row.id === id)
  if (item) item.memo = nextMemo
  return nextMemo
}

export async function deleteTransaction(id) {
  if (USE_MOCK_API) {
    financeState.transactions = financeState.transactions.filter((row) => row.id !== id)
    persist()
    return
  }

  await deleteTransactionApi(id)
  await loadTransactions(true)
}

export async function setFixed(ids, fixed) {
  if (!USE_MOCK_API) {
    financeState.loading = true
    financeState.error = ''
    try {
      if (fixed) {
        await Promise.all(ids.map((id) => registerFixedTransactionApi(id)))
      } else {
        await Promise.all(ids.map((id) => deleteFixedExpenseApi(id)))
      }
      await Promise.all([loadTransactions(true), loadFixedExpenses(true)])
      return true
    } catch (error) {
      financeState.error =
        error.message || (fixed ? '고정지출을 등록하지 못했습니다.' : '고정지출을 삭제하지 못했습니다.')
      return false
    } finally {
      financeState.loading = false
    }
  }

  financeState.transactions.forEach((row) => {
    if (ids.includes(row.id)) row.fixed = fixed
  })
  if (USE_MOCK_API) persist()
  return true
}

export function clearTransactions() {
  financeState.transactions = []
  financeState.loaded = USE_MOCK_API
  if (USE_MOCK_API) persist()
}
