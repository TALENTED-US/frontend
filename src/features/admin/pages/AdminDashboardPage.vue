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
      <div class="admin-dashboard__range-box">
        <h2 class="admin-dashboard__range-title">조회 기간</h2>
        <div class="admin-dashboard__range-inputs">
          <input v-model="fromDate" type="date" />
          <span class="admin-dashboard__range-sep">~</span>
          <input v-model="toDate" type="date" />
        </div>
        <div class="admin-dashboard__presets">
          <button type="button" @click="applyPreset('all')">전체 기간</button>
          <button type="button" @click="applyPreset('year')">올해</button>
          <button type="button" @click="applyPreset('month')">이번달</button>
        </div>
        <button type="button" class="admin-dashboard__reset" @click="applyPreset('all')">
          초기화
        </button>
        <button type="button" class="admin-dashboard__apply" @click="loadStats">조회</button>
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
            <p v-for="(caption, idx) in metric.captions" :key="idx" class="admin-card__caption">
              {{ caption }}
            </p>
          </article>
        </div>
      </div>

       <div class="admin-dashboard__metric-rows">
        <div class="admin-dashboard__metrics admin-dashboard__metrics--pair">
          <article
            v-for="metric in stats.questMetricRow"
            :key="metric.key"
            class="admin-card"
          >
            <div class="admin-card__head">
              <p class="admin-card__label">{{ metric.label }}</p>
              <p v-if="metric.note" class="admin-card__note">{{ metric.note }}</p>
            </div>

            <p
              class="admin-card__value"
              :style="{ color: metric.color }"
            >
              {{ metric.value }}
            </p>

            <p
              v-for="(caption, idx) in metric.captions"
              :key="idx"
              class="admin-card__caption"
            >
              {{ caption }}
            </p>
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
            <p v-for="(caption, idx) in metric.captions" :key="idx" class="admin-card__caption">
              {{ caption }}
            </p>
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
.admin-dashboard {
  font-family: 'Pretendard', sans-serif;
}

.admin-dashboard button,
.admin-dashboard input,
.admin-dashboard select,
.admin-dashboard textarea {
  font-family: inherit;
}

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
  color: #333333;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
}

.admin-dashboard__range-box {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 760px;
  padding: 14px 20px;
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  background: #ffffff;
}

.admin-dashboard__range-box > * {
  flex-shrink: 0;
}

.admin-dashboard__range-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-dashboard__range input {
  width: 148px;
  padding: 10px 14px;
  border: 1px solid #e1e1e1;
  border-radius: 8px;
  color: #222222;
  font-size: 14px;
}

.admin-dashboard__range-sep {
  color: #999999;
}

.admin-dashboard__presets {
  display: flex;
  gap: 8px;
}

.admin-dashboard__presets button {
  padding: 10px 18px;
  border: 0;
  border-radius: 999px;
  background: #fbedb0;
  color: #4a4a4a;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.admin-dashboard__presets button:hover {
  background: #f5e29a;
}

.admin-dashboard__reset {
  margin-left: auto;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: #999999;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.admin-dashboard__apply {
  padding: 12px 32px;
  border: 0;
  border-radius: 12px;
  background: #fcb01d;
  color: #1a1a1a;
  font-size: 14px;
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
  font-size: calc(var(--font-caption) + 1px);
  font-weight: 600;
}

.admin-dashboard__metrics .admin-card__note {
  flex-shrink: 0;
  max-width: 55%;
  color: #999999;
  font-size: 11px;
  text-align: right;
}

.admin-dashboard__metrics .admin-card__value {
  margin-top: 6px;
  font-size: 21px;
}

.admin-dashboard__metrics .admin-card__caption {
  margin-top: 4px;
  font-size: 12px;
}

.admin-dashboard__metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.admin-dashboard__metrics--pair {
  grid-template-columns: repeat(2, 1fr);
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
  font-size: calc(var(--font-card-title) + 1px);
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
  font-size: calc(var(--font-small) + 1px);
}

.admin-dashboard__log-main small {
  color: #999999;
  font-size: calc(var(--font-caption) + 1px);
}

.admin-dashboard__log-row time {
  font-size: calc(var(--font-caption) + 1px);
}

.admin-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  margin-left: auto;
  width: 88px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: #93b2f8;
  color: #222222;
  font-family: 'Pretendard', sans-serif;
  font-size: 12px;
  font-weight: 700;
}

.admin-dashboard__retry:disabled {
  opacity: 0.6;
}

.admin-dashboard__all-logs {
  display: block;
  margin-top: 14px;
  color: #666666;
  font-size: calc(var(--font-caption) + 1px);
  font-weight: 700;
  text-align: center;
}
</style>
