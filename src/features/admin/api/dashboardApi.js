import { adminDashboardStats } from '@/features/admin/data/adminMockData'

const BASELINE_FROM = '2026-07-01'
const BASELINE_TO = '2026-07-23'
const MS_PER_DAY = 24 * 60 * 60 * 1000
const MIN_SCALE_FACTOR = 0.05
const MAX_SCALE_FACTOR = 15

function dayCount(from, to) {
  return Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / MS_PER_DAY) + 1
}

// '전체 기간'(빈 값)이면 베이스라인 총계를 그대로 사용, 실제 기간이 있으면 베이스라인(23일) 대비 일수 비율로 스케일링
function computeFlowScaleFactor(from, to) {
  if (!from || !to) return 1
  const days = Math.max(dayCount(from, to), 1)
  const factor = days / dayCount(BASELINE_FROM, BASELINE_TO)
  return Math.min(Math.max(factor, MIN_SCALE_FACTOR), MAX_SCALE_FACTOR)
}

function formatMetricValue(rawValue, unit) {
  if (unit === '%') return `${rawValue.toFixed(1)}%`
  return `${Math.round(rawValue).toLocaleString('ko-KR')}${unit}`
}

function scaleMetric(metric, factor) {
  const shouldScale = metric.scales && metric.unit !== '%'
  const scaledRaw = shouldScale ? metric.rawValue * factor : metric.rawValue
  return { ...metric, value: formatMetricValue(scaledRaw, metric.unit) }
}

function applyScaling(metricRows, factor) {
  return metricRows.map((row) => row.map((metric) => scaleMetric(metric, factor)))
}

// TODO: 백엔드 연동 시 이 함수 내부만 axios 호출로 교체 (컴포넌트는 수정 불필요)
// ex) return axios.get('/admin/dashboard/stats', { params: { from, to } }).then((res) => res.data)
export function getAdminDashboardStats({ from, to } = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const stats = structuredClone(adminDashboardStats)
      const factor = computeFlowScaleFactor(from, to)
      stats.metricRows = applyScaling(stats.metricRows, factor)
      stats.questMetricRow = stats.questMetricRow.map((metric) => scaleMetric(metric, factor))
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
