<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { readFilters, toPolicySearchRequest, toFilterQuery } from '@/features/search/policyData'
import { searchPoliciesApi } from '@/api/policy'
import { mapPolicyPage } from '@/mappers/policy'
import { calculateAge, normalizePolicyRegion } from '@/mappers/policy'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const activeFilters = ref(readFilters(route.query))
const amount = ref(Number(route.query.amount || 0))
const result = ref([])
const pageInfo = ref({
  page: 1,
  totalElements: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
})
const loading = ref(false)
const error = ref('')
let requestId = 0

async function loadPolicies(page = 1) {
  const currentRequestId = ++requestId
  loading.value = true
  error.value = ''
  try {
    const response = await searchPoliciesApi(
      toPolicySearchRequest(activeFilters.value, amount.value, query.value, {
        page,
        size: 10,
        age: calculateAge(session.currentUser.birth),
        policyRegion: normalizePolicyRegion(session.currentUser.region),
      }),
    )
    if (currentRequestId !== requestId) return
    const mapped = mapPolicyPage(response)
    result.value = mapped.content
    pageInfo.value = mapped
  } catch (requestError) {
    if (currentRequestId !== requestId) return
    result.value = []
    pageInfo.value = {
      page: 1,
      totalElements: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    }
    error.value = requestError.message || '정책 목록을 불러오지 못했습니다.'
  } finally {
    if (currentRequestId === requestId) loading.value = false
  }
}

watch(
  () => route.query,
  (nextQuery) => {
    activeFilters.value = readFilters(nextQuery)
    query.value = typeof nextQuery.q === 'string' ? nextQuery.q : ''
    amount.value = Number(nextQuery.amount || 0)
    loadPolicies(Number(nextQuery.page || 1))
  },
  { immediate: true },
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
  router.replace({ path: '/search', query: { filters: '' } })
}

function showAllPolicies() {
  query.value = ''
  activeFilters.value = []
  syncSearch()
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

function movePage(page) {
  router.replace({
    path: '/search',
    query: {
      ...route.query,
      ...(page > 1 ? { page: String(page) } : { page: undefined }),
    },
  })
}
</script>

<template>
  <section class="page search-page">
    <header class="search-heading">
      <h1>나에게 맞는 정책 찾기</h1>
      <p>입력 없이도 조건에 맞는 정책을 찾아드려요.</p>
    </header>

    <form class="search-input" @submit.prevent="syncSearch">
      <input v-model="query" placeholder="정책명 입력 (선택)" aria-label="정책명 입력" />
      <button type="submit" aria-label="정책 보기"><AppIcon name="search" :size="18" /></button>
    </form>

    <div class="quick-filters">
      <div class="filter-chips">
        <span v-for="filter in activeFilters" :key="filter" class="filter-chip">
          {{ filter }}
        </span>
      </div>
      <button class="filter-button" type="button" aria-label="정책 상세 필터" @click="openFilter">
        <span /><span /><span />
      </button>
    </div>

    <div class="result-heading">
      <h2>정책 검색 결과</h2>
      <span>정책 {{ pageInfo.totalElements }}개</span>
    </div>

    <div v-if="loading" class="policy-state card">정책을 불러오는 중이에요.</div>
    <div v-else-if="error" class="policy-state policy-state--error card">
      <p>{{ error }}</p>
      <button type="button" @click="loadPolicies(pageInfo.page)">다시 시도</button>
    </div>
    <div v-else-if="result.length" class="result-list">
      <component
        v-for="item in result"
        :key="item.id"
        :is="item.url ? 'a' : 'article'"
        class="result-card"
        :class="{ 'result-card--disabled': !item.url }"
        :href="item.url || undefined"
        :target="item.url ? '_blank' : undefined"
        :rel="item.url ? 'noopener noreferrer' : undefined"
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
      </component>
      <nav v-if="pageInfo.totalPages > 1" class="policy-pagination" aria-label="정책 목록 페이지">
        <button
          type="button"
          :disabled="!pageInfo.hasPrevious"
          @click="movePage(pageInfo.page - 1)"
        >
          이전
        </button>
        <span>{{ pageInfo.page }} / {{ pageInfo.totalPages }}</span>
        <button type="button" :disabled="!pageInfo.hasNext" @click="movePage(pageInfo.page + 1)">
          다음
        </button>
      </nav>
    </div>

    <div v-else class="empty-search card">
      <span><AppIcon name="search" :size="34" /></span>
      <h2>조건에 맞는 정책이 없습니다</h2>
      <p>입력값이나 필터 조건을 바꿔 다시 찾아보세요.</p>
      <div>
        <button type="button" @click="resetSearch">필터 초기화</button>
        <button type="button" @click="showAllPolicies">전체 항목 보기</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.search-page {
  padding-top: 8px;
}
.search-heading {
  margin-bottom: 42px;
}
.search-heading h1 {
  color: #222;
  font-size: var(--type-page-title-size);
  font-weight: var(--type-page-title-weight);
  line-height: 1.3;
}
.search-heading p {
  margin-top: 6px;
  color: var(--type-supporting-color);
  font-size: var(--type-supporting-size);
  font-weight: var(--type-supporting-weight);
}
.search-input {
  display: flex;
  height: 56px;
  padding: 0 15px 0 21px;
  align-items: center;
  border: 1px solid #eceef3;
  border-radius: 15px;
  background: #f7f8fb;
  box-shadow: var(--shadow-figma);
}
.search-input input {
  min-width: 0;
  flex: 1;
  background: #f7f8fb;
  font-size: var(--type-input-size);
  font-weight: var(--type-input-weight);
}
.search-input button {
  display: grid;
  width: 52px;
  height: 34px;
  place-items: center;
  border-radius: 999px;
  background: #222;
  box-shadow: var(--shadow-figma);
  color: white;
}
.quick-filters {
  display: flex;
  min-height: 54px;
  align-items: center;
  gap: 12px;
  margin: 16px 0 10px;
}
.filter-chips {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  gap: 12px;
}
.filter-chip {
  display: inline-flex;
  min-width: 86px;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: var(--shadow-figma);
  color: #222;
  font-size: 15px;
  font-weight: var(--type-item-weight);
  cursor: default;
  user-select: none;
}
.filter-button {
  display: grid;
  width: 40px;
  height: 34px;
  margin-left: auto;
  place-content: center;
  gap: 4px;
  border: 1px solid #eceef3;
  border-radius: 9px;
  background: white;
  box-shadow: var(--shadow-figma);
}
.filter-button span {
  position: relative;
  display: block;
  width: 19px;
  height: 2px;
  background: #222;
}
.filter-button span::after {
  position: absolute;
  top: -3px;
  width: 7px;
  height: 7px;
  border: 2px solid #222;
  border-radius: 50%;
  background: white;
  content: '';
}
.filter-button span:nth-child(1)::after,
.filter-button span:nth-child(3)::after {
  left: 3px;
}
.filter-button span:nth-child(2)::after {
  right: 3px;
}
.result-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 13px;
}
.result-heading h2 {
  color: #222;
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
}
.result-heading span {
  color: #666;
  font-size: var(--type-meta-size);
  font-weight: var(--type-meta-weight);
}
.result-list {
  display: grid;
  gap: 14px;
}
.result-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(110px, auto) 16px;
  min-height: 108px;
  align-items: center;
  gap: 22px;
  padding: 6px 24px;
  border: 1px solid #eceef3;
  border-radius: 15px;
  background: white;
  box-shadow: var(--shadow-figma);
  color: inherit;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
}
.result-card:hover {
  border-color: var(--primary-soft);
  transform: translateY(-1px);
}
.result-card--disabled {
  cursor: default;
}
.result-card--disabled:hover {
  border-color: #eceef3;
  transform: none;
}
.policy-state {
  display: grid;
  min-height: 180px;
  place-content: center;
  gap: 12px;
  color: #777;
  text-align: center;
}
.policy-state button {
  color: var(--primary);
  font-weight: 700;
}
.policy-state--error {
  color: #d94f55;
}
.policy-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  margin: 8px 0 20px;
}
.policy-pagination button {
  padding: 8px 18px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: white;
}
.policy-pagination button:disabled {
  color: #bbb;
  cursor: not-allowed;
}
.policy-pagination span {
  color: #666;
  font-size: 13px;
}
.result-card > div {
  display: grid;
  gap: 10px;
}
.result-card h3 {
  color: #222;
  font-size: 16px;
  font-weight: var(--type-item-weight);
}
.result-card p,
.result-card small {
  color: var(--type-supporting-color);
  font-size: var(--type-supporting-size);
  font-weight: var(--type-supporting-weight);
}
.result-card > div:nth-child(2) {
  justify-items: end;
}
.result-card strong {
  color: #222;
  font-size: 16px;
  font-weight: var(--type-total-weight);
}
.empty-search {
  display: grid;
  min-height: 370px;
  place-content: center;
  justify-items: center;
  gap: 10px;
  text-align: center;
}
.empty-search > span {
  display: grid;
  width: 106px;
  height: 106px;
  place-items: center;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
}
.empty-search h2 {
  color: var(--primary);
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
}
.empty-search p {
  color: var(--type-supporting-color);
  font-size: var(--type-empty-size);
  font-weight: var(--type-empty-weight);
}
.empty-search div {
  display: flex;
  gap: 16px;
  margin-top: 15px;
}
.empty-search button {
  min-width: 190px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 11px;
  color: var(--primary);
  font-size: var(--type-primary-action-size);
  font-weight: var(--type-primary-action-weight);
}
.empty-search button:last-child {
  border-color: var(--accent-strong);
  background: var(--accent-strong);
}

@media (max-width: 767px) {
  .search-page {
    padding-top: 8px;
  }
  .search-heading {
    margin: 8px 0 20px;
  }
  .search-heading h1 {
    color: #222;
    font-size: var(--type-page-title-size);
  }
  .search-heading p {
    margin-top: 7px;
    font-size: var(--type-supporting-size);
  }
  .search-input {
    height: 58px;
    padding-left: 18px;
    border-radius: 18px;
    background: #f7f8fb;
  }
  .search-input input {
    font-size: var(--type-input-size);
  }
  .search-input button {
    width: 46px;
    height: 42px;
  }
  .quick-filters {
    display: grid;
    grid-template-columns: 1fr;
    gap: 9px;
    margin: 14px 0 10px;
    padding: 0 0 8px;
  }
  .filter-chips {
    gap: 9px;
    overflow: visible;
  }
  .filter-chip {
    min-width: auto;
    padding: 10px 19px;
    background: var(--accent);
    color: #222;
    font-size: 15px;
  }
  .filter-button {
    position: static;
    width: 38px;
    margin-left: 0;
    justify-self: end;
    border: 1px solid #eceef3;
    background: white;
  }
  .result-heading {
    margin-top: 2px;
  }
  .result-heading h2 {
    color: #222;
    font-size: var(--type-section-title-size);
  }
  .result-list {
    gap: 14px;
  }
  .result-card {
    grid-template-columns: minmax(0, 1fr) minmax(92px, auto) 12px;
    min-height: 120px;
    gap: 12px;
    padding: 4px 18px;
    border-radius: 20px;
    box-shadow: var(--shadow-sm);
  }
  .result-card h3 {
    color: #222;
    font-size: 16px;
  }
  .result-card p,
  .result-card small {
    font-size: var(--type-supporting-size);
  }
  .result-card strong {
    color: #222;
    font-size: 16px;
  }
  .empty-search {
    min-height: 390px;
    padding: 22px;
    border-radius: 20px;
  }
  .empty-search > span {
    width: 88px;
    height: 88px;
  }
  .empty-search h2 {
    font-size: var(--type-section-title-size);
  }
  .empty-search div {
    width: 100%;
    gap: 10px;
  }
  .empty-search button {
    min-width: 0;
    flex: 1;
    padding: 13px 6px;
  }
}
</style>
