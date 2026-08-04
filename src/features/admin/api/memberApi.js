import { adminMemberSummary, adminMembers } from '@/features/admin/data/adminMockData'

// TODO: 백엔드 연동 시 이 함수들 내부만 axios 호출로 교체 (컴포넌트는 수정 불필요)
export function getAdminMemberSummary() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(adminMemberSummary)), 150)
  })
}

export function getAdminMembers({ keyword = '', status = 'all', joinedFrom = '', joinedTo = '', page = 1, pageSize = 20 } = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const normalizedKeyword = keyword.trim().toLowerCase()
      const filtered = adminMembers.filter((member) => {
        const matchesKeyword =
          !normalizedKeyword ||
          [member.id, member.email, member.nickname].some((value) => value.toLowerCase().includes(normalizedKeyword))
        const matchesStatus = status === 'all' || member.status === status
        const matchesFrom = !joinedFrom || member.joinedAt >= joinedFrom
        const matchesTo = !joinedTo || member.joinedAt <= joinedTo
        return matchesKeyword && matchesStatus && matchesFrom && matchesTo
      })
      const total = filtered.length
      const start = (page - 1) * pageSize
      resolve({
        items: structuredClone(filtered.slice(start, start + pageSize)),
        total,
        page,
        pageSize,
      })
    }, 200)
  })
}

export function getAdminMemberDetail(memberId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const member = adminMembers.find((item) => item.id === memberId)
      if (!member) {
        reject(new Error(`member not found: ${memberId}`))
        return
      }
      resolve(structuredClone(member))
    }, 150)
  })
}

export function updateAdminMemberStatus(memberId, { status, reason }) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const member = adminMembers.find((item) => item.id === memberId)
      if (!member) {
        reject(new Error(`member not found: ${memberId}`))
        return
      }
      member.status = status
      member.statusHistory = [{ status, reason, changedAt: new Date().toISOString() }, ...member.statusHistory]
      resolve(structuredClone(member))
    }, 200)
  })
}
