import {
  adminActiveLevel,
  adminLevels,
  adminLevelStats,
  adminQuestCategories,
  adminRewardErrors,
  adminRewardHistory,
} from '@/features/admin/data/adminMockData'

// TODO: 백엔드 연동 시 이 함수들 내부만 axios 호출로 교체 (컴포넌트는 수정 불필요)
export function getAdminLevelStats() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(adminLevelStats)), 150)
  })
}

export function getAdminLevels() {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ levels: structuredClone(adminLevels), activeLevel: adminActiveLevel }), 150)
  })
}

export function updateAdminLevelThresholds(levels) {
  return new Promise((resolve) => {
    setTimeout(() => {
      levels.forEach(({ level, exp }) => {
        const target = adminLevels.find((item) => item.level === level)
        if (target) target.exp = exp
      })
      resolve(structuredClone(adminLevels))
    }, 200)
  })
}

export function getAdminQuestCategories() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(adminQuestCategories)), 150)
  })
}

export function updateAdminQuestExp(categoryId, exp) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const category = adminQuestCategories.find((item) => item.id === categoryId)
      if (!category) {
        reject(new Error('category not found'))
        return
      }
      category.exp = exp
      resolve(structuredClone(category))
    }, 200)
  })
}

export function getAdminRewardHistory({ keyword = '', from = '', to = '', type = 'all' } = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const normalized = keyword.trim().toLowerCase()
      const items = adminRewardHistory.filter((entry) => {
        const matchesKeyword = !normalized || entry.member.toLowerCase().includes(normalized)
        const matchesType = type === 'all' || (type === 'grant' ? entry.delta > 0 : entry.delta < 0)
        const matchesFrom = !from || entry.at.slice(0, 10) >= from
        const matchesTo = !to || entry.at.slice(0, 10) <= to
        return matchesKeyword && matchesType && matchesFrom && matchesTo
      })
      resolve(structuredClone(items))
    }, 200)
  })
}

export function getAdminRewardErrors() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(adminRewardErrors)), 100)
  })
}

export function resolveAdminRewardError(errorId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = adminRewardErrors.findIndex((item) => item.id === errorId)
      if (index !== -1) adminRewardErrors.splice(index, 1)
      resolve(true)
    }, 100)
  })
}

export function submitManualReward({ member, exp, reason, action }) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const delta = action === 'grant' ? Math.abs(exp) : -Math.abs(exp)
      const entry = {
        id: Date.now(),
        at: new Date().toISOString(),
        member,
        reason,
        delta,
        actor: '관리자 김재준',
      }
      adminRewardHistory.unshift(entry)
      if (action === 'grant') adminLevelStats.grantCount += 1
      else adminLevelStats.revokeCount += 1
      resolve(structuredClone(entry))
    }, 200)
  })
}
