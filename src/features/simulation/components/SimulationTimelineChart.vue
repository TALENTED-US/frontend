<script setup>
import { computed } from 'vue'

const props = defineProps({
  assets: { type: Number, default: 3000000 },
  monthlyExpense: { type: Number, default: 800000 },
  monthlyIncome: { type: Number, default: 0 },
  targetMonths: { type: Number, default: 6 },
  currentMonths: { type: Number, default: 2.8 },
  expectedMonths: { type: Number, default: 0 },
  unknown: { type: Boolean, default: false },
  previewMode: { type: Boolean, default: false },
})

const scenarioMonths = computed(() => props.unknown ? '?' : Number(props.expectedMonths || props.currentMonths).toFixed(1))
const plotStartX = 58
const plotEndX = 558
const monthWidth = 50
const currentEndX = computed(() => Math.min(plotEndX, plotStartX + props.currentMonths * monthWidth))
const scenarioEndX = computed(() => {
  if (props.unknown || !props.expectedMonths) return 494
  return Math.min(plotEndX, plotStartX + props.expectedMonths * monthWidth)
})
const scenarioLabelX = computed(() => Math.min(430, Math.max(270, scenarioEndX.value - 90)))
const goalX = computed(() => Math.min(plotEndX, plotStartX + props.targetMonths * monthWidth))
const dangerY = computed(() => 218 - Math.min(1, 500000 / Math.max(1, props.assets)) * 188)
const assetLabels = computed(() => [1, .75, .5, .25].map((ratio) => `${Math.round(props.assets * ratio / 10000)}만`))
const burn = computed(() => Math.max(0, props.monthlyExpense))
const monthLabels = computed(() => {
  const today = new Date()
  return [0, 2, 4, 6, 8, 10].map((offset, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    return { x: 58 + index * 100, label: `${date.getMonth() + 1}월` }
  })
})
</script>

<template>
  <div :class="['timeline-chart', { 'is-preview': previewMode }]">
    <div class="timeline-chart__legend" aria-hidden="true">
      <span><i class="current" />현재 기준</span>
      <span><i class="scenario" />시나리오 적용</span>
      <span><i class="target" />목표 취업 시기</span>
      <span v-if="previewMode"><i class="minimum" />최소 생활자금</span>
    </div>
    <div class="timeline-chart__plot">
      <svg viewBox="0 0 600 260" role="img" aria-label="현재 기준과 시나리오 적용 후 월별 재정 타임라인">
        <defs>
          <linearGradient id="scenarioArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#8facf5" stop-opacity=".28" />
            <stop offset="1" stop-color="#8facf5" stop-opacity=".08" />
          </linearGradient>
        </defs>

        <g class="chart-grid">
          <path d="M58 30H572M58 82H572M58 134H572M58 186H572" />
        </g>
        <g class="y-axis">
          <text x="48" y="36">{{ assetLabels[0] }}</text><text x="48" y="88">{{ assetLabels[1] }}</text>
          <text x="48" y="140">{{ assetLabels[2] }}</text><text x="48" y="192">{{ assetLabels[3] }}</text><text x="48" y="224">0</text>
        </g>

        <path class="scenario-area" :d="`M58 30 L${scenarioEndX} 218 L58 218 Z`" />
        <path class="danger-threshold" :d="`M58 ${dangerY}H572`" />
        <text class="danger-label" x="568" :y="dangerY - 6">위험 잔액 50만</text>
        <path class="goal-line" :d="`M${goalX} 18V218`" />

        <path class="current-line" :d="`M58 30L${currentEndX} 218`" />
        <circle class="current-dot" :cx="currentEndX" cy="218" r="5" />
        <path class="scenario-line" :d="`M58 30L${scenarioEndX} 218`" />
        <circle class="scenario-dot" :cx="scenarioEndX" cy="218" r="5" />

        <g class="current-badge" transform="translate(126 145)">
          <rect width="126" height="34" rx="17" />
          <text x="63" y="22">현재 {{ currentMonths }}개월</text>
        </g>
        <g class="scenario-badge" :transform="`translate(${scenarioLabelX} 48)`">
          <rect width="132" height="34" rx="17" />
          <text x="66" y="22">시나리오 {{ scenarioMonths }}개월</text>
        </g>
        <text v-if="unknown" class="question" x="305" y="132">?</text>
        <text class="burn-label" x="58" y="15">직전 3개월 월평균 지출 {{ Math.round(burn / 10000) }}만원</text>

        <g class="x-axis">
          <text v-for="item in monthLabels" :key="item.x" :x="item.x" y="244">{{ item.label }}</text>
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.timeline-chart { margin-top: 10px; }
.timeline-chart__legend { display: flex; flex-wrap: wrap; gap: 18px; color: #6f7890; font-size: 12px; }
.timeline-chart__legend span { display: inline-flex; align-items: center; gap: 7px; }
.timeline-chart__legend i { width: 9px; height: 9px; border-radius: 50%; background: #06178f; }
.timeline-chart__legend .scenario { background: #8facf5; }
.timeline-chart__legend .target { background: #f4b63c; }
.timeline-chart__legend .minimum { width: 18px; height: 0; border-top: 2px dashed #ef6464; border-radius: 0; background: transparent; }
.timeline-chart__plot { width: 100%; margin-top: 8px; overflow: hidden; border: 1px solid #e2e6ef; border-radius: 15px; background: #fbfcff; }
svg { width: 100%; height: auto !important; }
.chart-grid path { fill: none; stroke: #e4e9f2; stroke-width: 1; }
.y-axis text, .x-axis text { fill: #8da0bf; font-size: 13px; }
.y-axis text { text-anchor: end; }
.x-axis text { text-anchor: middle; }
.scenario-area { fill: url(#scenarioArea) !important; }
.current-line { fill: none; stroke: #06178f; stroke-width: 3; stroke-dasharray: 7 5; }
.scenario-line { fill: none; stroke: #8facf5; stroke-width: 4; }
.current-dot { fill: #06178f; }.scenario-dot { fill: #8facf5; }
.goal-line { fill: none; stroke: #f4b63c; stroke-width: 3; }
.danger-threshold { fill: none; stroke: #ef6464; stroke-width: 2; stroke-dasharray: 5 5; }
.danger-label { fill: #647086; font-size: 12px; text-anchor: end; }
.burn-label { fill: #647086; font-size: 11px; }
.current-badge rect { fill: #06178f; }.scenario-badge rect { fill: #8facf5; }
.current-badge text, .scenario-badge text { fill: white; font-size: 13px; font-weight: 800; text-anchor: middle; }
.question { fill: #111; font-size: 48px; font-weight: 900; text-anchor: middle; }
.timeline-chart.is-preview { display: flex; flex-direction: column; }
.timeline-chart.is-preview .timeline-chart__plot { order: 1; }
.timeline-chart.is-preview .timeline-chart__legend { order: 2; margin-top: 12px; }
.timeline-chart.is-preview .timeline-chart__legend .current { background: #999; }
.timeline-chart.is-preview .timeline-chart__legend .target { background: #12249f; }
.timeline-chart.is-preview .current-line { stroke: #999; stroke-width: 3; }
.timeline-chart.is-preview .current-dot { fill: #999; }
.timeline-chart.is-preview .goal-line { stroke: #12249f; }
.timeline-chart.is-preview .current-badge rect { fill: #999; }
.timeline-chart.is-preview .danger-label { display: none; }
@media (max-width: 767px) {
  .timeline-chart__legend { gap: 10px 14px; font-size: 11px; }
  .timeline-chart__plot { border-radius: 12px; }
  .y-axis text, .x-axis text { font-size: 15px; }
  .current-badge text, .scenario-badge text { font-size: 15px; }
  .danger-label { font-size: 14px; }
}
</style>
