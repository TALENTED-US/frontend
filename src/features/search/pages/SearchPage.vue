<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const type = ref(route.query.type === 'finance' ? '금융상품' : '정책')
const query = ref('')
const activeTags = ref(['취업준비생'])
const showFilter = ref(false)
const selected = ref(null)
const policyItems = [
  { id: 1, type: '정책', title: '청년 구직활동지원금', description: '취업준비생 · 온라인 신청', benefit: '월 50만원', deadline: '7일 이내', color: '#eaf9f5' },
  { id: 2, type: '정책', title: '서울시 청년수당', description: '구직활동 계획 제출', benefit: '최대 300만원', deadline: '모집 중', color: '#eaf9f5' },
  { id: 3, type: '정책', title: '국민내일배움카드', description: '교육비 · 훈련 과정 선택', benefit: '최대 500만원', deadline: '상시 모집', color: '#eaf9f5' },
  { id: 4, type: '금융상품', title: 'KB 청년도약계좌', description: 'KB국민은행 · 청년 우대', benefit: '최대 연 6.0%', deadline: '판매 중', color: '#eef2ff' },
  { id: 5, type: '금융상품', title: '청년 주택드림 통장', description: '주거 준비 · 우대 금리', benefit: '최대 연 4.5%', deadline: '상시', color: '#eef2ff' },
]
const result = computed(() => policyItems.filter((item) => item.type === type.value && (!query.value || item.title.includes(query.value))))

function toggleTag(tag) {
  activeTags.value = activeTags.value.includes(tag) ? activeTags.value.filter((item) => item !== tag) : [...activeTags.value, tag]
}
</script>

<template>
  <section class="page search-page">
    <header class="search-heading">
      <h1>나에게 맞는 정책과 금융상품 찾기</h1>
      <p>검색어 없이 조건만 골라도 맞는 혜택을 찾아드려요.</p>
    </header>

    <div class="type-tabs">
      <button :class="{ active: type === '정책' }" @click="type = '정책'; selected = null">정책</button>
      <button :class="{ active: type === '금융상품' }" @click="type = '금융상품'; selected = null">금융상품</button>
    </div>

    <label class="search-input">
      <input v-model="query" :placeholder="`${type === '정책' ? '정책명' : '상품명'}으로 검색 (선택)`" />
      <button type="button"><AppIcon name="search" :size="18" /></button>
    </label>

    <div class="quick-filters">
      <button v-for="tag in ['취업준비생', '취업', '모집 중', '7일 이내']" :key="tag" :class="{ active: activeTags.includes(tag) }" @click="toggleTag(tag)">{{ tag }}</button>
      <button class="filter-button" aria-label="상세 필터" @click="router.push({ path: '/search/filter', query: { type: type === '정책' ? 'policy' : 'finance' } })">☷</button>
    </div>

    <section v-if="showFilter" class="filter-panel card">
      <div v-for="group in [
        ['취업 상태', ['취업준비생', '대학생', '재직중', '휴학생']],
        ['정책 분야', ['취업', '창업', '주거', '금융']],
        ['신청 마감', ['모집 중', '7일 이내', '30일 이내', '상시']],
      ]" :key="group[0]">
        <strong>{{ group[0] }}</strong>
        <span><button v-for="item in group[1]" :key="item" :class="{ active: activeTags.includes(item) }" @click="toggleTag(item)">{{ item }}</button></span>
      </div>
      <button class="filter-apply" @click="showFilter = false">선택한 조건으로 검색하기</button>
    </section>

    <div class="result-heading"><h2>검색 결과</h2><span>{{ type }} {{ result.length + (type === '정책' ? 3 : 0) }}개</span></div>
    <div class="result-list">
      <button v-for="item in result" :key="item.id" class="result-card" :style="{ background: item.color }" @click="selected = item">
        <div><span>{{ item.type === '정책' ? '정책' : '금융' }}</span><h3>{{ item.title }}</h3><p>{{ item.description }}</p></div>
        <div><strong>{{ item.benefit }}</strong><small>{{ item.deadline }}</small></div>
        <AppIcon name="chevron" :size="15" />
      </button>
    </div>

    <div v-if="!result.length" class="empty-search card">
      <span><AppIcon name="search" :size="31" /></span><h2>검색 결과가 없습니다</h2><p>검색어나 필터 조건을 바꿔 다시 찾아보세요.</p>
      <div><button @click="query = ''; activeTags = []">필터 초기화</button><button @click="query = ''">전체 항목 보기</button></div>
    </div>

    <div v-if="selected" class="detail-backdrop" @click.self="selected = null">
      <article class="detail-sheet">
        <button class="detail-close" @click="selected = null">×</button>
        <span class="detail-tag">{{ selected.type }}</span>
        <h2>{{ selected.title }}</h2><p>{{ selected.description }}</p>
        <dl><div><dt>지원 혜택</dt><dd>{{ selected.benefit }}</dd></div><div><dt>신청 마감</dt><dd>{{ selected.deadline }}</dd></div><div><dt>추천 이유</dt><dd>현재 취업 준비 상태와 거주 조건에 잘 맞아요.</dd></div></dl>
        <button class="detail-apply">시뮬레이션에 적용하기</button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.search-heading { margin-bottom: 22px; }
.search-heading h1 { color: var(--primary); font-size: 25px; }
.search-heading p { margin-top: 5px; color: #777; font-size: 11px; }
.type-tabs { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.type-tabs button { min-height: 47px; color: #555; font-size: 12px; }
.type-tabs button.active { border-radius: 11px; background: var(--sky); color: white; font-weight: 800; }
.search-input { display: flex; height: 46px; margin-top: 18px; padding: 0 10px 0 18px; align-items: center; border-radius: 11px; background: #fff9df; }
.search-input input { min-width: 0; flex: 1; font-size: 11px; }
.search-input button { display: grid; width: 37px; height: 29px; place-items: center; border-radius: 999px; background: var(--primary); color: white; }
.quick-filters { display: flex; align-items: center; gap: 9px; margin: 13px 0; }
.quick-filters button, .filter-panel span button { padding: 7px 16px; border-radius: 999px; background: #f1f4fc; color: var(--primary); font-size: 9px; }
.quick-filters button.active, .filter-panel span button.active { background: #e8eeff; font-weight: 800; }
.quick-filters .filter-button { width: 34px; margin-left: auto; padding: 7px; border: 1px solid var(--border); background: white; font-size: 17px; }
.filter-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 25px; margin: 15px 0; padding: 20px; }
.filter-panel > div { display: grid; gap: 9px; }
.filter-panel strong { color: var(--primary); font-size: 11px; }
.filter-panel span { display: flex; flex-wrap: wrap; gap: 5px; }
.filter-panel span button { border: 1px solid var(--border); background: white; }
.filter-panel .filter-apply { grid-column: 1 / -1; padding: 12px; border-radius: 9px; background: var(--accent); color: var(--primary); font-size: 11px; font-weight: 800; }
.result-heading { display: flex; justify-content: space-between; align-items: center; margin: 8px 0 10px; }
.result-heading h2 { color: var(--primary); font-size: 14px; }
.result-heading span { color: #777; font-size: 9px; }
.result-list { display: grid; gap: 13px; }
.result-card { display: grid; grid-template-columns: 1fr auto 20px; align-items: center; gap: 18px; min-height: 87px; padding: 16px 19px; border: 1px solid #d9e6e3; border-radius: 13px; text-align: left; }
.result-card > div { display: grid; gap: 3px; }
.result-card > div:first-child > span { width: fit-content; padding: 4px 13px; border-radius: 999px; background: #d5f4e9; color: var(--primary); font-size: 8px; }
.result-card h3 { color: var(--primary); font-size: 14px; }
.result-card p, .result-card small { color: #777; font-size: 9px; }
.result-card > div:nth-child(2) { justify-items: end; }
.result-card > div:nth-child(2) strong { color: var(--primary); font-size: 14px; }
.empty-search { display: grid; min-height: 290px; place-content: center; justify-items: center; gap: 8px; text-align: center; }
.empty-search > span { display: grid; width: 70px; height: 70px; place-items: center; border-radius: 50%; background: var(--primary-soft); color: var(--primary); }
.empty-search h2 { color: var(--primary); font-size: 16px; }
.empty-search p { color: #777; font-size: 10px; }
.empty-search div { display: flex; gap: 12px; margin-top: 8px; }
.empty-search button { min-width: 140px; padding: 11px; border: 1px solid var(--border); border-radius: 9px; color: var(--primary); font-size: 10px; }
.empty-search button:last-child { border-color: var(--accent-strong); background: var(--accent-strong); color: #171717; }
.detail-backdrop { position: fixed; z-index: 70; inset: 0; display: grid; place-items: center; padding: 18px; background: rgb(4 15 100 / 40%); }
.detail-sheet { position: relative; width: min(100%, 430px); padding: 27px; border-radius: 16px; background: white; box-shadow: var(--shadow-md); }
.detail-close { position: absolute; top: 14px; right: 17px; font-size: 22px; }
.detail-tag { padding: 5px 12px; border-radius: 999px; background: var(--success-soft); color: var(--primary); font-size: 9px; }
.detail-sheet h2 { margin-top: 14px; color: var(--primary); font-size: 20px; }
.detail-sheet > p { color: #777; font-size: 11px; }
.detail-sheet dl { display: grid; gap: 13px; margin: 20px 0; }
.detail-sheet dl div { display: grid; gap: 2px; }
.detail-sheet dt { color: #888; font-size: 9px; }
.detail-sheet dd { font-size: 12px; }
.detail-apply { width: 100%; padding: 13px; border-radius: 9px; background: var(--accent); color: var(--primary); font-size: 11px; font-weight: 800; }

@media (max-width: 767px) {
  .search-heading { margin: 12px 0 15px; }
  .search-heading h1 { font-size: 19px; }
  .search-heading p { font-size: 11px; }
  .type-tabs button { min-height: 41px; }
  .search-input { height: 44px; margin-top: 13px; }
  .quick-filters { overflow-x: auto; }
  .quick-filters button { flex: none; padding: 7px 14px; }
  .filter-panel { grid-template-columns: 1fr; padding: 15px; }
  .filter-panel .filter-apply { grid-column: auto; }
  .result-card { grid-template-columns: 1fr auto 14px; min-height: 82px; padding: 13px 15px; box-shadow: var(--shadow-sm); }
  .detail-backdrop { align-items: end; padding: 0; }
  .detail-sheet { width: 100%; border-radius: 20px 20px 0 0; padding: 25px 20px 28px; }
}
</style>
