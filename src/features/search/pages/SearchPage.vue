<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import {
  defaultPolicyFilters,
  filterPolicies,
  policyItems,
  readFilters,
  toFilterQuery,
} from '@/features/search/policyData'

const route = useRoute()
const router = useRouter()
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const activeFilters = ref(readFilters(route.query))
const amount = computed(() => Number(route.query.amount || 0))

const result = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return filterPolicies(policyItems, activeFilters.value, amount.value).filter((item) =>
    !keyword || `${item.title} ${item.description}`.toLowerCase().includes(keyword),
  )
})

watch(
  () => route.query,
  (nextQuery) => {
    activeFilters.value = readFilters(nextQuery)
    query.value = typeof nextQuery.q === 'string' ? nextQuery.q : ''
  },
)

function syncSearch() {
  router.replace({
    path: '/search',
    query: {
      ...(query.value.trim() ? { q: query.value.trim() } : {}),
      filters: toFilterQuery(activeFilters.value),
      ...(amount.value ? { amount: String(amount.value) } : {}),
    },
  })
}

function resetSearch() {
  query.value = ''
  activeFilters.value = []
  router.replace('/search')
}

function openFilter() {
  router.push({
    path: '/search/filter',
    query: {
      filters: toFilterQuery(activeFilters.value),
      ...(amount.value ? { amount: String(amount.value) } : {}),
    },
  })
}
</script>

<template>
  <section class="page search-page">
    <header class="search-heading">
      <h1>나에게 맞는 정책 찾기</h1>
      <p>검색어 없이 조건에 맞는 정책을 찾아드려요.</p>
    </header>

    <form class="search-input" @submit.prevent="syncSearch">
      <input v-model="query" placeholder="정책명으로 검색 (선택)" aria-label="정책명 검색" />
      <button type="submit" aria-label="검색"><AppIcon name="search" :size="18" /></button>
    </form>

    <div class="quick-filters">
      <div class="filter-chips">
        <span
          v-for="filter in activeFilters"
          :key="filter"
          class="filter-chip"
        >
          {{ filter }}
        </span>
      </div>
      <button class="filter-button" type="button" aria-label="정책 상세 필터" @click="openFilter">
        <span /><span /><span />
      </button>
    </div>

    <div class="result-heading">
      <h2>검색 결과</h2>
      <span>정책 {{ result.length }}개</span>
    </div>

    <div v-if="result.length" class="result-list">
      <a
        v-for="item in result"
        :key="item.id"
        class="result-card"
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`${item.title} 관련 페이지로 이동`"
      >
        <div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </div>
        <div>
          <strong>{{ item.benefit }}</strong>
          <small>{{ item.deadline }}</small>
        </div>
        <AppIcon name="chevron" :size="15" />
      </a>
    </div>

    <div v-else class="empty-search card">
      <span><AppIcon name="search" :size="34" /></span>
      <h2>검색 결과가 없습니다</h2>
      <p>검색어나 필터 조건을 바꿔 다시 찾아보세요.</p>
      <div>
        <button type="button" @click="resetSearch">필터 초기화</button>
        <button
          type="button"
          @click="query = ''; activeFilters = [...defaultPolicyFilters]; syncSearch()"
        >
          전체 항목 보기
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.search-page { padding-top: 8px; }
.search-heading { margin-bottom: 42px; }
.search-heading h1 { color: var(--primary); font-size: 26px; line-height: 1.25; }
.search-heading p { margin-top: 6px; color: #666; font-size: 13px; }
.search-input { display: flex; height: 56px; padding: 0 15px 0 21px; align-items: center; border-radius: 15px; background: #fff9df; }
.search-input input { min-width: 0; flex: 1; font-size: 13px; }
.search-input button { display: grid; width: 52px; height: 34px; place-items: center; border-radius: 999px; background: var(--primary); color: white; }
.quick-filters { display: flex; min-height: 54px; align-items: center; gap: 12px; }
.filter-chips { display: flex; min-width: 0; flex: 1; flex-wrap: wrap; gap: 12px; }
.filter-chip { display: inline-flex; min-width: 86px; flex: none; align-items: center; justify-content: center; padding: 8px 18px; border-radius: 999px; background: #eff3ff; color: var(--primary); font-size: 11px; font-weight: 700; cursor: default; user-select: none; }
.filter-button { display: grid; width: 40px; height: 34px; margin-left: auto; place-content: center; gap: 4px; border: 1px solid var(--border); border-radius: 9px; background: white; }
.filter-button span { position: relative; display: block; width: 19px; height: 2px; background: var(--primary); }
.filter-button span::after { position: absolute; top: -3px; width: 7px; height: 7px; border: 2px solid var(--primary); border-radius: 50%; background: white; content: ''; }
.filter-button span:nth-child(1)::after, .filter-button span:nth-child(3)::after { left: 3px; }
.filter-button span:nth-child(2)::after { right: 3px; }
.result-heading { display: flex; justify-content: space-between; align-items: center; margin: 0 0 13px; }
.result-heading h2 { color: var(--primary); font-size: 16px; }
.result-heading span { color: #777; font-size: 12px; }
.result-list { display: grid; gap: 16px; }
.result-card { display: grid; grid-template-columns: 1fr auto 16px; min-height: 112px; align-items: center; gap: 22px; padding: 22px 24px; border: 1px solid var(--border); border-radius: 15px; background: white; color: inherit; transition: border-color .15s ease, transform .15s ease; }
.result-card:hover { border-color: var(--primary-soft); transform: translateY(-1px); }
.result-card > div { display: grid; gap: 10px; }
.result-card h3 { color: var(--primary); font-size: 17px; }
.result-card p, .result-card small { color: #777; font-size: 12px; }
.result-card > div:nth-child(2) { justify-items: end; }
.result-card strong { color: var(--primary); font-size: 17px; }
.empty-search { display: grid; min-height: 370px; place-content: center; justify-items: center; gap: 10px; text-align: center; }
.empty-search > span { display: grid; width: 106px; height: 106px; place-items: center; border-radius: 50%; background: var(--primary-soft); color: var(--primary); }
.empty-search h2 { color: var(--primary); font-size: 22px; }
.empty-search p { color: #777; font-size: 13px; }
.empty-search div { display: flex; gap: 16px; margin-top: 15px; }
.empty-search button { min-width: 190px; padding: 14px; border: 1px solid var(--border); border-radius: 11px; color: var(--primary); font-size: 13px; font-weight: 700; }
.empty-search button:last-child { border-color: var(--accent-strong); background: var(--accent-strong); }

@media (max-width: 767px) {
  .search-page { padding-top: 8px; }
  .search-heading { margin: 8px 0 20px; }
  .search-heading h1 { color: #222; font-size: 24px; }
  .search-heading p { margin-top: 7px; font-size: 13px; }
  .search-input { height: 58px; padding-left: 18px; border-radius: 18px; background: #f4f6fb; }
  .search-input input { font-size: 13px; }
  .search-input button { width: 46px; height: 42px; }
  .quick-filters { display: grid; grid-template-columns: 1fr; gap: 9px; padding: 13px 0 8px; }
  .filter-chips { gap: 9px; overflow: visible; }
  .filter-chip { min-width: auto; padding: 10px 19px; background: #fff0b4; color: #222; font-size: 12px; }
  .filter-button { position: static; width: 38px; margin-left: 0; justify-self: end; border: 0; background: var(--background); }
  .result-heading { margin-top: 2px; }
  .result-heading h2 { color: #222; font-size: 17px; }
  .result-list { gap: 16px; }
  .result-card { grid-template-columns: 1fr auto 12px; min-height: 122px; padding: 20px 21px; border-radius: 20px; box-shadow: var(--shadow-sm); }
  .result-card h3 { color: #222; font-size: 17px; }
  .result-card p, .result-card small { font-size: 12px; }
  .result-card strong { color: #222; font-size: 17px; }
  .empty-search { min-height: 390px; padding: 22px; border-radius: 20px; }
  .empty-search > span { width: 88px; height: 88px; }
  .empty-search h2 { font-size: 20px; }
  .empty-search div { width: 100%; gap: 10px; }
  .empty-search button { min-width: 0; flex: 1; padding: 13px 6px; }
}
</style>
