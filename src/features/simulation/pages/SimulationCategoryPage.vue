<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const selected = ref([1])
const configs = {
  expense: {
    title: '지출 줄이기', color: '#8faefc', soft: '#eef3ff', gain: '+0.5개월', before: '3.8개월', after: '4.3개월',
    guide: '마이데이터 분석 기반 추천',
    items: [['식비 줄이기', '최근 3개월 식비가 평균보다 15% 높아요', '5만원'], ['넷플릭스 구독 취소하기', '월 고정비를 가볍게 줄여요', '2만원'], ['교통비 줄이기', '대중교통 이용을 최적화해요', '3만원']],
  },
  income: {
    title: '수입 늘리기', color: '#56d4a7', soft: '#e8faf4', gain: '+2.2개월', before: '3.8개월', after: '6개월',
    guide: '마이데이터 분석 기반 추천',
    items: [['아르바이트', '주말에 단기 알바를 구해보세요', '22만원'], ['과외', '과외 수요가 꾸준해요', '30만원'], ['기초생활 지원 요청하기', '생활비 부담을 낮출 수 있어요', '20만원']],
  },
  policy: {
    title: '정책 혜택', color: '#f6bd43', soft: '#fff8df', gain: '+5.2개월', before: '3.8개월', after: '9개월',
    guide: '자격 확인',
    items: [['청년내일저축계좌', '3년간 지원금을 받을 수 있어요', '월 60만원'], ['청년구직활동지원금', '구직활동 중인 청년 대상 지원금이에요', '월 30만원 × 6개월'], ['국민취업지원제도', '취업지원 서비스와 수당을 지원해요', '월 10만원 × 6개월']],
  },
  finance: {
    title: '금융상품', color: '#455ad3', soft: '#eef2ff', gain: '+57,500원', before: '400만원', after: '405.75만원',
    guide: '운용 가능 금액',
    items: [['토큰 정기예금', '목표 취업 시점까지 여유자금을 운용해요', '+40,000원'], ['청년 우대 적금', '매월 부담 없이 우대금리를 받아요', '+17,500원']],
  },
}
const config = computed(() => configs[route.params.category] || configs.expense)
const picked = computed(() => config.value.items.filter((_, index) => selected.value.includes(index + 1)))

function toggle(index) {
  selected.value = selected.value.includes(index) ? selected.value.filter((id) => id !== index) : [...selected.value, index]
}
</script>

<template>
  <section class="page category-page" :style="{ '--category': config.color, '--category-soft': config.soft }">
    <button class="category-back" @click="router.push('/simulation?mode=builder')">‹ {{ config.title }}</button>
    <p class="category-guide">▣ {{ config.guide }}</p><small>여러 항목을 선택하고 금액도 조절할 수 있어요.</small>
    <div class="category-layout">
      <main>
        <button v-for="(item, index) in config.items" :key="item[0]" :class="['category-item', { selected: selected.includes(index + 1) }]" @click="toggle(index + 1)">
          <span><small>{{ index + 1 }}순위</small><strong>{{ item[0] }}</strong><em>{{ item[1] }}</em></span><b>{{ item[2] }}</b><i>{{ selected.includes(index + 1) ? '✓' : '' }}</i>
        </button>
        <button class="add-item">+ 직접 항목 추가</button>
        <article class="picked card"><h2>선택한 항목 ({{ picked.length }}개)</h2><div v-for="item in picked" :key="item[0]"><span>▣ {{ item[0] }}</span><b>{{ item[2] }}</b></div><footer>총 예상 개선 <strong>{{ config.gain }}</strong></footer></article>
      </main>
      <aside class="preview card"><h2>▣ 미리보기</h2><span>예상 생존기간 변화</span><p><del>{{ config.before }}</del><b>→</b><strong>{{ config.after }}</strong></p><em>{{ config.gain }}</em><small>선택한 항목을 적용하면<br />생존기간이 늘어나요.</small></aside>
    </div>
    <div class="category-charts"><article class="card"><h2>시뮬레이션 적용 전후 비교</h2><div class="bars"><i /><i /><i /></div></article><article class="card"><h2>월별 재정 타임라인</h2><svg viewBox="0 0 400 130"><path d="M20 20 150 110" /><path class="after" d="M20 20 180 62 350 90" /></svg></article></div>
    <button class="apply-category" @click="router.push('/simulation?mode=builder')">이 항목을 적용하기</button>
  </section>
</template>

<style scoped>
.category-back { color: var(--primary); font-size: 15px; font-weight: 900; }
.category-guide { margin-top: 24px; color: var(--category); font-size: 11px; font-weight: 800; }
.category-page > small { color: #777; font-size: 9px; }
.category-layout { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 24px; margin-top: 10px; }
.category-layout main { display: grid; gap: 10px; }
.category-item { position: relative; display: grid; grid-template-columns: 1fr auto 25px; align-items: center; min-height: 82px; padding: 14px; border: 1px solid var(--border); border-radius: 12px; text-align: left; }
.category-item.selected { border: 2px solid var(--category); background: var(--category-soft); }
.category-item > span { display: grid; gap: 2px; }
.category-item small { width: fit-content; padding: 3px 9px; border-radius: 999px; background: var(--category-soft); color: var(--category); font-size: 8px; }
.category-item strong { color: var(--primary); font-size: 13px; }
.category-item em { color: #777; font-size: 8px; font-style: normal; }
.category-item > b { color: var(--primary); font-size: 11px; }
.category-item > i { display: grid; width: 20px; height: 20px; place-items: center; border-radius: 50%; background: var(--category); color: white; font-size: 9px; font-style: normal; }
.add-item { min-height: 42px; border: 1px solid var(--category); border-radius: 9px; color: var(--category); font-size: 10px; }
.picked { display: grid; gap: 9px; margin-top: 6px; padding: 16px; }
.picked h2, .preview h2, .category-charts h2 { color: var(--primary); font-size: 12px; }
.picked > div { display: flex; justify-content: space-between; color: var(--primary); font-size: 9px; }
.picked footer { display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid var(--border); color: #777; font-size: 9px; }
.picked footer strong { color: var(--primary); font-size: 12px; }
.preview { height: fit-content; padding: 20px; }
.preview > span, .preview > small { display: block; margin-top: 12px; color: #777; font-size: 9px; }
.preview p { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.preview del { color: #aaa; font-size: 15px; }
.preview strong { color: var(--category); font-size: 23px; }
.preview > em { display: block; margin-top: 17px; padding: 12px; border-radius: 9px; background: var(--category-soft); color: var(--category); text-align: right; font-size: 13px; font-style: normal; font-weight: 800; }
.category-charts { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 22px; }
.category-charts article { min-height: 180px; padding: 18px; }
.bars { display: flex; height: 100px; align-items: end; justify-content: space-around; }
.bars i { width: 28px; height: 45px; background: var(--category-soft); }
.bars i:nth-child(2) { height: 70px; background: var(--category); }
.category-charts svg { width: 100%; height: 120px; }
.category-charts path { fill: none; stroke: var(--primary); stroke-width: 2; stroke-dasharray: 5 4; }
.category-charts .after { stroke: var(--category); stroke-dasharray: none; }
.apply-category { width: 100%; min-height: 43px; margin-top: 18px; border-radius: 9px; background: var(--sky); color: var(--primary); font-size: 11px; font-weight: 800; }

@media (max-width: 767px) {
  .category-layout { grid-template-columns: 1fr; }
  .preview { order: -1; }
  .category-charts { grid-template-columns: 1fr; }
  .category-item { min-height: 76px; }
}
</style>
