<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  currentMonths: { type: Number, default: 0 },
  expectedMonths: { type: Number, default: 0 },
  targetMonths: { type: Number, default: 0 },
  description: {
    type: String,
    default: '확정한 계획이 현재 자금의 유지 기간을 얼마나 늘리는지 확인하세요.',
  },
})

const fmt = (m) => `${Math.round(m * 10) / 10}개월`

const extensionMonths = computed(() => {
  const current = Math.max(0, Number(props.currentMonths) || 0)
  const expected = Math.max(current, Number(props.expectedMonths) || 0)
  return Math.round((expected - current) * 10) / 10
})

const points = computed(() => {
  const current = Math.max(0, Number(props.currentMonths) || 0)
  const expected = Math.max(current, Number(props.expectedMonths) || 0)
  const target = Math.max(0, Number(props.targetMonths) || 0)
  const sameDuration = current === expected

  const list = [
    { id: 'now', value: '현재', desc: '', months: 0, fill: '#A7B0C7', ring: '#FCFDFF' },
    {
      id: 'current-limit',
      value: fmt(current),
      desc: sameDuration ? '계획 적용 후' : '현재 자금 기준',
      months: current,
      fill: '#93B2F8',
      ring: '#FCFDFF',
    },
  ]
  if (!sameDuration) {
    list.push({
      id: 'scenario',
      value: fmt(expected),
      desc: '계획 적용 후',
      months: expected,
      fill: '#0A1680',
      ring: '#FCFDFF',
    })
  }
  if (target) {
    list.push({
      id: 'target',
      value: fmt(target),
      desc: '취업 목표',
      months: target,
      fill: '#FCFDFF',
      ring: '#0A1680',
    })
  }
  return list
})

const trackRef = ref(null)
const labelRefs = ref([])
const setLabelRef = (el, i) => {
  labelRefs.value[i] = el
}
const layout = ref(null)

const PAD = 12
const GAP = 16
const DOT_GAP = 28
const TIER0 = 40
const STEP = 46

const computeLayout = () => {
  const wrap = trackRef.value
  if (!wrap) return
  const W = wrap.clientWidth
  if (!W) return
  const pts = points.value
  const max = Math.max(...pts.map((p) => p.months), 1)
  const span = Math.max(W - PAD * 2, 1)

  const centers = pts.map((p) => PAD + (p.months / max) * span)
  for (let i = centers.length - 2; i >= 0; i--) {
    centers[i] = Math.max(PAD, Math.min(centers[i], centers[i + 1] - DOT_GAP))
  }

  const widths = pts.map((_, i) => labelRefs.value[i]?.offsetWidth || 70)
  const LABEL_H = 42

  const boxes = []
  pts.forEach((p, i) => {
    const w = widths[i]
    const left = Math.min(Math.max(centers[i] - w / 2, 0), Math.max(W - w, 0))
    let tier = 0
    while (
      boxes.some((b) => b.tier === tier && left < b.left + b.w + GAP && left + w > b.left - GAP)
    )
      tier += 1
    boxes.push({ tier, left, w, h: LABEL_H, center: centers[i] })
  })

  const CONNECTOR_TOP = 19
  const CONNECTOR_LABEL_GAP = 4
  const PATH_PAD = 6
  const CLUSTER_GAP = 32

  // Points whose dots sit almost on top of each other (e.g. current === expected,
  // or either value is 0) must read as one continuous line through both labels,
  // not just a line stopping at whichever label happens to be on tier 0.
  const clusterMaxTier = (() => {
    const n = boxes.length
    const adj = Array.from({ length: n }, () => [])
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        if (Math.abs(boxes[a].center - boxes[b].center) < CLUSTER_GAP) {
          adj[a].push(b)
          adj[b].push(a)
        }
      }
    }
    const visited = new Array(n).fill(false)
    const result = new Array(n).fill(0)
    for (let start = 0; start < n; start++) {
      if (visited[start]) continue
      const stack = [start]
      const comp = []
      visited[start] = true
      while (stack.length) {
        const cur = stack.pop()
        comp.push(cur)
        adj[cur].forEach((nb) => {
          if (!visited[nb]) {
            visited[nb] = true
            stack.push(nb)
          }
        })
      }
      const maxTier = Math.max(...comp.map((idx) => boxes[idx].tier))
      comp.forEach((idx) => {
        result[idx] = maxTier
      })
    }
    return result
  })()

  const segmentsFor = (i) => {
    const bi = boxes[i]
    const deepestTier = clusterMaxTier[i]
    if (deepestTier === 0) return []
    const bottomY = TIER0 + deepestTier * STEP - CONNECTOR_LABEL_GAP
    let segments = [[CONNECTOR_TOP, bottomY]]
    boxes.forEach((bj) => {
      const jTop = TIER0 + bj.tier * STEP
      const jBottom = jTop + bj.h
      if (bi.center < bj.left - PATH_PAD || bi.center > bj.left + bj.w + PATH_PAD) return
      const next = []
      segments.forEach(([s, e]) => {
        if (jBottom <= s || jTop >= e) {
          next.push([s, e])
          return
        }
        if (jTop > s) next.push([s, jTop])
        if (jBottom < e) next.push([jBottom, e])
      })
      segments = next
    })
    return segments.filter(([s, e]) => e - s > 2)
  }

  const maxTier = Math.max(...boxes.map((b) => b.tier))
  const out = boxes.map((b) => ({
    left: Math.round(b.left),
    top: TIER0 + b.tier * STEP,
    center: Math.round(b.center),
  }))
  const connectorSegments = boxes.map((_, i) =>
    segmentsFor(i).map(([s, e]) => ({ top: Math.round(s), height: Math.round(e - s) })),
  )

  layout.value = {
    centers,
    out,
    connectorSegments,
    height: TIER0 + maxTier * STEP + 44,
  }
}

let resizeObserver
onMounted(() => {
  nextTick(computeLayout)
  document.fonts?.ready?.then(computeLayout)
  resizeObserver = new ResizeObserver(() => computeLayout())
  if (trackRef.value) resizeObserver.observe(trackRef.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())
watch(points, () => nextTick(computeLayout))

const areaHeight = computed(() => (layout.value ? layout.value.height : 86) + 'px')
const dotLeft = (i) =>
  layout.value
    ? `${layout.value.centers[i]}px`
    : `${(points.value[i].months / Math.max(...points.value.map((p) => p.months), 1)) * 100}%`
const labelStyle = (i) => {
  const out = layout.value?.out[i]
  if (!out)
    return {
      top: `${TIER0}px`,
      left: `${(points.value[i].months / Math.max(...points.value.map((p) => p.months), 1)) * 100}%`,
      transform: 'translateX(-50%)',
    }
  return { top: `${out.top}px`, left: `${out.left}px`, transform: 'none' }
}
const connectors = computed(() => {
  if (!layout.value) return []
  const result = []
  layout.value.out.forEach((o, i) => {
    const segments = layout.value.connectorSegments[i] || []
    segments.forEach((seg, si) => {
      result.push({
        key: `${i}-${si}`,
        left: `${o.center}px`,
        top: `${seg.top}px`,
        height: `${seg.height}px`,
      })
    })
  })
  return result
})
</script>

<template>
  <article class="confirmed-financial-timeline sim-card sim-timeline">
    <h2>월별 재정 타임라인</h2>
    <p class="confirmed-timeline-description">
      계획을 실행하면 <strong>{{ extensionMonths }}개월 더</strong> 버틸 수 있어요.
    </p>
    <div
      ref="trackRef"
      class="confirmed-timeline-track"
      :style="{ height: areaHeight }"
      role="list"
      aria-label="시뮬레이션 재정 주요 시점"
    >
      <div class="confirmed-timeline-track__line" />

      <div
        v-for="c in connectors"
        :key="`connector-${c.key}`"
        class="confirmed-timeline-connector"
        :style="{ left: c.left, top: c.top, height: c.height }"
      />

      <div
        v-for="(p, i) in points"
        :key="p.id"
        class="confirmed-timeline-dot"
        :style="{ left: dotLeft(i), background: p.fill, borderColor: p.ring }"
      />

      <div
        v-for="(p, i) in points"
        :key="`label-${p.id}`"
        :ref="(el) => setLabelRef(el, i)"
        class="confirmed-timeline-marker__copy"
        :style="labelStyle(i)"
      >
        <strong>{{ p.value }}</strong>
        <span>{{ p.desc }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.confirmed-financial-timeline {
  width: 100%;
}
.confirmed-timeline-description {
  margin-top: 6px;
  color: #6b7684;
  font-size: 13px !important;
  font-weight: 400;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
.confirmed-timeline-description strong {
  font-weight: 600;
  color: #6b7684;
}
.confirmed-timeline-track {
  position: relative;
  margin: 40px 12px 0;
}
.confirmed-timeline-track__line {
  position: absolute;
  top: 7px;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, #cfd7ea 0%, #93b2f8 55%, #0a1680 100%);
}
.confirmed-timeline-connector {
  position: absolute;
  width: 1px;
  background: #cfd7ea;
  transform: translateX(-50%);
}
.confirmed-timeline-dot {
  position: absolute;
  top: 8.5px;
  width: 20px;
  height: 20px;
  margin-left: -10px;
  margin-top: -10px;
  border-radius: 50%;
  border: 3px solid #fcfdff;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(10, 22, 128, 0.16);
}
.confirmed-timeline-marker__copy {
  position: absolute;
  display: grid;
  justify-items: start;
  gap: 3px;
  width: max-content;
  max-width: 150px;
  white-space: nowrap;
}
.confirmed-timeline-marker__copy strong {
  color: #1a1d26;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.confirmed-timeline-marker__copy span {
  color: #767e92;
  font-size: 13px;
}

@media (max-width: 767px) {
  .confirmed-timeline-description {
    font-size: 14px !important;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  .confirmed-timeline-description strong {
    font-size: 15px !important;
  }
  .confirmed-timeline-track {
    margin: 32px 8px 0;
  }
  .confirmed-timeline-marker__copy strong {
    font-size: 14px;
  }
  .confirmed-timeline-marker__copy span {
    font-size: 13px;
  }
}
</style>
