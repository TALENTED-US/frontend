import { adminDashboardStats } from '@/features/admin/data/adminMockData'

// TODO: 백엔드 연동 시 이 함수 내부만 axios 호출로 교체 (컴포넌트는 수정 불필요)
// ex) return axios.get('/admin/dashboard/stats', { params: { from, to } }).then((res) => res.data)
export function getAdminDashboardStats({ from, to } = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const stats = structuredClone(adminDashboardStats)
      if (from) stats.range.from = from
      if (to) stats.range.to = to
      resolve(stats)
    }, 200)
  })
}

export function retryAdminOperationLog(logId) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ok: true, id: logId }), 200)
  })
}
