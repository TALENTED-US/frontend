import { computed, reactive } from 'vue'
import { transactions as seedTransactions } from '@/data/mockData'

const STORAGE_KEY = 'buttie-finance-v2'

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
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (Array.isArray(saved?.transactions)) return saved
  } catch {}
  const richSeed = seedTransactions.some((item) => item.time)
  const normalizedSeed = seedTransactions.map((item) => ({
    ...item,
    category: item.category === '급여' ? '수입' : item.category === '주거' ? '월세' : item.category,
    detail: item.detail || item.payment || '',
  }))
  return { transactions: richSeed ? normalizedSeed : sampleTransactions }
}

export const financeState = reactive(load())
export const financeTransactions = computed(() => financeState.transactions)

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions: financeState.transactions }))
}

export function addTransaction(payload) {
  financeState.transactions.push({ ...payload, id: Date.now(), fixed: false })
  persist()
}

export function updateTransaction(id, payload) {
  const item = financeState.transactions.find((row) => row.id === id)
  if (item) Object.assign(item, payload)
  persist()
}

export function deleteTransaction(id) {
  financeState.transactions = financeState.transactions.filter((row) => row.id !== id)
  persist()
}

export function setFixed(ids, fixed) {
  financeState.transactions.forEach((row) => {
    if (ids.includes(row.id)) row.fixed = fixed
  })
  persist()
}
