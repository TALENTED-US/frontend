<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentMonths: { type: Number, default: 0 },
  expectedMonths: { type: Number, default: 0 },
  targetMonths: { type: Number, default: 0 },
  description: { type: String, default: '확정한 계획이 현재 자금의 유지 기간을 얼마나 늘리는지 확인하세요.' },
})

const spreadTimelineLabels = (items) => {
  const sorted = [...items].sort((a, b) => a.position - b.position)
  const hasCollision = sorted.some((item, index) => index > 0 && item.position - sorted[index - 1].position < 22)
  if (!hasCollision) return items.map((item) => ({ ...item, lane: 0, placement: 'below', offset: 18 }))

  const placementById = { now: 'below', 'current-limit': 'above', scenario: 'below', target: 'above' }
  const lastPositionByPlacement = { above: [], below: [] }
  const layout = new Map()

  sorted.forEach((item) => {
    const placement = placementById[item.id] || 'below'
    const placementLanes = lastPositionByPlacement[placement]
    let lane = placementLanes.findIndex((last) => item.position - last >= 22)
    if (lane < 0) lane = placementLanes.length
    placementLanes[lane] = item.position
    const offset = placement === 'above' ? -108 - lane * 54 : 18 + lane * 58
    layout.set(item.id, { lane, placement, offset })
  })

  return items.map((item) => ({ ...item, ...layout.get(item.id) }))
}

const timelineItems = computed(() => {
  const current = Math.max(0, Number(props.currentMonths) || 0)
  const expected = Math.max(current, Number(props.expectedMonths) || 0)
  const target = Math.max(0, Math.ceil(Number(props.targetMonths) || 0))
  const scale = Math.max(current, expected, target, 1)
  const position = (value) => Math.min(96, Math.max(4, (value / scale) * 92 + 4))
  const sameDuration = current === expected

  return spreadTimelineLabels([
    { id: 'now', label: '현재', value: '지금', position: 4, tone: 'current' },
    { id: 'current-limit', label: sameDuration ? '현재 자금 · 계획 적용 후' : '현재 자금 기준', value: `${current}개월`, position: position(current), tone: sameDuration ? 'scenario' : 'limit' },
    ...(!sameDuration ? [{ id: 'scenario', label: '계획 적용 후', value: `${expected}개월`, position: position(expected), tone: 'scenario', staggered: true }] : []),
    ...(target ? [{ id: 'target', label: '취업 목표', value: `${target}개월`, position: position(target), tone: 'target' }] : []),
  ])
})
</script>

<template>
  <article class="confirmed-financial-timeline sim-card sim-timeline">
    <h2>월별 재정 타임라인</h2>
    <p class="confirmed-timeline-description">{{ description }}</p>
    <div class="confirmed-timeline-track" role="list" aria-label="시뮬레이션 재정 주요 시점">
      <div class="confirmed-timeline-track__line" />
      <div v-for="item in timelineItems" :key="item.id" class="confirmed-timeline-marker" :class="[`confirmed-timeline-marker--${item.tone}`, `label-placement-${item.placement}`, `label-lane-${item.lane}`]" :style="{ left: `${item.position}%`, '--timeline-label-offset': `${item.offset}px` }" role="listitem">
        <i />
        <div class="confirmed-timeline-marker__copy"><strong>{{ item.value }}</strong><span>{{ item.label }}</span></div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.confirmed-financial-timeline{width:100%}.confirmed-timeline-description{margin-top:6px;color:#6b7684;font-size:14px}.confirmed-timeline-track{position:relative;height:245px;margin:174px 18px 0}.confirmed-timeline-track__line{position:absolute;top:34px;right:0;left:0;height:7px;border-radius:999px;background:linear-gradient(90deg,var(--primary),#8facf5 68%,var(--accent-strong))}.confirmed-timeline-marker{position:absolute;top:14px;display:grid;width:46px;justify-items:center;gap:5px;transform:translateX(-50%);text-align:center}.confirmed-timeline-marker i{width:46px;height:46px;border:6px solid #fff;border-radius:50%;background:var(--primary);box-shadow:0 3px 10px rgb(10 22 128 / 20%)}.confirmed-timeline-marker__copy{position:absolute;top:calc(54px + var(--timeline-label-offset, 0px));left:50%;display:grid;width:max-content;max-width:150px;justify-items:center;gap:5px;text-align:center;transform:translateX(-50%)}.confirmed-timeline-marker__copy strong{grid-row:1;margin-top:4px;color:#191f28;font-size:16px}.confirmed-timeline-marker__copy span{grid-row:2;max-width:132px;color:#6b7684;font-size:13px;line-height:1.3}.confirmed-timeline-marker--scenario .confirmed-timeline-marker__copy strong{margin-top:0;font-size:18px;font-weight:800}.confirmed-timeline-marker--scenario .confirmed-timeline-marker__copy span{max-width:none;font-size:15px;font-weight:500;white-space:nowrap}.confirmed-timeline-marker.label-placement-above .confirmed-timeline-marker__copy strong{grid-row:2;margin-top:0}.confirmed-timeline-marker.label-placement-above .confirmed-timeline-marker__copy span{grid-row:1}.confirmed-timeline-marker--limit i{background:#8b95a1}.confirmed-timeline-marker--scenario i{background:#7e9de9}.confirmed-timeline-marker--target i{background:var(--accent-strong)}
@media(max-width:767px){.confirmed-timeline-description{font-size:13px;line-height:1.5}.confirmed-timeline-track{position:relative;display:block;height:145px;margin:90px 8px 0;padding:0}.confirmed-timeline-track__line{top:26px;right:0;bottom:auto;left:0;width:auto;height:5px;background:linear-gradient(90deg,var(--primary),#8facf5 68%,var(--accent-strong))}.confirmed-timeline-marker,.confirmed-timeline-marker:last-of-type{position:absolute;top:13px;display:grid;width:30px;max-width:none;justify-items:center;gap:3px;transform:translateX(-50%);text-align:center}.confirmed-timeline-marker i{z-index:1;width:30px;height:30px;border-width:4px}.confirmed-timeline-marker__copy,.confirmed-timeline-marker--current .confirmed-timeline-marker__copy,.confirmed-timeline-marker:last-of-type .confirmed-timeline-marker__copy,.confirmed-timeline-marker--scenario .confirmed-timeline-marker__copy{position:absolute;top:50px;right:auto;left:50%;display:grid;width:max-content;max-width:92px;justify-items:center;gap:3px;margin:0;text-align:center;transform:translateX(-50%)}.confirmed-timeline-marker.label-placement-above .confirmed-timeline-marker__copy{top:-42px}.confirmed-timeline-marker.label-placement-below.label-lane-1 .confirmed-timeline-marker__copy{top:88px}.confirmed-timeline-marker.label-placement-above.label-lane-1 .confirmed-timeline-marker__copy{top:-78px}.confirmed-timeline-marker__copy strong{grid-row:1;grid-column:auto;margin:0;font-size:12px}.confirmed-timeline-marker__copy span{grid-row:2;grid-column:auto;max-width:92px;font-size:11px;line-height:1.25}.confirmed-timeline-marker--scenario .confirmed-timeline-marker__copy strong{grid-row:1;font-size:14px}.confirmed-timeline-marker--scenario .confirmed-timeline-marker__copy span{grid-row:2;font-size:12px;white-space:nowrap}.confirmed-timeline-marker.label-placement-above .confirmed-timeline-marker__copy strong{grid-row:2}.confirmed-timeline-marker.label-placement-above .confirmed-timeline-marker__copy span{grid-row:1}}
</style>
