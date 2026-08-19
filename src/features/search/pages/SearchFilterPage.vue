<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { policyFilterGroups, readFilters, toFilterQuery } from '@/features/search/policyData'
import AppIcon from '@/components/ui/AppIcon.vue'

const route = useRoute()
const router = useRouter()

function withDefaultAvailability(filters) {
  const statusFilters = policyFilterGroups[3][1]
  if (filters.some((filter) => statusFilters.includes(filter))) return filters
  if (Object.prototype.hasOwnProperty.call(route.query, 'filters')) return filters
  return [...filters, '신청 가능']
}

const selected = ref(withDefaultAvailability(readFilters(route.query)))
const amount = ref(Number(route.query.amount || 0))

function toggle(group, item) {
  const [, groupItems] = group

  if (selected.value.includes(item)) {
    selected.value = selected.value.filter((value) => value !== item)
    return
  }
  selected.value = [...selected.value.filter((value) => !groupItems.includes(value)), item]
}

function reset() {
  selected.value = ['신청 가능']
  amount.value = 0
}

function applyFilters() {
  router.push({
    path: '/search',
    query: {
      filters: toFilterQuery(selected.value),
      ...(typeof route.query.q === 'string' && route.query.q.trim()
        ? { q: route.query.q.trim() }
        : {}),
      ...(amount.value ? { amount: String(amount.value) } : {}),
    },
  })
}
</script>

<template>
  <section class="page filter-page">
    <button class="filter-back" type="button" @click="router.back()">
      <AppIcon name="chevron-left" :size="22" />정책 상세 필터
    </button>
    <p>필요한 조건을 선택해 결과를 좁혀보세요.</p>
    <div class="filter-tip">
      연령은 프로필 정보로 자동 반영돼요. 지역은 필요한 경우 직접 선택해 주세요.
    </div>

    <div class="filter-groups">
      <section v-for="group in policyFilterGroups" :key="group[0]">
        <h2>{{ group[0] }}</h2>
        <div>
          <button
            v-for="item in group[1]"
            :key="item"
            type="button"
            :class="{ active: selected.includes(item) }"
            @click="toggle(group, item)"
          >
            {{ item }}
          </button>
        </div>
      </section>

      <section class="amount-filter">
        <h2>지원 금액</h2>
        <div>
          <input
            v-model.number="amount"
            type="range"
            min="0"
            max="500"
            step="10"
            aria-label="최소 지원 금액"
          />
          <strong>{{ amount ? `${amount}만원 이상` : '제한 없음' }}</strong>
        </div>
      </section>
    </div>

    <footer>
      <button type="button" @click="reset">초기화</button>
      <button type="button" @click="applyFilters">선택한 조건으로 정책 보기</button>
    </footer>
  </section>
</template>

<style scoped>
.filter-page {
  padding-bottom: 5px;
}
.filter-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #222;
  font-size: var(--type-page-title-size);
  font-weight: var(--type-page-title-weight);
}
.filter-page > p {
  margin-top: 5px;
  color: var(--type-supporting-color);
  font-size: var(--type-supporting-size);
  font-weight: var(--type-supporting-weight);
}
.filter-tip {
  margin-top: 18px;
  padding: 13px 18px;
  border-radius: 10px;
  background: var(--accent);
  box-shadow: var(--shadow-figma);
  color: #222;
  font-size: var(--type-supporting-size);
  font-weight: var(--type-supporting-weight);
}
.filter-groups {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px 45px;
  margin-top: 27px;
}
.filter-groups section {
  display: grid;
  gap: 11px;
  align-content: start;
}
.amount-filter {
  grid-column: 1 / -1;
}
.filter-groups h2 {
  color: #222;
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
}
.filter-groups section > div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.filter-groups button {
  min-width: 88px;
  padding: 8px 15px;
  border: 1px solid #eceef3;
  border-radius: 999px;
  background: white;
  box-shadow: var(--shadow-figma);
  color: #555;
  font-size: var(--type-item-size);
  font-weight: 600;
}
.filter-groups button.active {
  border-color: #f1b94c;
  background: var(--accent);
  color: #222;
  font-weight: var(--type-item-weight);
}
.amount-filter input {
  min-width: 260px;
  flex: 1;
  accent-color: var(--accent-strong);
}
.amount-filter strong {
  flex: none;
  color: #222;
  font-size: var(--type-meta-size);
  font-weight: var(--type-meta-weight);
}
.filter-page > footer {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 20px;
  margin-top: 55px;
  padding: 14px 0;
  background: var(--background);
}
.filter-page > footer button {
  min-height: 50px;
  color: #666;
  font-size: var(--type-action-size);
  font-weight: var(--type-action-weight);
}
.filter-page > footer button:last-child {
  border-radius: 11px;
  background: var(--accent);
  box-shadow: var(--shadow-figma);
  color: #222;
  font-size: var(--type-primary-action-size);
  font-weight: var(--type-primary-action-weight);
}

@media (max-width: 767px) {
  .filter-page {
    padding-top: 5px;
    padding-bottom: 74px;
  }
  .filter-back {
    color: #222;
    font-size: var(--type-page-title-size);
  }
  .filter-page > p {
    font-size: var(--type-supporting-size);
  }
  .filter-tip {
    margin-top: 16px;
    background: var(--accent);
    font-size: var(--type-supporting-size);
  }
  .filter-groups {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    margin-top: 20px;
  }
  .filter-groups section {
    gap: 9px;
  }
  .filter-groups section[class] {
    grid-column: 1;
    grid-row: auto;
  }
  .filter-groups h2 {
    color: #222;
    font-size: var(--type-section-title-size);
  }
  .filter-groups button {
    min-width: 0;
    padding: 8px 14px;
    font-size: var(--type-item-size);
  }
  .filter-groups button.active {
    border-color: #f4bf40;
    background: var(--accent);
    color: #222;
  }
  .amount-filter input {
    min-width: 0;
  }
  .filter-page > footer {
    position: fixed;
    z-index: 30;
    right: 0;
    bottom: var(--bottom-nav-height);
    left: 0;
    grid-template-columns: 80px 1fr;
    margin: 0;
    padding: 13px 18px;
    border-top: 1px solid var(--border);
    background: white;
  }
  .filter-page > footer button {
    min-height: 48px;
  }
  .filter-page > footer button:last-child {
    background: var(--accent);
    color: #222;
    box-shadow: var(--shadow-figma);
  }
}
</style>
