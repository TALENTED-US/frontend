import { computed, reactive } from 'vue'
import { transactions as seedTransactions } from '@/data/mockData'
import { normalizeExpenseCategoryLabel } from '@/constants/expenseCategories'
import {
  createTransactionApi,
  deleteTransactionApi,
  getTransactionsApi,
  mapTransactionResponse,
  registerFixedTransactionApi,
  unregisterFixedTransactionApi,
  updateTransactionApi,
} from '@/api/transactions'

const STORAGE_KEY = 'buttie-finance-v8'
const PREVIOUS_STORAGE_KEYS = ['buttie-finance-v7', 'buttie-finance-v6']
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'
const storeToday = new Date()
const TODAY_KEY = [
  storeToday.getFullYear(),
  String(storeToday.getMonth() + 1).padStart(2, '0'),
  String(storeToday.getDate()).padStart(2, '0'),
].join('-')

const sampleTransactions = [
  {
    id: 101,
    date: '2026-07-16',
    time: '09:20',
    title: '급여',
    category: '수입',
    detail: '카카오뱅크',
    amount: 500000,
    memo: '급여',
    fixed: false,
  },
  {
    id: 102,
    date: '2026-07-16',
    time: '12:10',
    title: '점심 식사',
    category: '식비',
    detail: '카드',
    amount: -12000,
    memo: '점심 식사',
    fixed: false,
  },
  {
    id: 103,
    date: '2026-07-16',
    time: '15:30',
    title: '커피',
    category: '식비',
    detail: '카드',
    amount: -8000,
    memo: '커피',
    fixed: false,
  },
  {
    id: 104,
    date: '2026-07-16',
    time: '18:10',
    title: '교통카드',
    category: '교통',
    detail: '대중교통',
    amount: -30000,
    memo: '교통카드',
    fixed: false,
  },
  {
    id: 105,
    date: '2026-07-15',
    time: '08:20',
    title: '교통카드 정기권',
    category: '교통',
    detail: '티머니',
    amount: -55000,
    memo: '정기권',
    fixed: true,
  },
  {
    id: 106,
    date: '2026-07-15',
    time: '22:10',
    title: '택시',
    category: '교통',
    detail: '카카오T',
    amount: -30000,
    memo: '택시',
    fixed: false,
  },
  {
    id: 107,
    date: '2026-07-14',
    time: '10:00',
    title: '넷플릭스',
    category: '구독',
    detail: '넷플릭스',
    amount: -17000,
    memo: '넷플릭스',
    fixed: true,
  },
  {
    id: 108,
    date: '2026-07-10',
    time: '07:00',
    title: '헬스장 이용권',
    category: '기타',
    detail: 'OO피트니스',
    amount: -89000,
    memo: '헬스장',
    fixed: true,
  },
  {
    id: 109,
    date: '2026-07-05',
    time: '09:00',
    title: '실비보험',
    category: '보험',
    detail: '삼성화재',
    amount: -45000,
    memo: '실비보험',
    fixed: true,
  },
  {
    id: 110,
    date: '2026-07-01',
    time: '08:00',
    title: '월세',
    category: '월세',
    detail: '한빛공인중개사',
    amount: -500000,
    memo: '월세',
    fixed: true,
  },
  {
    id: 111,
    date: '2026-06-20',
    time: '11:00',
    title: '유튜브 프리미엄',
    category: '구독',
    detail: '구글',
    amount: -14900,
    memo: '유튜브 프리미엄',
    fixed: true,
  },
]

function normalizeMockTransaction(row) {
  if (Number(row.amount) > 0 || row.category === '급여' || row.category === '수입') {
    return { ...row, category: '수입' }
  }
  return { ...row, category: normalizeExpenseCategoryLabel(row.category) }
}

function load() {
  let saved = null
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.seedDate === TODAY_KEY && Array.isArray(saved?.transactions)) {
      return { ...saved, transactions: saved.transactions.map(normalizeMockTransaction) }
    }
  } catch {}
  if (!saved) {
    for (const key of PREVIOUS_STORAGE_KEYS) {
      try {
        saved = JSON.parse(localStorage.getItem(key))
        if (saved) break
      } catch {}
    }
  }
  const richSeed = seedTransactions.some((item) => item.time)
  const normalizedSeed = seedTransactions.map((item) =>
    normalizeMockTransaction({ ...item, detail: item.detail || item.payment || '' }),
  )
  const baseTransactions = richSeed
    ? normalizedSeed
    : sampleTransactions.map(normalizeMockTransaction)
  const userTransactions = Array.isArray(saved?.transactions)
    ? saved.transactions
        .filter((row) => Number(row.id) >= 1_000_000_000_000)
        .map(normalizeMockTransaction)
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
      const updateFixed = fixed ? registerFixedTransactionApi : unregisterFixedTransactionApi
      await Promise.all(ids.map((id) => updateFixed(id)))
      await loadTransactions(true)
      return true
    } catch (error) {
      const failureMessage =
        error.message || `고정지출을 ${fixed ? '등록' : '해제'}하지 못했습니다.`
      try {
        await loadTransactions(true)
      } catch {
        // 일부 요청만 반영됐을 수 있으므로 재조회도 실패하면 기존 오류를 유지합니다.
      }
      financeState.error = failureMessage
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

export async function resetFixedTransactions() {
  if (USE_MOCK_API) {
    financeState.transactions.forEach((row) => {
      row.fixed = false
      if (row.transactionType === 'FIXED') row.transactionType = 'EXPENSE'
      if (row.detail === '고정지출') row.detail = '지출'
    })
    persist()
    return true
  }

  try {
    const transactions = await loadTransactions(true)
    const fixedIds = transactions.filter((row) => row.fixed).map((row) => row.id)
    if (fixedIds.length) {
      await Promise.all(fixedIds.map((id) => unregisterFixedTransactionApi(id)))
    }
    await loadTransactions(true)
    return true
  } catch (error) {
    financeState.error = error.message || '기존 고정지출을 초기화하지 못했습니다.'
    return false
  }
}

export function clearTransactions() {
  financeState.transactions = []
  financeState.loaded = USE_MOCK_API
  if (USE_MOCK_API) persist()
}
