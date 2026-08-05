<script setup>
import { onMounted, ref } from 'vue'
import { getAdminDashboardStats, retryAdminOperationLog } from '@/features/admin/api/dashboardApi'
import AdminTrendChart from '@/features/admin/components/AdminTrendChart.vue'

const loading = ref(true)
const stats = ref(null)
const fromDate = ref('')
const toDate = ref('')

function todayStr() {
  const today = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
}

async function loadStats() {
  loading.value = true
  stats.value = await getAdminDashboardStats({ from: fromDate.value, to: toDate.value })
  fromDate.value = stats.value.range.from
  toDate.value = stats.value.range.to
  loading.value = false
}

function applyPreset(preset) {
  const today = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  if (preset === 'all') {
    fromDate.value = ''
    toDate.value = ''
  } else if (preset === 'year') {
    fromDate.value = `${today.getFullYear()}-01-01`
    toDate.value = todayStr()
  } else if (preset === 'month') {
    fromDate.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`
    toDate.value = todayStr()
  }
  loadStats()
}

async function retryLog(log) {
  log.retrying = true
  await retryAdminOperationLog(log.id)
  log.retrying = false
  log.status = 'success'
  log.retryable = false
}

onMounted(loadStats)
</script>

<template>
  <section class="admin-dashboard">
    <header class="admin-dashboard__header">
      <h1>관리자 대시보드</h1>
      <p>기간별 서비스 현황과 주요 운영 지표를 확인하세요.</p>
    </header>

    <form class="admin-dashboard__range" @submit.prevent>
      <h2 class="admin-dashboard__range-title">조회 기간</h2>
      <div class="admin-dashboard__range-box">
        <div class="admin-dashboard__presets">
          <button type="button" @click="applyPreset('all')">전체 기간</button>
          <button type="button" @click="applyPreset('year')">올해</button>
          <button type="button" @click="applyPreset('month')">이번달</button>
        </div>
        <div class="admin-dashboard__range-inputs">
          <input v-model="fromDate" type="date" />
          <span class="admin-dashboard__range-sep">~</span>
          <input v-model="toDate" type="date" />
        </div>
        <button type="button" class="admin-dashboard__reset" @click="applyPreset('all')">초기화</button>
        <button type="button" class="admin-dashboard__apply" @click="loadStats">적용</button>
      </div>
    </form>

    <template v-if="stats">
      <div class="admin-dashboard__metric-rows">
        <div
          v-for="(row, rowIndex) in stats.metricRows"
          :key="rowIndex"
          class="admin-dashboard__metrics"
          :class="{ 'admin-dashboard__metrics--pair': row.length === 2 }"
        >
          <article v-for="metric in row" :key="metric.key" class="admin-card">
            <div class="admin-card__head">
              <p class="admin-card__label">{{ metric.label }}</p>
              <p v-if="metric.note" class="admin-card__note">{{ metric.note }}</p>
            </div>
            <p class="admin-card__value" :style="{ color: metric.color }">{{ metric.value }}</p>
            <p v-for="(caption, idx) in metric.captions" :key="idx" class="admin-card__caption">{{ caption }}</p>
          </article>
        </div>
      </div>

      <div class="admin-dashboard__panels-wrap">
        <div class="admin-dashboard__panels">
          <article class="admin-card admin-card--trend">
            <h2>전체 회원·마이데이터 연결·시뮬레이션 생성·계획 확정 추이</h2>
            <ul class="admin-dashboard__legend">
              <li v-for="line in stats.trend.series" :key="line.key">
                <i :style="{ background: line.color }" />{{ line.label }}
              </li>
            </ul>
            <AdminTrendChart :labels="stats.trend.labels" :series="stats.trend.series" />
          </article>

          <article class="admin-card admin-card--logs">
            <h2>최근 운영 현황</h2>
            <ul class="admin-dashboard__logs">
              <li v-for="log in stats.operationLogs" :key="log.id">
                <div class="admin-dashboard__log-row">
                  <div class="admin-dashboard__log-main">
                    <p>{{ log.title }}</p>
                    <small v-if="log.reason">{{ log.reason }}</small>
                  </div>
                  <span :class="['admin-badge', `admin-badge--${log.status}`]">
                    {{ log.status === 'success' ? '성공' : '실패' }}
                  </span>
                  <time>{{ log.time }}</time>
                </div>
                <button
                  v-if="log.retryable"
                  type="button"
                  class="admin-dashboard__retry"
                  :disabled="log.retrying"
                  @click="retryLog(log)"
                >
                  재실행
                </button>
              </li>
            </ul>
            <RouterLink to="/admin/finance-data/history" class="admin-dashboard__all-logs">
              전체 운영 로그 보기 →
            </RouterLink>
          </article>
        </div>
      </div>

      <div class="admin-dashboard__metric-rows">
        <div class="admin-dashboard__metrics admin-dashboard__metrics--pair">
          <article v-for="metric in stats.questMetricRow" :key="metric.key" class="admin-card">
            <div class="admin-card__head">
              <p class="admin-card__label">{{ metric.label }}</p>
              <p v-if="metric.note" class="admin-card__note">{{ metric.note }}</p>
            </div>
            <p class="admin-card__value" :style="{ color: metric.color }">{{ metric.value }}</p>
            <p v-for="(caption, idx) in metric.captions" :key="idx" class="admin-card__caption">{{ caption }}</p>
          </article>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.admin-dashboard__header h1 {
  color: #222222;
  font-size: var(--font-page-title);
  font-weight: 800;
}

.admin-dashboard__header p {
  margin-top: 6px;
  color: #666666;
  font-size: var(--font-body);
}

.admin-dashboard__range {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  overflow-x: auto;
}

.admin-dashboard__range-title {
  color: #222222;
  font-size: var(--font-card-title);
  font-weight: 800;
  white-space: nowrap;
}

.admin-dashboard__range-box {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 640px;
  padding: 16px 24px;
  border: 1px solid #e1e1e1;
  border-radius: var(--radius-md);
  background: var(--surface);
}

.admin-dashboard__range-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-dashboard__range input {
  padding: 8px 12px;
  border: 1px solid #e1e1e1;
  border-radius: var(--radius-sm);
  color: #222222;
  font-size: var(--font-small);
}

.admin-dashboard__range-sep {
  color: #666666;
}

.admin-dashboard__presets {
  display: flex;
  gap: 8px;
}

.admin-dashboard__presets button {
  padding: 8px 14px;
  border: 1px solid #e1e1e1;
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: #666666;
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-dashboard__presets button:hover {
  color: #222222;
  background: var(--canvas);
}

.admin-dashboard__reset {
  margin-left: auto;
  padding: 10px 16px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: #666666;
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-dashboard__apply {
  padding: 10px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  background: #f1b94c;
  color: #222222;
  font-size: var(--font-small);
  font-weight: 700 !important;
  white-space: nowrap;
}

.admin-dashboard__metric-rows {
  display: grid;
  gap: 16px;
  margin-top: 24px;
  overflow-x: auto;
}

.admin-dashboard__metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  min-width: 900px;
}

.admin-dashboard__metrics--pair {
  grid-template-columns: repeat(2, 1fr);
  min-width: 600px;
}

.admin-dashboard__metrics .admin-card {
  padding: 14px 16px;
}

.admin-dashboard__metrics .admin-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.admin-dashboard__metrics .admin-card__label {
  color: #222222;
  font-size: var(--font-caption);
  font-weight: 600;
}

.admin-dashboard__metrics .admin-card__note {
  flex-shrink: 0;
  max-width: 55%;
  color: #999999;
  font-size: 10px;
  text-align: right;
}

.admin-dashboard__metrics .admin-card__value {
  margin-top: 6px;
  font-size: 20px;
}

.admin-dashboard__metrics .admin-card__caption {
  margin-top: 4px;
  font-size: 11px;
}

.admin-card {
  padding: 20px 24px;
  border: 1px solid #e1e1e1;
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-figma);
}

.admin-card__label {
  color: #666666;
  font-size: var(--font-small);
}

.admin-card__value {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 800;
}

.admin-card__caption {
  margin-top: 8px;
  color: #666666;
  font-size: var(--font-caption);
}

.admin-dashboard__panels-wrap {
  margin-top: 16px;
  overflow-x: auto;
}

.admin-dashboard__panels {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 16px;
  min-width: 960px;
}

.admin-card--trend h2,
.admin-card--logs h2 {
  color: #222222;
  font-size: var(--font-card-title);
  font-weight: 800;
}

.admin-dashboard__legend {
  display: flex;
  gap: 14px;
  margin: 10px 0 16px;
  color: #666666;
  font-size: var(--font-caption);
}

.admin-dashboard__legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.admin-dashboard__legend i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.admin-dashboard__logs {
  display: grid;
  gap: 4px;
  margin-top: 14px;
}

.admin-dashboard__logs li {
  padding: 12px 0;
  border-top: 1px solid #e1e1e1;
  font-size: var(--font-caption);
}

.admin-dashboard__logs li:first-child {
  border-top: 0;
}

.admin-dashboard__log-row {
  display: grid;
  grid-template-columns: 1fr 60px 76px;
  align-items: center;
  gap: 10px;
}

.admin-dashboard__log-main p {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.admin-dashboard__log-main p {
  color: #222222;
  font-size: var(--font-small);
}

.admin-dashboard__log-main small {
  color: #999999;
}

.admin-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.admin-badge--success {
  background: var(--success-soft);
  color: #44d795;
}

.admin-badge--fail {
  background: var(--danger-soft);
  color: #f0574f;
}

.admin-dashboard__retry {
  display: block;
  margin-top: 8px;
  margin-left: auto;
  padding: 4px 10px;
  border: 0;
  border-radius: 6px;
  background: #93b2f8;
  color: #222222;
  font-size: 11px;
  font-weight: 700;
}

.admin-dashboard__retry:disabled {
  opacity: 0.6;
}

.admin-dashboard__all-logs {
  display: block;
  margin-top: 14px;
  color: #666666;
  font-size: var(--font-caption);
  font-weight: 700;
  text-align: center;
}

</style>
