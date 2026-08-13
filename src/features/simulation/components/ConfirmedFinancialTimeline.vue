<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentMonths: { type: Number, default: 0 },
  expectedMonths: { type: Number, default: 0 },
  targetMonths: { type: Number, default: 0 },
  description: { type: String, default: '확정한 계획이 현재 자금의 유지 기간을 얼마나 늘리는지 확인하세요.' },
})

const timelineItems = computed(() => {
  const current = Math.max(0, Number(props.currentMonths) || 0)
  const expected = Math.max(current, Number(props.expectedMonths) || 0)
  const target = Math.max(0, Math.ceil(Number(props.targetMonths) || 0))
  const scale = Math.max(current, expected, target, 1)
  const position = (value) => `${Math.min(96, Math.max(4, (value / scale) * 92 + 4))}%`
  const sameDuration = current === expected

  return [
    { id: 'now', label: '현재', value: '지금', position: '4%', tone: 'current' },
    { id: 'current-limit', label: sameDuration ? '현재 자금 · 계획 적용 후' : '현재 자금 기준', value: `${current}개월`, position: position(current), tone: sameDuration ? 'scenario' : 'limit' },
    ...(!sameDuration ? [{ id: 'scenario', label: '계획 적용 후', value: `${expected}개월`, position: position(expected), tone: 'scenario', staggered: true }] : []),
    ...(target ? [{ id: 'target', label: '취업 목표', value: `${target}개월`, position: position(target), tone: 'target' }] : []),
  ]
})
</script>

<template>
  <article class="confirmed-financial-timeline sim-card sim-timeline">
    <h2>월별 재정 타임라인</h2>
    <p class="confirmed-timeline-description">{{ description }}</p>
    <div class="confirmed-timeline-track" role="list" aria-label="시뮬레이션 재정 주요 시점">
      <div class="confirmed-timeline-track__line" />
      <div v-for="item in timelineItems" :key="item.id" class="confirmed-timeline-marker" :class="[`confirmed-timeline-marker--${item.tone}`, { 'is-staggered': item.staggered }]" :style="{ left: item.position }" role="listitem">
        <i />
        <div class="confirmed-timeline-marker__copy"><strong>{{ item.value }}</strong><span>{{ item.label }}</span></div>
      </div>
    </div>
    <p class="confirmed-timeline-note">직전 3개월 월평균 기준 · 계획 적용 후 {{ expectedMonths }}개월</p>
  </article>
</template>

<style scoped>
.confirmed-financial-timeline{width:100%}.confirmed-timeline-description{margin-top:6px;color:#6b7684;font-size:14px}.confirmed-timeline-track{position:relative;height:150px;margin:34px 18px 0}.confirmed-timeline-track__line{position:absolute;top:34px;right:0;left:0;height:7px;border-radius:999px;background:linear-gradient(90deg,var(--primary),#8facf5 68%,var(--accent-strong))}.confirmed-timeline-marker{position:absolute;top:14px;display:grid;width:max-content;max-width:130px;justify-items:center;gap:5px;transform:translateX(-50%);text-align:center}.confirmed-timeline-marker--current{transform:translateX(0)}.confirmed-timeline-marker:last-of-type{transform:translateX(-100%)}.confirmed-timeline-marker i{width:46px;height:46px;border:6px solid #fff;border-radius:50%;background:var(--primary);box-shadow:0 3px 10px rgb(10 22 128 / 20%)}.confirmed-timeline-marker__copy{display:grid;justify-items:center;gap:5px}.confirmed-timeline-marker.is-staggered .confirmed-timeline-marker__copy{margin-top:48px}.confirmed-timeline-marker__copy strong{margin-top:4px;color:#191f28;font-size:16px}.confirmed-timeline-marker__copy span{max-width:112px;color:#6b7684;font-size:13px;line-height:1.3}.confirmed-timeline-marker--limit i{background:#8b95a1}.confirmed-timeline-marker--scenario i{background:#7e9de9}.confirmed-timeline-marker--target i{background:var(--accent-strong)}.confirmed-timeline-note{margin-top:6px;color:#6b7684;font-size:13px;text-align:center}
@media(max-width:767px){.confirmed-timeline-description{font-size:13px;line-height:1.5}.confirmed-timeline-track{display:grid;height:auto;gap:14px;margin:22px 0 8px;padding-left:2px}.confirmed-timeline-track__line{top:18px;right:auto;bottom:18px;left:22px;width:5px;height:auto;background:linear-gradient(180deg,var(--primary),#8facf5 68%,var(--accent-strong))}.confirmed-timeline-marker,.confirmed-timeline-marker:last-of-type{position:relative;top:auto;left:auto!important;display:grid;width:100%;max-width:none;grid-template-columns:46px minmax(0,1fr) auto;align-items:center;justify-items:start;gap:12px;transform:none;text-align:left}.confirmed-timeline-marker i{z-index:1;grid-row:1;grid-column:1;width:44px;height:44px}.confirmed-timeline-marker__copy,.confirmed-timeline-marker.is-staggered .confirmed-timeline-marker__copy{display:grid;width:100%;grid-row:1;grid-column:2/4;grid-template-columns:minmax(0,1fr) auto;align-items:center;justify-items:start;gap:12px;margin:0}.confirmed-timeline-marker__copy strong{grid-column:2;margin:0;font-size:15px}.confirmed-timeline-marker__copy span{grid-row:1;grid-column:1;max-width:none;font-size:14px}.confirmed-timeline-note{margin-top:14px;font-size:13px;text-align:left}}
</style>
