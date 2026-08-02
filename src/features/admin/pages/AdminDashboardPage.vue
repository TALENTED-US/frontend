<script setup>
import { onMounted, ref } from 'vue'
import { getAdminDashboardStats, retryAdminOperationLog } from '@/features/admin/api/dashboardApi'
import AdminTrendChart from '@/features/admin/components/AdminTrendChart.vue'

const loading = ref(true)
const stats = ref(null)
const fromDate = ref('')
const toDate = ref('')

async function loadStats() {
  loading.value = true
  stats.value = await getAdminDashboardStats({ from: fromDate.value, to: toDate.value })
  fromDate.value = stats.value.range.from
  toDate.value = stats.value.range.to
  loading.value = false
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

    <form class="admin-dashboard__range" @submit.prevent="loadStats">
      <label>
        조회 기간
        <input v-model="fromDate" type="date" />
      </label>
      <span class="admin-dashboard__range-sep">~</span>
      <label class="admin-dashboard__range-to">
        <input v-model="toDate" type="date" />
      </label>
      <button type="submit">통계 조회</button>
    </form>

    <template v-if="stats">
      <div class="admin-dashboard__metrics">
        <article v-for="metric in stats.metrics" :key="metric.key" class="admin-card">
          <p class="admin-card__label">{{ metric.label }}</p>
          <p :class="['admin-card__value', `admin-card__value--${metric.tone}`]">{{ metric.value }}</p>
          <p class="admin-card__caption">{{ metric.caption }}</p>
        </article>
      </div>

      <div class="admin-dashboard__panels">
        <article class="admin-card admin-card--trend">
          <h2>회원·연결·계획 확정 추이</h2>
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
              <div class="admin-dashboard__log-main">
                <p>{{ log.title }}</p>
                <small v-if="log.reason">{{ log.reason }}</small>
              </div>
              <span :class="['admin-badge', `admin-badge--${log.status}`]">
                {{ log.status === 'success' ? '성공' : '실패' }}
              </span>
              <time>{{ log.time }}</time>
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
    </template>
  </section>
</template>

<style scoped>
.admin-dashboard__header h1 {
  color: var(--text);
  font-size: var(--font-page-title);
  font-weight: 800;
}

.admin-dashboard__header p {
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--font-body);
}

.admin-dashboard__range {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding: 16px 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.admin-dashboard__range label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-dashboard__range input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: var(--font-small);
}

.admin-dashboard__range-sep {
  color: var(--muted);
}

.admin-dashboard__range button {
  margin-left: auto;
  padding: 10px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--primary);
  color: white;
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-dashboard__metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 24px;
}

.admin-card {
  padding: 20px 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-figma);
}

.admin-card__label {
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-card__value {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 800;
}

.admin-card__value--primary {
  color: #0a1680;
}

.admin-card__value--success {
  color: #22c55e;
}

.admin-card__caption {
  margin-top: 8px;
  color: var(--muted);
  font-size: var(--font-caption);
}

.admin-dashboard__panels {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.admin-card--trend h2,
.admin-card--logs h2 {
  color: var(--text);
  font-size: var(--font-card-title);
  font-weight: 800;
}

.admin-dashboard__legend {
  display: flex;
  gap: 14px;
  margin: 10px 0 16px;
  color: var(--muted);
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
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
  font-size: var(--font-caption);
}

.admin-dashboard__logs li:first-child {
  border-top: 0;
}

.admin-dashboard__log-main p {
  color: var(--text);
  font-size: var(--font-small);
}

.admin-dashboard__log-main small {
  color: var(--subtle);
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
  color: #22c55e;
}

.admin-badge--fail {
  background: var(--danger-soft);
  color: #ef4444;
}

.admin-dashboard__retry {
  padding: 4px 10px;
  border: 0;
  border-radius: 6px;
  background: var(--primary);
  color: white;
  font-size: 11px;
  font-weight: 700;
}

.admin-dashboard__retry:disabled {
  opacity: 0.6;
}

.admin-dashboard__all-logs {
  display: block;
  margin-top: 14px;
  color: var(--muted);
  font-size: var(--font-caption);
  font-weight: 700;
  text-align: center;
}

@media (max-width: 1100px) {
  .admin-dashboard__metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .admin-dashboard__panels {
    grid-template-columns: 1fr;
  }
}
</style>
