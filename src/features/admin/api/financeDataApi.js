import { adminFinanceDataByUser, adminFinanceDatasets } from '@/features/admin/data/adminMockData'

function pushHistory(user, { item, action, summary }) {
  user.history.unshift({
    id: Date.now(),
    target: user.userId,
    item,
    action,
    summary,
    actor: '관리자 김재준',
    at: new Date().toISOString(),
  })
}

// TODO: 백엔드 연동 시 이 함수들 내부만 axios 호출로 교체 (컴포넌트는 수정 불필요)
export function getAdminFinanceDatasets() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(adminFinanceDatasets)), 100)
  })
}

export function findAdminFinanceUser(keyword) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const normalized = keyword.trim().toLowerCase()
      const match = Object.values(adminFinanceDataByUser).find((user) =>
        [user.userId, user.email, user.nickname].some((value) => value.toLowerCase().includes(normalized)),
      )
      if (!match) {
        reject(new Error('user not found'))
        return
      }
      resolve(structuredClone(match))
    }, 200)
  })
}

export function applyAdminFinanceDataset(userId, datasetKey) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = adminFinanceDataByUser[userId]
      if (user) user.datasetKey = datasetKey
      resolve({ ok: true })
    }, 200)
  })
}

export function createAdminFinanceAccount(userId, account) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = adminFinanceDataByUser[userId]
      const record = { id: `acc-${Date.now()}`, status: 'normal', ...account }
      user.accounts.push(record)
      pushHistory(user, { item: `${record.bank} ${record.type}`, action: 'create', summary: `신규 계좌 등록 (${record.balance.toLocaleString()}원)` })
      resolve(structuredClone(record))
    }, 200)
  })
}

export function createAdminFinanceCard(userId, card) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = adminFinanceDataByUser[userId]
      const record = { id: `card-${Date.now()}`, status: 'normal', ...card }
      user.cards.push(record)
      pushHistory(user, { item: record.issuer, action: 'create', summary: `신규 카드 등록 (한도 ${record.limit.toLocaleString()}원)` })
      resolve(structuredClone(record))
    }, 200)
  })
}

export function createAdminFinanceTransaction(userId, transaction) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = adminFinanceDataByUser[userId]
      const record = { id: `txn-${Date.now()}`, ...transaction }
      user.transactions.unshift(record)
      const sign = record.amount >= 0 ? '+' : ''
      pushHistory(user, { item: record.merchant, action: 'create', summary: `신규 거래 등록 (${sign}${record.amount.toLocaleString()}원)` })
      resolve(structuredClone(record))
    }, 200)
  })
}

export function updateAdminFinanceRecord(userId, listKey, recordId, patch) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = adminFinanceDataByUser[userId]
      const record = user[listKey].find((item) => item.id === recordId)
      if (!record) {
        reject(new Error('record not found'))
        return
      }
      Object.assign(record, patch)
      pushHistory(user, { item: record.bank || record.issuer || record.merchant, action: 'update', summary: '정보 수정' })
      resolve(structuredClone(record))
    }, 200)
  })
}

export function deleteAdminFinanceRecord(userId, listKey, recordId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = adminFinanceDataByUser[userId]
      const record = user[listKey].find((item) => item.id === recordId)
      user[listKey] = user[listKey].filter((item) => item.id !== recordId)
      if (record) {
        pushHistory(user, { item: record.bank || record.issuer || record.merchant, action: 'delete', summary: '삭제 처리' })
      }
      resolve({ ok: true })
    }, 200)
  })
}

export function resolveAdminFinanceDuplicate(userId, transactionId, action) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = adminFinanceDataByUser[userId]
      const transaction = user.transactions.find((item) => item.id === transactionId)
      if (action === 'duplicate') {
        user.transactions = user.transactions.filter((item) => item.id !== transactionId)
        if (transaction) pushHistory(user, { item: transaction.merchant, action: 'delete', summary: '중복 거래 삭제 (검수 승인)' })
      } else if (transaction) {
        transaction.duplicateSuspect = false
        delete transaction.duplicateOf
        pushHistory(user, { item: transaction.merchant, action: 'update', summary: '중복 의심 해제 (등록 허용)' })
      }
      resolve({ ok: true })
    }, 200)
  })
}

export function getAdminFinanceHistory(userId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = adminFinanceDataByUser[userId]
      resolve(structuredClone(user?.history || []))
    }, 150)
  })
}
