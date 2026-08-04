import { adminFinanceDataByUser, adminFinancePersonaDatasets } from '@/features/admin/data/adminMockData'

// TODO: 백엔드 연동 시 이 함수들 내부만 axios 호출로 교체 (컴포넌트는 수정 불필요)
export function getAdminFinancePersonaDatasets() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(adminFinancePersonaDatasets)), 100)
  })
}

export function createAdminFinancePersonaDataset(payload = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const record = {
        key: `dataset-${Date.now()}`,
        name: '새 데이터 세트',
        description: '',
        accountCount: 0,
        cardCount: 0,
        transactionCount: 0,
        ...payload,
      }
      adminFinancePersonaDatasets.push(record)
      resolve(structuredClone(record))
    }, 150)
  })
}

export function duplicateAdminFinancePersonaDataset(key) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const source = adminFinancePersonaDatasets.find((dataset) => dataset.key === key)
      if (!source) {
        reject(new Error('dataset not found'))
        return
      }
      const copy = { ...structuredClone(source), key: `${source.key}-copy-${Date.now()}`, name: `${source.name} (복사본)` }
      adminFinancePersonaDatasets.splice(adminFinancePersonaDatasets.indexOf(source) + 1, 0, copy)
      resolve(structuredClone(copy))
    }, 150)
  })
}

export function deleteAdminFinancePersonaDataset(key) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = adminFinancePersonaDatasets.findIndex((dataset) => dataset.key === key)
      if (index !== -1) adminFinancePersonaDatasets.splice(index, 1)
      resolve({ ok: true })
    }, 150)
  })
}

export function getAdminFinancePersonaDataset(key) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const dataset = adminFinancePersonaDatasets.find((item) => item.key === key)
      if (!dataset) {
        reject(new Error('dataset not found'))
        return
      }
      resolve(structuredClone(dataset))
    }, 100)
  })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function countKeyForType(type) {
  return { account: 'accountCount', card: 'cardCount', transaction: 'transactionCount' }[type]
}

export function createAdminFinanceDatasetRecord(datasetKey, payload) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const dataset = adminFinancePersonaDatasets.find((item) => item.key === datasetKey)
      if (!dataset) {
        reject(new Error('dataset not found'))
        return
      }
      const record = { id: `rec-${Date.now()}`, status: 'normal', ...payload }
      dataset.records.push(record)
      dataset[countKeyForType(record.type)] += 1
      dataset.updatedAt = today()
      resolve(structuredClone(record))
    }, 150)
  })
}

export function updateAdminFinanceDatasetRecord(datasetKey, recordId, payload) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const dataset = adminFinancePersonaDatasets.find((item) => item.key === datasetKey)
      const record = dataset?.records.find((item) => item.id === recordId)
      if (!record) {
        reject(new Error('record not found'))
        return
      }
      Object.assign(record, payload)
      dataset.updatedAt = today()
      resolve(structuredClone(record))
    }, 150)
  })
}

export function deleteAdminFinanceDatasetRecord(datasetKey, recordId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const dataset = adminFinancePersonaDatasets.find((item) => item.key === datasetKey)
      if (!dataset) {
        reject(new Error('dataset not found'))
        return
      }
      const record = dataset.records.find((item) => item.id === recordId)
      dataset.records = dataset.records.filter((item) => item.id !== recordId)
      if (record) {
        dataset[countKeyForType(record.type)] -= 1
        dataset.updatedAt = today()
      }
      resolve({ ok: true })
    }, 150)
  })
}

export function assignAdminFinanceDatasetMember(datasetKey, keyword) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const dataset = adminFinancePersonaDatasets.find((item) => item.key === datasetKey)
      const normalized = keyword.trim().toLowerCase()
      const user = Object.values(adminFinanceDataByUser).find((item) =>
        [item.userId, item.email, item.nickname].some((value) => value.toLowerCase().includes(normalized)),
      )
      if (!dataset || !user) {
        reject(new Error('member not found'))
        return
      }
      if (!dataset.appliedMembers.some((member) => member.userId === user.userId)) {
        dataset.appliedMembers.push({ userId: user.userId, email: user.email, nickname: user.nickname, appliedAt: today(), updatedAt: today() })
      }
      resolve(structuredClone(dataset.appliedMembers))
    }, 150)
  })
}

export function reassignAdminFinanceDatasetMember(datasetKey, userId, targetDatasetKey) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const dataset = adminFinancePersonaDatasets.find((item) => item.key === datasetKey)
      const targetDataset = adminFinancePersonaDatasets.find((item) => item.key === targetDatasetKey)
      const member = dataset?.appliedMembers.find((item) => item.userId === userId)
      if (!dataset || !targetDataset || !member) {
        reject(new Error('member or dataset not found'))
        return
      }
      dataset.appliedMembers = dataset.appliedMembers.filter((item) => item.userId !== userId)
      targetDataset.appliedMembers.push({ ...member, appliedAt: today(), updatedAt: today() })
      resolve({ ok: true })
    }, 150)
  })
}

export function removeAdminFinanceDatasetMember(datasetKey, userId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const dataset = adminFinancePersonaDatasets.find((item) => item.key === datasetKey)
      if (!dataset) {
        reject(new Error('dataset not found'))
        return
      }
      dataset.appliedMembers = dataset.appliedMembers.filter((item) => item.userId !== userId)
      resolve({ ok: true })
    }, 150)
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

export function getAdminFinanceHistory(userId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = adminFinanceDataByUser[userId]
      resolve(structuredClone(user?.history || []))
    }, 150)
  })
}
