import {
  adminPolicies,
  adminPolicyHistory,
  adminPolicyReviewQueue,
} from '@/features/admin/data/adminMockData'

// TODO: 백엔드 연동 시 이 함수들 내부만 axios 호출로 교체 (컴포넌트는 수정 불필요)
export function getAdminPolicies({ keyword = '', category = 'all', region = 'all', status = 'all' } = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const normalized = keyword.trim().toLowerCase()
      const items = adminPolicies.filter((policy) => {
        const matchesKeyword = !normalized || policy.name.toLowerCase().includes(normalized)
        const matchesCategory = category === 'all' || policy.category === category
        const matchesRegion = region === 'all' || policy.region === region
        const matchesStatus = status === 'all' || policy.status === status
        return matchesKeyword && matchesCategory && matchesRegion && matchesStatus
      })
      resolve(structuredClone(items))
    }, 200)
  })
}

export function getAdminPolicy(policyId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const policy = adminPolicies.find((item) => item.id === policyId)
      if (!policy) {
        reject(new Error('policy not found'))
        return
      }
      resolve(structuredClone(policy))
    }, 150)
  })
}

export function createAdminPolicy(payload) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const record = { id: `pol-${Date.now()}`, source: 'manual', recommendStatus: 'active', ...payload }
      adminPolicies.unshift(record)
      adminPolicyHistory.unshift({
        id: Date.now(),
        at: new Date().toISOString(),
        summary: `${record.name} 신규 등록 (관리자 김재준)`,
        type: 'manual',
      })
      resolve(structuredClone(record))
    }, 200)
  })
}

export function updateAdminPolicy(policyId, payload) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const policy = adminPolicies.find((item) => item.id === policyId)
      if (!policy) {
        reject(new Error('policy not found'))
        return
      }
      Object.assign(policy, payload)
      adminPolicyHistory.unshift({
        id: Date.now(),
        at: new Date().toISOString(),
        summary: `${policy.name} 정보 수정 (관리자 김재준)`,
        type: 'manual',
      })
      resolve(structuredClone(policy))
    }, 200)
  })
}

export function deleteAdminPolicy(policyId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = adminPolicies.findIndex((item) => item.id === policyId)
      if (index !== -1) adminPolicies.splice(index, 1)
      resolve({ ok: true })
    }, 200)
  })
}

export function setAdminPolicyRecommendStatus(policyId, recommendStatus) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const policy = adminPolicies.find((item) => item.id === policyId)
      if (!policy) {
        reject(new Error('policy not found'))
        return
      }
      policy.recommendStatus = recommendStatus
      resolve(structuredClone(policy))
    }, 200)
  })
}

export function getAdminPolicyHistory() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(adminPolicyHistory)), 150)
  })
}

export function getAdminPolicyReviewQueue() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(adminPolicyReviewQueue)), 150)
  })
}

export function setPolicyReviewExcluded(reviewId, excluded) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const item = adminPolicyReviewQueue.find((entry) => entry.id === reviewId)
      if (item) item.excludedFromRecommend = excluded
      resolve({ ok: true })
    }, 150)
  })
}
