<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/navigation/BrandLogo.vue'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()
const step = ref(1)
const selectedBanks = ref(['KB국민은행'])
const fixedExpenses = ref([
  { name: '실비보험', amount: 45000, checked: true },
  { name: '넷플릭스', amount: 17000, checked: true },
  { name: '유튜브 프리미엄', amount: 14900, checked: false },
  { name: '월세', amount: 500000, checked: true },
  { name: '교통카드 정기권', amount: 55000, checked: true },
])
const form = ref({
  type: '첫 취업',
  startDate: '2026-07-22',
  targetDate: '2027-01-01',
  region: '서울특별시 강남구',
  family: '1인 가구',
})

const totalFixed = computed(() =>
  fixedExpenses.value.filter((item) => item.checked).reduce((sum, item) => sum + item.amount, 0),
)

function toggleBank(bank) {
  selectedBanks.value = selectedBanks.value.includes(bank)
    ? selectedBanks.value.filter((item) => item !== bank)
    : [...selectedBanks.value, bank]
}

function next() {
  if (step.value < 3) step.value += 1
  else {
    session.login()
    router.push('/')
  }
}
</script>

<template>
  <main class="onboarding-page">
    <header class="onboarding-header">
      <BrandLogo />
      <button v-if="step > 1" type="button" @click="step -= 1">‹ 뒤로가기</button>
    </header>

    <section class="onboarding-card">
      <div class="progress"><span :style="{ width: `${(step / 3) * 100}%` }" /></div>

      <template v-if="step === 1">
        <p class="eyebrow">STEP 1 · 취업 준비 정보</p>
        <h1>내 현재 상황을 알려주세요</h1>
        <p class="intro">입력한 정보를 바탕으로 나에게 맞는 준비 계획을 만들어요.</p>
        <div class="form-grid">
          <label><span class="field-label">취업 준비 유형</span><select v-model="form.type" class="field"><option>첫 취업</option><option>재취업</option><option>이직</option></select></label>
          <div class="date-grid">
            <label><span class="field-label">준비 시작일</span><input v-model="form.startDate" class="field" type="date" /></label>
            <label><span class="field-label">목표 취업일</span><input v-model="form.targetDate" class="field" type="date" /></label>
          </div>
          <label><span class="field-label">거주지</span><input v-model="form.region" class="field" /></label>
          <label><span class="field-label">세대원 수</span><select v-model="form.family" class="field"><option>1인 가구</option><option>2인 가구</option><option>3인 이상</option></select></label>
        </div>
      </template>

      <template v-else-if="step === 2">
        <p class="eyebrow">STEP 2 · 금융 정보 연결</p>
        <h1>연결할 금융기관을 선택하세요</h1>
        <p class="intro">데모에서는 선택한 은행의 임시 계좌 데이터를 불러옵니다.</p>
        <div class="bank-list">
          <button
            v-for="bank in ['KB국민은행', '신한은행', '우리은행', '하나은행']"
            :key="bank"
            :class="{ selected: selectedBanks.includes(bank) }"
            type="button"
            @click="toggleBank(bank)"
          >
            <span>{{ bank.slice(0, 2) }}</span><strong>{{ bank }}</strong><small>{{ selectedBanks.includes(bank) ? '선택됨 ✓' : '연결 가능' }}</small>
          </button>
        </div>
      </template>

      <template v-else>
        <p class="eyebrow">STEP 3 · 고정지출 확인</p>
        <h1>반복되는 지출을 확인해 주세요</h1>
        <p class="intro">체크한 항목만 월 고정지출과 시뮬레이션에 반영됩니다.</p>
        <div class="fixed-summary"><span>이번 달 예상 고정지출</span><strong>{{ totalFixed.toLocaleString() }}원</strong></div>
        <label v-for="item in fixedExpenses" :key="item.name" class="fixed-item">
          <input v-model="item.checked" type="checkbox" />
          <span>{{ item.name }}</span>
          <strong>-{{ item.amount.toLocaleString() }}원</strong>
        </label>
      </template>

      <button class="btn btn-primary next-button" type="button" @click="next">
        {{ step === 3 ? '확인 완료하고 홈으로 →' : '다음 단계' }}
      </button>
    </section>
  </main>
</template>

<style scoped>
.onboarding-page {
  min-height: 100dvh;
  padding: 30px clamp(20px, 5vw, 64px);
  background:
    radial-gradient(circle at 90% 10%, rgb(251 237 176 / 40%), transparent 28%),
    var(--background);
}

.onboarding-header {
  display: flex;
  justify-content: space-between;
}

.onboarding-header button {
  color: var(--muted);
  font-size: 13px;
}

.onboarding-card {
  width: min(100%, 520px);
  margin: 65px auto 0;
}

.progress {
  height: 5px;
  overflow: hidden;
  margin-bottom: 34px;
  border-radius: 999px;
  background: #e9ebf1;
}

.progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width 0.25s ease;
}

.eyebrow {
  color: var(--primary);
  font-size: 12px;
  font-weight: 800;
}

.onboarding-card h1 {
  margin-top: 5px;
  color: var(--primary);
  font-size: 28px;
}

.intro {
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
}

.form-grid {
  display: grid;
  gap: 17px;
  margin-top: 30px;
}

.date-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.bank-list {
  display: grid;
  gap: 10px;
  margin-top: 28px;
}

.bank-list button {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: white;
  text-align: left;
}

.bank-list button.selected {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.bank-list button > span {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  background: var(--accent);
  color: var(--primary);
  font-size: 10px;
  font-weight: 900;
}

.bank-list small {
  color: var(--primary);
  font-size: 11px;
}

.fixed-summary {
  display: flex;
  align-items: end;
  justify-content: space-between;
  margin-top: 26px;
  padding: 20px;
  border-radius: 16px;
  background: var(--sky-soft);
  color: var(--muted);
  font-size: 12px;
}

.fixed-summary strong {
  color: var(--primary);
  font-size: 23px;
}

.fixed-item {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  gap: 10px;
  padding: 15px 4px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}

.fixed-item strong {
  color: var(--primary);
}

.next-button {
  width: 100%;
  margin-top: 30px;
}

@media (max-width: 600px) {
  .onboarding-page {
    padding: 16px;
  }

  .onboarding-card {
    margin-top: 55px;
  }

  .date-grid {
    grid-template-columns: 1fr;
  }
}
</style>
