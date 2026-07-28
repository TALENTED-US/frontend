<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const type = computed(() => route.query.type === 'finance' ? '금융상품' : '정책')
const selected = ref(['취업준비생', '금융', '제한 없음', '모집 중', '현금 지원', '7일 이내', '전체', '홈페이지'])
const amount = ref(50)
const policyGroups = [
  ['취업 상태', ['취업준비생', '대학생', '재학생', '휴학생', '미취업자', '구직자', '직장인', '프리랜서', '자영업', '창업준비']],
  ['정책 분야', ['취업', '창업', '주거', '금융', '복지', '교육', '문화', '교통', '건강', '청년지원']],
  ['소득 기준', ['제한 없음', '중위소득 50%', '80%', '100%', '120%', '150%']],
  ['신청 가능 여부', ['신청 가능', '모집 중', '모집 예정', '상시 모집', '마감 임박']],
  ['지원 형태', ['현금 지원', '바우처', '대출', '이자 지원', '장학금', '교육 프로그램', '컨설팅', '취업 연계']],
  ['신청 마감', ['오늘 마감', '3일 이내', '7일 이내', '30일 이내', '상시']],
  ['관심 키워드', ['전체', '월세', '취업', '창업', '생활비', '자격증', '해외취업', '학자금']],
  ['신청 방식·기관', ['홈페이지', '오프라인', '방문 신청', '모바일 신청', '고용24', '국민고용', '금융위원회', '지자체']],
]
const financeGroups = [
  ['상품 유형', ['예금', '적금', '청약', '대출', 'ISA', 'CMA']],
  ['가입 대상', ['청년', '취업준비생', '직장인', '무소득', '제한 없음']],
  ['운용 기간', ['6개월 이하', '1년', '2년', '3년 이상']],
  ['금리 유형', ['고정 금리', '변동 금리', '우대 금리']],
  ['가입 방식', ['모바일', '홈페이지', '영업점 방문']],
  ['금융기관', ['KB국민은행', '신한은행', '우리은행', '하나은행', '인터넷은행']],
]
const groups = computed(() => type.value === '정책' ? policyGroups : financeGroups)

function toggle(item) {
  selected.value = selected.value.includes(item) ? selected.value.filter((value) => value !== item) : [...selected.value, item]
}
</script>

<template>
  <section class="page filter-page">
    <button class="filter-back" @click="router.back()">‹ {{ type }} 상세 필터</button>
    <p>필요한 조건을 골라 {{ type }}을 찾아보세요.</p>
    <div class="filter-tip">{{ type === '정책' ? '거주 지역·연령·취업 준비 정보를 기준으로 추천해요.' : '목표 기간과 운용 가능 금액을 기준으로 추천해요.' }}</div>
    <div class="filter-groups">
      <section v-for="group in groups" :key="group[0]">
        <h2>{{ group[0] }}</h2><div><button v-for="item in group[1]" :key="item" :class="{ active: selected.includes(item) }" @click="toggle(item)">{{ item }}</button></div>
      </section>
      <section v-if="type === '정책'" class="amount-filter"><h2>지원 금액</h2><input v-model="amount" type="range" min="0" max="100" /><strong>{{ amount }}만원 이상</strong></section>
    </div>
    <footer><button @click="selected = []">초기화</button><button @click="router.push({ path: '/search', query: { type: type === '정책' ? 'policy' : 'finance', filtered: '1' } })">선택한 조건으로 검색하기</button></footer>
  </section>
</template>

<style scoped>
.filter-back { color: var(--primary); font-size: 18px; font-weight: 900; }
.filter-page > p { margin-top: 6px; color: #777; font-size: 10px; }
.filter-tip { margin-top: 18px; padding: 12px 16px; border-radius: 9px; background: var(--success-soft); color: var(--primary); font-size: 9px; }
.filter-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 22px 50px; margin-top: 23px; }
.filter-groups section { display: grid; gap: 10px; align-content: start; }
.filter-groups h2 { color: var(--primary); font-size: 13px; }
.filter-groups section > div { display: flex; flex-wrap: wrap; gap: 7px; }
.filter-groups button { min-width: 78px; padding: 7px 14px; border: 1px solid var(--border); border-radius: 999px; color: #777; font-size: 9px; }
.filter-groups button.active { border-color: var(--primary-soft); background: var(--primary-soft); color: var(--primary); font-weight: 800; }
.amount-filter { position: relative; }
.amount-filter input { width: 100%; accent-color: var(--primary); }
.amount-filter strong { position: absolute; right: 0; bottom: 27px; color: var(--primary); font-size: 9px; }
.filter-page > footer { position: sticky; bottom: 0; display: grid; grid-template-columns: 120px 1fr; gap: 20px; margin-top: 60px; padding: 14px 0; background: var(--background); }
.filter-page > footer button { min-height: 45px; color: #777; font-size: 11px; }
.filter-page > footer button:last-child { border-radius: 9px; background: var(--accent-strong); color: #111; font-weight: 800; }

@media (max-width: 767px) {
  .filter-back { font-size: 16px; }
  .filter-groups { grid-template-columns: 1fr; gap: 20px; }
  .filter-page > footer { grid-template-columns: 80px 1fr; margin-top: 30px; }
}
</style>
