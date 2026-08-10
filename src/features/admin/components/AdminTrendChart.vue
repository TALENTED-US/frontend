<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps({
  labels: { type: Array, required: true },
  series: { type: Array, required: true },
})

const scrollWrap = ref(null)

const PX_PER_LABEL = 90
const chartWidth = computed(() => `${Math.max(props.labels.length * PX_PER_LABEL, 100)}px`)

// 지표들이 전체 회원 수 > 마이데이터 연결 > 시뮬레이션 생성 수 > 계획 확정 순으로
// 항상 크기 차이가 나는 게 자연스러운 값들이라, 공유 축을 써서 그 크기 순서가
// 그래프에도 그대로 보이게 한다.
const bounds = computed(() => {
  const values = props.series.flatMap((line) => line.data)
  return { min: Math.min(...values), max: Math.max(...values) }
})

function toPoints(data) {
  const { min, max } = bounds.value
  const range = max - min || 1
  return data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = 100 - ((value - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')
}

function scrollToLatest() {
  if (scrollWrap.value) scrollWrap.value.scrollLeft = scrollWrap.value.scrollWidth
}

onMounted(scrollToLatest)
watch(() => props.labels, scrollToLatest)
</script>

<template>
  <div ref="scrollWrap" class="admin-trend-chart">
    <div class="admin-trend-chart__inner" :style="{ width: chartWidth }">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="admin-trend-chart__svg">
        <polyline
          v-for="line in series"
          :key="line.key"
          :points="toPoints(line.data)"
          fill="none"
          :stroke="line.color"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <div class="admin-trend-chart__labels">
        <span v-for="label in labels" :key="label">{{ label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-trend-chart {
  overflow-x: auto;
}

.admin-trend-chart__inner {
  display: grid;
  gap: 8px;
}

.admin-trend-chart__svg {
  width: 100%;
  height: 190px;
}

.admin-trend-chart__labels {
  display: flex;
  justify-content: space-between;
  color: var(--subtle);
  font-size: 11px;
}
</style>
