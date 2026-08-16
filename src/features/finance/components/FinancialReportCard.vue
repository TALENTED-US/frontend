<script setup>
import { computed } from 'vue'
import {
  financeState,
  financialReport,
  loadTransactions,
} from '@/features/finance/financeStore'

const formatCompactWon = (value) => {
  const amount = Math.max(0, Math.round(Number(value) || 0))
  if (amount >= 10000 && amount % 10000 === 0) {
    return `${(amount / 10000).toLocaleString('ko-KR')}만원`
  }
  return `${amount.toLocaleString('ko-KR')}원`
}

const incomeBarWidth = computed(() => {
  const maximum = Math.max(financialReport.value.monthlyIncome, financialReport.value.monthlyExpense, 1)
  return (financialReport.value.monthlyIncome / maximum) * 100
})
const expenseBarWidth = computed(() => {
  const maximum = Math.max(financialReport.value.monthlyIncome, financialReport.value.monthlyExpense, 1)
  return (financialReport.value.monthlyExpense / maximum) * 100
})
const depletionMonthsLabel = computed(() => financialReport.value.depletionMonths?.toFixed(1))
const isInitialLoading = computed(() => !financeState.loaded && !financeState.error)
const isEmpty = computed(
  () => financeState.loaded && !financeState.loading && !financeState.error && financeState.transactions.length === 0,
)

async function retry() {
  try {
    await loadTransactions(true)
  } catch {}
}
</script>

<template>
  <section class="financial-report">
    <div class="financial-report__heading">
      <h2>현재 재정 리포트</h2>
      <RouterLink to="/finance">전체 내역 <span>›</span></RouterLink>
    </div>

    <div v-if="isInitialLoading" class="financial-report__state" role="status">
      현재 재정 리포트를 불러오는 중이에요.
    </div>
    <div v-else-if="financeState.error" class="financial-report__state financial-report__state--error" role="alert">
      <span>{{ financeState.error }}</span>
      <button type="button" :disabled="financeState.loading" @click="retry">
        {{ financeState.loading ? '불러오는 중' : '다시 시도' }}
      </button>
    </div>
    <div v-else-if="isEmpty" class="financial-report__state">
      표시할 거래 내역이 없어요.
    </div>
    <div v-else class="financial-report__content">
      <div class="financial-report__summary">
        <article>
          <span>총자산</span>
          <strong>{{ formatCompactWon(financialReport.totalAssets) }}</strong>
        </article>
        <article>
          <span>매달 줄어드는 금액</span>
          <strong>{{ formatCompactWon(financialReport.monthlyDecrease) }}</strong>
        </article>
      </div>
      <div class="financial-report__bars">
        <div class="financial-report__bar-row">
          <div>
            <span>월평균 수입</span><strong>{{ formatCompactWon(financialReport.monthlyIncome) }}</strong>
          </div>
          <div class="financial-report__track">
            <i :style="{ width: `${incomeBarWidth}%` }" />
          </div>
        </div>
        <div class="financial-report__bar-row">
          <div>
            <span>월평균 지출</span><strong>{{ formatCompactWon(financialReport.monthlyExpense) }}</strong>
          </div>
          <div class="financial-report__track">
            <i :style="{ width: `${expenseBarWidth}%` }" />
          </div>
        </div>
      </div>
      <p class="financial-report__notice">
        <template v-if="depletionMonthsLabel === undefined">
          현재 속도라면 총자산이 줄어들지 않아요
        </template>
        <template v-else>
          지금 속도라면 총자산 {{ formatCompactWon(financialReport.totalAssets) }}은
          <strong>약 {{ depletionMonthsLabel }}개월 뒤</strong> 소진돼요
        </template>
      </p>
    </div>
  </section>
</template>

<style scoped>
.financial-report {
  min-width: 0;
}

.financial-report__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.financial-report__heading h2 {
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
}

.financial-report__heading a {
  color: #555;
  font-size: 15px;
  font-weight: var(--type-action-weight);
}

.financial-report__heading a span {
  margin-left: 3px;
}

.financial-report__content {
  display: grid;
  gap: 20px;
  margin-top: 10px;
}

.financial-report__summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.financial-report__summary article {
  display: grid;
  min-height: 112px;
  align-content: center;
  gap: 6px;
  padding: 20px 24px;
  border-radius: 16px;
  background: #fff;
}

.financial-report__summary span {
  color: #657086;
  font-size: 14px;
  font-weight: 600;
}

.financial-report__summary strong {
  min-width: 0;
  color: #394760;
  font-size: clamp(16px, 2.2vw, 20px);
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.financial-report__bars {
  display: grid;
  gap: 12px;
}

.financial-report__bar-row > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
}

.financial-report__bar-row span {
  position: relative;
  padding-left: 17px;
  color: #171717;
  font-size: 15px;
  font-weight: 800;
}

.financial-report__bar-row span::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f1b94c;
  content: '';
  transform: translateY(-50%);
}

.financial-report__bar-row strong {
  color: #f1b94c;
  font-size: 18px;
  font-weight: 800;
}

.financial-report__track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #fff3c8;
}

.financial-report__track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #f1b94c;
  transition: width 0.25s ease;
}

.financial-report__notice,
.financial-report__state {
  padding: 14px 18px;
  border-radius: 10px;
  background: #fbf7df;
  color: #555f73;
  font-size: 14px;
  line-height: 1.5;
}

.financial-report__notice strong {
  font-weight: 500;
}

.financial-report__state {
  min-height: 112px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  text-align: center;
}

.financial-report__state--error {
  gap: 12px;
  background: #fff0f0;
  color: #c74747;
}

.financial-report__state button {
  color: inherit;
  font-weight: 800;
  text-decoration: underline;
}

@media (max-width: 767px) {
  .financial-report__heading {
    margin-bottom: 8px;
  }

  .financial-report__content {
    gap: 14px;
  }

  .financial-report__summary {
    gap: 9px;
  }

  .financial-report__summary article {
    min-height: 104px;
    padding: 14px 16px;
    border-radius: 15px;
  }

  .financial-report__summary strong {
    font-size: clamp(15px, 5.6vw, 20px);
    white-space: nowrap;
  }

  .financial-report__bars {
    gap: 8px;
  }

  .financial-report__bar-row > div:first-child {
    margin-bottom: 4px;
  }

  .financial-report__bar-row span {
    font-size: 13px;
  }

  .financial-report__notice,
  .financial-report__state {
    padding: 9px 14px;
    font-size: 12px;
  }
}
</style>
