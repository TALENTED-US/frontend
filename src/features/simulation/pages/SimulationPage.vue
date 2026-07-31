<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { dashboard, simulationOptions } from '@/data/mockData'

const route = useRoute()
const money = new Intl.NumberFormat('ko-KR')
const mode = ref(route.query.mode === 'builder' ? 'builder' : 'overview')
const selected = ref([1])
const saved = ref(false)
const selectedItems = computed(() => simulationOptions.filter((item) => selected.value.includes(item.id)))
const addedMonths = computed(() => selectedItems.value.reduce((sum, item) => sum + item.months, 0))
const addedMoney = computed(() => selectedItems.value.reduce((sum, item) => sum + item.amount, 0))
const resultMonths = computed(() => (dashboard.survivalMonths + addedMonths.value).toFixed(1))

function toggle(id) {
  selected.value = selected.value.includes(id) ? selected.value.filter((item) => item !== id) : [...selected.value, id]
  saved.value = false
}
</script>

<template>
  <section class="page simulation-page">
    <header class="page-heading desktop-only">
      <div><h1 class="page-title">{{ mode === 'overview' ? '시뮬레이션' : '새 시나리오 만들기' }}</h1><p class="page-description">수입을 늘리고 지출을 줄이는 계획을 조합해 보세요.</p></div>
    </header>

    <template v-if="mode === 'overview'">
      <article class="survival-report card">
        <div><span>생존기간</span><em>안정</em></div>
        <section><small>현재 생존기간</small><strong>3.8개월</strong></section>
        <section><small>예상 생존기간</small><strong class="unknown">?개월</strong></section>
        <b>목표 6개월</b>
        <p>↢ 목표 6개월 · 5일 남음</p>
      </article>

      <article class="simulation-banner">
        <div><small>💡 시뮬레이션 해보기</small><h2>수입을 늘리면<br />생존기간이 얼마나 늘어날까요?</h2><p>항목을 조합해 내 재정이 맞는 시나리오를 만들어보세요.</p></div>
        <button @click="mode = 'builder'">지금 시뮬레이션 하기 →</button>
      </article>

      <article class="current-report card">
        <h2>현재 재정 리포트</h2>
        <div>
          <section><span>총자산</span><strong>300만원</strong></section>
          <section><span>월평균 수입</span><strong>없음</strong></section>
          <section><span>월평균 지출</span><strong>80만원</strong></section>
          <section><span>순현금흐름</span><strong>-80만원</strong></section>
        </div>
      </article>

      <section class="scenario-section">
        <h2>기존 시나리오</h2>
        <button class="empty-scenario" @click="mode = 'builder'">
          <strong>아직 생성한 시나리오가 없습니다.</strong><span>시나리오 생성하러 가기 ›</span>
        </button>
      </section>

      <article class="simulation-chart card">
        <h2>월별 재정 타임라인</h2>
        <div><span>● 현재 기준</span><span>● 시나리오 적용</span><span>● 목표 취업 시기</span></div>
        <svg viewBox="0 0 720 190" preserveAspectRatio="none">
          <path class="grid" d="M30 30H700M30 80H700M30 130H700" />
          <path class="base" d="M35 20 210 163" /><path class="future" d="M35 20 315 105 460 163" />
          <path class="goal" d="M355 10V170" /><path class="danger" d="M30 135H700" />
        </svg>
      </article>
    </template>

    <template v-else>
      <button class="back-button" @click="mode = 'overview'">‹ 시뮬레이션 홈</button>
      <h1 class="builder-title">지출을 매달 10만원 줄이면<br />생존기간이 얼마나 늘어날까요?</h1>
      <p class="builder-description">시뮬레이션을 통해 생존기간 변화를 미리 확인하세요.</p>

      <article class="builder-preview">
        <small>~ 시나리오를 만들면 이런 리포트를 받아볼 수 있어요.</small>
        <p><del>3.8개월</del><b>→</b><strong>{{ resultMonths }}개월</strong><em>+{{ addedMonths.toFixed(1) }}개월</em></p>
        <div class="preview-grid">
          <section><h2>월별 재정 타임라인</h2><svg viewBox="0 0 500 150"><path d="M20 30 210 120 480 135" /><path class="after" d="M20 30 230 70 480 95" /></svg></section>
          <aside><strong>위험 감액 도달</strong><p>현재 지출금이 설정한 위험 잔액에 도달했어요.</p></aside>
          <aside><strong>월평균 순현금흐름</strong><b>적용 후 +10만원</b></aside>
        </div>
      </article>

      <section class="period-fields">
        <h2>시뮬레이션 기간</h2>
        <div><label><span>시작일</span><input type="date" value="2026-07-21" /></label><label><span>종료일</span><input type="date" value="2027-01-01" /></label></div>
      </section>

      <section>
        <h2 class="category-title">카테고리를 선택해주세요</h2>
        <div class="option-grid">
          <RouterLink v-for="option in [
            ['expense', '🧾', '지출 줄이기', '식비·교통비 절감'],
            ['income', '💼', '수입 늘리기', '부업·알바 찾기'],
            ['policy', '🏛️', '정책 혜택', '청년지원금'],
            ['finance', '🏦', '금융상품', '예·적금 상품'],
          ]" :key="option[0]" class="option-card" :to="`/simulation/${option[0]}`">
            <i>{{ option[1] }}</i><span><strong>{{ option[2] }}</strong><em>{{ option[3] }}</em></span><b>›</b>
          </RouterLink>
        </div>
      </section>

      <button class="save-scenario" @click="saved = true">{{ saved ? '시나리오가 저장됐어요 ✓' : '카테고리를 선택해 시나리오 만들기' }}</button>
    </template>
  </section>
</template>

<style scoped>
.survival-report {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: end;
  min-height: 112px;
  padding: 18px 20px 32px;
}
.survival-report > div { position: absolute; top: 15px; left: 20px; display: flex; align-items: center; gap: 13px; font-size: var(--font-small); font-weight: 800; }
.survival-report > div em { padding: 3px 9px; border-radius: 999px; background: var(--success-soft); color: var(--success); font-size: var(--font-caption); font-style: normal; }
.survival-report section { display: grid; gap: 2px; padding-top: 28px; }
.survival-report small { color: #777; font-size: var(--font-caption); }
.survival-report strong { color: var(--primary); font-size: var(--font-page-title); }
.survival-report .unknown { color: var(--success); }
.survival-report > b { align-self: center; justify-self: end; color: var(--primary); font-size: var(--font-body); }
.survival-report > p { position: absolute; right: 20px; bottom: 8px; left: 20px; padding: 4px; border-radius: 999px; background: #fff0f1; color: var(--danger); text-align: center; font-size: var(--font-caption); }

.simulation-banner { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 22px; padding: 24px; border-radius: 14px; background: #fff8d9; }
.simulation-banner small { color: #e7a61c; font-size: var(--font-caption); }
.simulation-banner h2 { margin-top: 7px; font-size: var(--font-section-title); line-height: 1.3; }
.simulation-banner p { margin-top: 5px; color: #777; font-size: var(--font-caption); }
.simulation-banner button { padding: 13px 30px; border-radius: 11px; background: var(--accent-strong); font-size: var(--font-small); font-weight: 800; }

.current-report { margin-top: 28px; padding: 18px 22px; }
.current-report h2 { color: #777; font-size: var(--font-small); font-weight: 500; }
.current-report > div { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 12px; }
.current-report section { display: grid; gap: 4px; padding: 0 20px; border-right: 1px solid #e4e4e4; }
.current-report section:first-child { padding-left: 0; }
.current-report section:last-child { border: 0; }
.current-report span { color: #777; font-size: var(--font-caption); }
.current-report strong { color: #4c556a; font-size: var(--font-body); }
.current-report section:nth-child(2) strong { color: var(--primary); }
.current-report section:nth-child(3) span { color: var(--danger); }
.current-report section:nth-child(4) span { color: #7564b1; }

.scenario-section { margin-top: 26px; }
.scenario-section > h2, .simulation-chart h2 { color: var(--primary); font-size: var(--font-body); }
.empty-scenario { display: grid; width: 100%; min-height: 94px; margin-top: 8px; place-content: center; gap: 5px; border: 1px dashed #cdd3e6; border-radius: 13px; background: #f7f9ff; color: var(--primary); font-size: var(--font-small); }
.empty-scenario span { font-size: var(--font-caption); }
.simulation-chart { margin-top: 26px; padding: 20px; }
.simulation-chart > div { display: flex; gap: 14px; margin-top: 7px; color: #777; font-size: var(--font-caption); }
.simulation-chart svg { width: 100%; height: 170px; }
.simulation-chart path { fill: none; }
.simulation-chart .grid { stroke: #e5e8f0; }
.simulation-chart .base { stroke: var(--primary); stroke-width: 3; stroke-dasharray: 7 5; }
.simulation-chart .future { stroke: #2fc084; stroke-width: 3; }
.simulation-chart .goal { stroke: #f0b63a; stroke-width: 2; }
.simulation-chart .danger { stroke: var(--danger); stroke-width: 1.5; stroke-dasharray: 4 4; }

.back-button { color: var(--primary); font-size: var(--font-small); font-weight: 700; }
.builder-title { margin-top: 18px; color: var(--primary); font-size: var(--font-page-title); line-height: 1.2; }
.builder-description { margin-top: 5px; color: #777; font-size: var(--font-small); }
.builder-preview { margin-top: 20px; padding: 22px; border-radius: 14px; background: #fff9df; }
.builder-preview > small { color: #df9d16; font-size: var(--font-caption); }
.builder-preview > p { display: flex; align-items: center; gap: 12px; margin: 13px 0; }
.builder-preview > p del { color: #aaa; font-size: var(--font-body); }
.builder-preview > p strong { color: var(--success); font-size: var(--font-page-title); }
.builder-preview > p em { padding: 5px 13px; border-radius: 999px; background: var(--success-soft); color: var(--success); font-size: var(--font-caption); font-style: normal; }
.preview-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
.preview-grid section { grid-row: 1 / 3; padding: 14px; border-radius: 11px; background: white; }
.preview-grid h2 { color: var(--primary); font-size: var(--font-small); }
.preview-grid svg { width: 100%; height: 130px; }
.preview-grid path { fill: none; stroke: var(--primary); stroke-width: 2; }
.preview-grid path.after { stroke: var(--success); }
.preview-grid aside { display: grid; gap: 5px; padding: 14px; border: 1px solid var(--border); border-radius: 11px; background: #fff7ee; }
.preview-grid aside strong { color: var(--danger); font-size: var(--font-caption); }
.preview-grid aside p { color: #777; font-size: var(--font-caption); }
.preview-grid aside b { color: var(--success); font-size: var(--font-caption); }
.result-banner { margin-top: 20px; padding: 18px; border: 1px solid var(--success); border-radius: 13px; background: var(--success-soft); }
.result-banner > span, .result-banner > small { color: #6c7572; font-size: var(--font-caption); }
.result-banner p { display: flex; align-items: center; gap: 14px; margin: 5px 0; }
.result-banner del { color: #aaa; font-size: var(--font-card-title); }
.result-banner strong { color: var(--success); font-size: var(--font-page-title); }
.result-banner em { padding: 5px 15px; border-radius: 999px; background: #cef4e4; color: var(--success); font-size: var(--font-caption); font-style: normal; }
.period-fields { margin-top: 20px; }
.period-fields h2, .category-title { color: var(--primary); font-size: var(--font-body); }
.period-fields > div { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px; }
.period-fields label { display: grid; gap: 5px; padding: 12px 15px; border: 1px solid #f0b53a; border-radius: 10px; background: #fff9e7; }
.period-fields span { color: #777; font-size: var(--font-caption); }
.period-fields input { color: var(--primary); font-size: var(--font-small); font-weight: 700; }
.category-title { margin-top: 20px; }
.option-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 12px; }
.option-card { display: grid; grid-template-columns: 46px 1fr 25px; align-items: center; gap: 12px; min-height: 105px; padding: 16px; border: 1px solid var(--border); border-radius: 13px; text-align: left; }
.option-card.selected { border-color: var(--sky); background: var(--primary-soft); }
.option-card > i { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 50%; background: #fff8da; font-style: normal; }
.option-card > span { display: grid; gap: 2px; }
.option-card small { color: #777; font-size: var(--font-caption); }
.option-card strong { color: var(--primary); font-size: var(--font-body); }
.option-card em { color: var(--success); font-size: var(--font-caption); font-style: normal; }
.option-card > b { color: var(--primary); }
.save-scenario { width: 100%; margin-top: 22px; padding: 14px; border-radius: 10px; background: var(--sky); color: var(--primary); font-size: var(--font-small); font-weight: 800; }

@media (max-width: 767px) {
  .survival-report { grid-template-columns: 1fr 1fr; min-height: 94px; padding: 14px 14px 30px; box-shadow: var(--shadow-sm); }
  .survival-report > div { top: 10px; left: auto; right: 14px; }
  .survival-report > div span { display: none; }
  .survival-report section { padding-top: 10px; }
  .survival-report section small { font-size: var(--font-caption); }
  .survival-report strong { font-size: var(--font-page-title); }
  .survival-report > b { display: none; }
  .simulation-banner { min-height: 160px; flex-direction: column; align-items: flex-start; margin-top: 12px; padding: 18px; box-shadow: var(--shadow-sm); }
  .simulation-banner h2 { font-size: var(--font-card-title); }
  .simulation-banner button { align-self: center; padding: 12px 24px; border-radius: 999px; }
  .current-report { margin-top: 12px; padding: 14px; box-shadow: var(--shadow-sm); }
  .current-report > div { grid-template-columns: 1fr 1fr; gap: 7px; }
  .current-report section { min-height: 78px; padding: 14px 12px; border: 0; border-radius: 9px; background: #dce7ff; }
  .current-report section:nth-child(2) { background: #e7f9f1; }
  .current-report section:nth-child(3) { background: #fdebed; }
  .current-report section:nth-child(4) { background: #f1eff9; }
  .scenario-section, .simulation-chart { margin-top: 14px; }
  .empty-scenario { min-height: 78px; }
  .simulation-chart { padding: 14px; box-shadow: var(--shadow-sm); }
  .simulation-chart svg { height: 140px; }
  .builder-title { font-size: var(--font-page-title); }
  .preview-grid { grid-template-columns: 1fr; }
  .preview-grid section { grid-row: auto; }
  .period-fields > div, .option-grid { grid-template-columns: 1fr; gap: 9px; }
  .option-card { min-height: 96px; padding: 14px 13px; }
}
</style>
