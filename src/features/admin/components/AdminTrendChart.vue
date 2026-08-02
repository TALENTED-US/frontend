<script setup>
import { computed } from 'vue'

const props = defineProps({
  labels: { type: Array, required: true },
  series: { type: Array, required: true },
})

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
</script>

<template>
  <div class="admin-trend-chart">
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
</template>

<style scoped>
.admin-trend-chart {
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
