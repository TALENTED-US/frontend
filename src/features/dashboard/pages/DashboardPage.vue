<script setup>
import { computed, ref } from "vue";
import { dashboard } from "@/data/mockData";
import AppIcon from "@/components/ui/AppIcon.vue";
import { useSessionStore } from "@/stores/session";
import buttieRiskImage from "@/assets/images/dashboard/buttie-melting.png";
import buttieCautionImage from "@/assets/images/dashboard/buttie-caution.png";
import buttieStableImage from "@/assets/images/dashboard/buttie-stable.png";
import { financeTransactions } from "@/features/finance/financeStore";
import { analyzePreviousCompletedMonths } from "@/features/finance/financeAnalytics";
import { useSimulationStore } from "@/features/simulation/stores/simulation";

const session = useSessionStore();
const simulation = useSimulationStore();
const DAY_MS = 24 * 60 * 60 * 1000;
const AVERAGE_MONTH_DAYS = 365.2425 / 12;

function parseLocalDate(value) {
  const [year, month, day] = String(value || "")
    .replaceAll(".", "-")
    .split("-")
    .map(Number);

  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function differenceInDays(from, to) {
  if (!from || !to) return 0;
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / DAY_MS));
}

function addMonthsClamped(date, months) {
  const result = new Date(date);
  const targetDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(targetDay, lastDay));
  return result;
}

function calendarDuration(from, to) {
  if (!from || !to || to <= from) return { months: 0, days: 0 };

  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    to.getMonth() -
    from.getMonth();
  let anchor = addMonthsClamped(from, months);

  if (anchor > to) {
    months -= 1;
    anchor = addMonthsClamped(from, months);
  }

  return {
    months,
    days: Math.max(0, Math.round((to.getTime() - anchor.getTime()) / DAY_MS)),
  };
}

function formatWon(value, { sign = false } = {}) {
  const amount = Math.round(Number(value) || 0);
  const prefix = sign && amount > 0 ? "+" : "";
  return `${prefix}${amount.toLocaleString("ko-KR")}원`;
}

function formatCompactWon(value) {
  const amount = Math.max(0, Math.round(Number(value) || 0));

  if (amount >= 10000 && amount % 10000 === 0) {
    return `${(amount / 10000).toLocaleString("ko-KR")}만원`;
  }

  return formatWon(amount);
}

function formatSignedCompactWon(value) {
  const amount = Math.round(Number(value) || 0);
  if (!amount) return formatCompactWon(0);
  return `${amount > 0 ? "+" : "-"}${formatCompactWon(Math.abs(amount))}`;
}

function formatMonthLabel(date) {
  return `${String(date.getFullYear()).slice(2)}년 ${date.getMonth() + 1}월`;
}

function formatDateDots(value) {
  const date = parseLocalDate(value);
  if (!date) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join(".");
}

function expenseQuestName(name) {
  return name === "교통" ? "교통비" : name;
}

const currentUser = computed(() => session.currentUser);
const today = computed(() => startOfToday());
const preparationStartDate = computed(() =>
  parseLocalDate(currentUser.value.startDate),
);
const targetEmploymentDate = computed(() =>
  parseLocalDate(currentUser.value.goalDate || currentUser.value.targetDate),
);

const remainingDays = computed(() =>
  differenceInDays(today.value, targetEmploymentDate.value),
);
const remainingMonthsValue = computed(
  () => remainingDays.value / AVERAGE_MONTH_DAYS,
);
const remainingDuration = computed(() =>
  calendarDuration(today.value, targetEmploymentDate.value),
);
const preparationDuration = computed(() =>
  calendarDuration(preparationStartDate.value, targetEmploymentDate.value),
);
const preparationMonthsValue = computed(
  () =>
    preparationDuration.value.months +
    preparationDuration.value.days / AVERAGE_MONTH_DAYS,
);

const availableAssets = computed(() =>
  Math.max(0, Number(dashboard.liquidAssets ?? dashboard.totalAssets) || 0),
);
const recentFinancialAnalysis = computed(() =>
  analyzePreviousCompletedMonths(financeTransactions.value, today.value),
);
const monthlyExpense = computed(() => recentFinancialAnalysis.value.monthlyExpense);
const monthlyIncome = computed(() => recentFinancialAnalysis.value.monthlyIncome);
const survivalMonths = computed(() =>
  monthlyExpense.value > 0 ? availableAssets.value / monthlyExpense.value : 0,
);
const displayedSurvivalMonths = computed(() => survivalMonths.value.toFixed(1));
const hasConfirmedScenario = computed(() => simulation.state.confirmed);
const displayedExpectedMonths = computed(() =>
  hasConfirmedScenario.value ? simulation.expectedMonths.toFixed(1) : "-",
);
const confirmedExpenseRows = computed(() =>
  simulation.state.expenseApplied
    ? simulation.selectedExpenses.map((item) => ({
        id: `expense-${item.id}`,
        icon: item.icon,
        name: `${expenseQuestName(item.name)} ${formatCompactWon(item.saving)} 줄이기`,
        subtitle: "",
        amount: -item.saving,
        kind: "expense",
      }))
    : [],
);
const confirmedIncomeRows = computed(() =>
  simulation.state.incomes.map((item) => ({
    id: `income-${item.id}`,
    icon: "💼",
    name: item.name,
    subtitle:
      item.type === "monthly"
        ? `정기수입 · 매월 ${parseLocalDate(item.startDate)?.getDate() || 1}일`
        : `일회성 수입 · ${formatDateDots(item.startDate)}`,
    amount: item.amount,
    kind: "income",
  })),
);
const confirmedPolicyRows = computed(() =>
  simulation.state.policies.map((item) => ({
    id: `policy-${item.id}`,
    icon: "🏛️",
    name: item.name,
    subtitle:
      item.id === "youth-saving"
        ? "일시 60만원 · 3년 만기 시 정부지원금"
        : item.detail || item.description || "정책 혜택",
    amount: item.amount,
    kind: "policy",
  })),
);
const questTab = ref("active");
const allQuestRows = computed(() => [
  ...confirmedExpenseRows.value,
  ...confirmedIncomeRows.value,
  ...confirmedPolicyRows.value,
]);
const completedQuestIds = computed(
  () => new Set(simulation.state.completedQuestIds || []),
);
const completedQuestCount = computed(
  () => allQuestRows.value.filter((item) => completedQuestIds.value.has(item.id)).length,
);
const activeQuestCount = computed(
  () => allQuestRows.value.length - completedQuestCount.value,
);
const questGroups = computed(() => [
  {
    key: "expense",
    title: "지출 줄이기",
    amount: confirmedExpenseRows.value.reduce((sum, item) => sum + item.amount, 0),
    rows: confirmedExpenseRows.value,
  },
  {
    key: "income",
    title: "수입 늘리기",
    amount: confirmedIncomeRows.value.reduce((sum, item) => sum + item.amount, 0),
    rows: confirmedIncomeRows.value,
  },
  {
    key: "policy",
    title: "정책 혜택",
    action: "신청 가능",
    rows: confirmedPolicyRows.value,
  },
]);
const visibleQuestGroups = computed(() =>
  questGroups.value
    .map((group) => ({
      ...group,
      rows: group.rows.filter((item) =>
        questTab.value === "completed"
          ? completedQuestIds.value.has(item.id)
          : !completedQuestIds.value.has(item.id),
      ),
    }))
    .filter((group) => group.rows.length),
);
const oneTimeBenefitText = computed(() => {
  const total = simulation.oneTimeIncome + simulation.oneTimePolicy;
  return total > 0
    ? `일시 수입·혜택 ${formatCompactWon(total)} 별도`
    : "정기 반영 금액 기준";
});
function isQuestCompleted(id) {
  return completedQuestIds.value.has(id);
}

function toggleQuest(id) {
  simulation.toggleQuestCompletion(id);
}
const achievementRate = computed(() => {
  if (remainingMonthsValue.value <= 0) return 100;
  return Math.min(
    100,
    Math.max(
      0,
      Math.round((survivalMonths.value / remainingMonthsValue.value) * 100),
    ),
  );
});
const shortageMonths = computed(() =>
  Math.max(0, remainingMonthsValue.value - survivalMonths.value),
);
const financialStatus = computed(() => {
  if (achievementRate.value <= 30) {
    const shortage = Math.max(1, Math.ceil(shortageMonths.value));
    return {
      key: "risk",
      label: "위험",
      message: `버티는 기간이 목표보다 ${shortage}개월 부족해서 버티가 녹고 있어요`,
      image: buttieRiskImage,
      imageAlt: "거의 녹아내린 위험 상태의 버티",
    };
  }

  if (achievementRate.value < 80) {
    return {
      key: "caution",
      label: "주의",
      message: "버티는 기간이 목표보다 조금 부족해 주의가 필요해요",
      image: buttieCautionImage,
      imageAlt: "조금 녹아내린 주의 상태의 버티",
    };
  }

  return {
    key: "stable",
    label: "안정",
    message: "버티는 기간이 목표를 넉넉히 채워서 걱정 없어요",
    image: buttieStableImage,
    imageAlt: "온전한 안정 상태의 버티",
  };
});

const initialAssets = computed(() =>
  Math.max(0, Number(dashboard.initialAssets ?? dashboard.totalAssets) || 0),
);
const financialRiskAmount = computed(() =>
  Math.round(initialAssets.value * 0.2),
);
const financialStabilityAmount = computed(() =>
  Math.round(
    monthlyExpense.value * preparationMonthsValue.value +
      financialRiskAmount.value,
  ),
);
const netCashFlow = computed(() => monthlyIncome.value - monthlyExpense.value);
const targetDateText = computed(() => {
  const date = targetEmploymentDate.value;
  if (!date) return "-";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
});
const remainingDurationText = computed(() => {
  if (remainingDays.value <= 0) return "목표일 도달";
  return `${remainingDuration.value.months}개월 ${remainingDuration.value.days}일`;
});
const currentMonthText = computed(() => formatMonthLabel(today.value));
const targetMonthText = computed(() =>
  targetEmploymentDate.value
    ? formatMonthLabel(targetEmploymentDate.value)
    : "-",
);
</script>

<template>
  <section class="page dashboard">
    <header class="dashboard__heading">
      <h1>버티와 함께하는 취준 여정, 지금 확인해 보세요</h1>
      <p>취업 준비 기간 동안의 재정 상태를 관리해보세요</p>
    </header>

    <section class="survival-section" aria-labelledby="survival-title">
      <h2 id="survival-title" class="mobile-only section-label">버티는 기간</h2>
      <article
        :class="[
          'survival-card',
          `survival-card--${financialStatus.key}`,
        ]"
      >
        <div class="survival-card__metric survival-card__metric--current">
          <span>버티는 기간</span>
          <strong>{{ displayedSurvivalMonths }} <i>개월</i></strong>
        </div>

        <div class="survival-card__metric survival-card__metric--expected">
          <span>예상 버티는 기간</span>
          <strong>{{ displayedExpectedMonths }} <i>개월</i></strong>
          <small v-if="!hasConfirmedScenario">시뮬레이션하면 확인 가능</small>
          <small v-else>확정 시나리오 기준</small>
        </div>

        <div class="survival-card__progress-area">
          <b>목표 충족률 {{ achievementRate }}%</b>
          <div
            class="survival-card__progress"
            role="progressbar"
            aria-label="목표 버티는 기간 충족률"
            :aria-valuenow="achievementRate"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span :style="{ width: `${achievementRate}%` }" />
          </div>
          <div class="survival-card__legend">
            <small>현재 {{ currentMonthText }}</small>
            <small>목표 {{ targetMonthText }}</small>
          </div>
        </div>

        <div class="survival-card__character">
          <span class="survival-card__character-halo" aria-hidden="true" />
          <img
            :src="financialStatus.image"
            :alt="financialStatus.imageAlt"
          />
          <b class="survival-card__level survival-card__level--mobile">Lv.1</b>
        </div>

        <div class="survival-card__message">
          <p>{{ financialStatus.message }}</p>
          <em>{{ financialStatus.label }}</em>
        </div>

        <b class="survival-card__level survival-card__level--desktop">Lv.1</b>
      </article>
    </section>

    <section class="summary">
      <div class="section-head">
        <h2>재정 요약</h2>
        <RouterLink to="/finance">전체 내역 <span>›</span></RouterLink>
      </div>
      <div class="summary__grid">
        <article class="summary-card summary-card--asset">
          <span>총 자산</span>
          <strong>{{ formatCompactWon(dashboard.totalAssets) }}</strong>
          <small>연결 계좌 기준</small>
        </article>
        <article class="summary-card summary-card--income">
          <span>↗ 최근 3개월 월평균 수입</span>
          <strong>{{ formatWon(monthlyIncome, { sign: true }) }}</strong>
        </article>
        <article class="summary-card summary-card--expense">
          <span>↘ 최근 3개월 월평균 지출</span>
          <strong>{{ formatWon(-monthlyExpense) }}</strong>
        </article>
        <article class="summary-card summary-card--cash">
          <span>월평균 순현금흐름<small>(수입-지출)</small></span>
          <strong>{{ formatWon(netCashFlow) }}</strong>
        </article>
      </div>
    </section>

    <div class="dashboard__bottom">
      <section class="quest-section">
        <div class="block-heading">
          <h2>퀘스트 현황</h2>
          <span v-if="hasConfirmedScenario" class="confirmed-badge">확정됨</span>
        </div>

        <article v-if="hasConfirmedScenario" class="quest-card">
          <div class="quest-tabs" role="tablist" aria-label="퀘스트 상태">
            <button
              type="button"
              :class="{ 'is-active': questTab === 'active' }"
              @click="questTab = 'active'"
            >
              진행 중 {{ activeQuestCount }}
            </button>
            <button
              type="button"
              :class="{ 'is-active': questTab === 'completed' }"
              @click="questTab = 'completed'"
            >
              완료 {{ completedQuestCount }}
            </button>
          </div>

          <div v-if="visibleQuestGroups.length" class="quest-groups">
            <section
              v-for="group in visibleQuestGroups"
              :key="group.key"
              class="quest-group"
              :class="`quest-group--${group.key}`"
            >
              <div class="quest-group__heading">
                <h3><i aria-hidden="true"></i>{{ group.title }}</h3>
                <strong v-if="group.amount">
                  {{ formatSignedCompactWon(group.amount) }}
                </strong>
                <strong v-else>{{ group.action }}</strong>
              </div>

              <button
                v-for="item in group.rows"
                :key="item.id"
                type="button"
                class="quest-row"
                :class="[`quest-row--${item.kind}`, { 'is-completed': isQuestCompleted(item.id) }]"
                :aria-pressed="isQuestCompleted(item.id)"
                @click="toggleQuest(item.id)"
              >
                <span class="quest-row__icon" aria-hidden="true">{{ item.icon }}</span>
                <span class="quest-row__copy">
                  <strong>{{ item.name }}</strong>
                  <small v-if="item.subtitle">{{ item.subtitle }}</small>
                </span>
                <strong class="quest-row__amount">
                  {{ formatSignedCompactWon(item.amount) }}
                </strong>
                <span class="quest-row__check" aria-hidden="true">
                  {{ isQuestCompleted(item.id) ? "✓" : "" }}
                </span>
              </button>
            </section>
          </div>
          <p v-else class="quest-card__empty">
            {{ questTab === "completed" ? "완료한 퀘스트가 아직 없어요." : "진행 중인 퀘스트가 없어요." }}
          </p>

          <footer class="quest-card__footer">
            <div>
              <span>월 순지출 개선액 (지출·수입 기준)</span>
              <strong>{{ formatCompactWon(simulation.monthlyImprovement) }} / 월</strong>
            </div>
            <p>{{ oneTimeBenefitText }}</p>
            <RouterLink to="/simulation">시나리오 수정하기 <span>→</span></RouterLink>
          </footer>
        </article>

        <article v-else class="quest-empty">
          <h3>진행 중인 퀘스트가 아직 없어요</h3>
          <p>지출 절감, 수입, 정책 혜택을 조합해 나만의 시나리오를 만들어보세요.</p>
          <RouterLink to="/simulation/new">시뮬레이션 하러가기 <span>→</span></RouterLink>
        </article>
      </section>

      <section>
        <div class="section-head section-head--goal">
          <h2>목표 정보</h2>
        </div>
        <article class="goal-card">
          <div>
            <AppIcon name="calendar" :size="15" />
            <span>목표 취업일</span>
            <strong>{{ targetDateText }}</strong>
          </div>
          <div>
            <AppIcon name="clock" :size="15" />
            <span>남은 준비 기간</span>
            <strong>{{ remainingDurationText }}</strong>
          </div>
          <div>
            <b class="goal-card__symbol">!</b>
            <span>재정 위험 금액</span>
            <strong>{{ formatCompactWon(financialRiskAmount) }}</strong>
          </div>
          <div>
            <b class="goal-card__symbol">◎</b>
            <span>재정 안정 금액</span>
            <strong>{{ formatCompactWon(financialStabilityAmount) }}</strong>
          </div>
        </article>
      </section>
    </div>
  </section>
</template>

<style scoped>
.dashboard {
  padding-bottom: 28px;
}

.dashboard__heading {
  margin-bottom: 26px;
}

.dashboard__heading h1 {
  font-size: var(--font-page-title);
  line-height: 1.35;
}

.dashboard__heading p {
  margin-top: 8px;
  color: var(--muted);
  font-size: var(--font-small);
}

.section-label {
  margin-bottom: 7px;
  font-size: var(--font-body);
}

.survival-card {
  position: relative;
  min-height: 300px;
  overflow: hidden;
  border-radius: 28px;
  background: rgb(251 237 176 / 54%);
  box-shadow: none;
}

.survival-card__metric {
  position: absolute;
  z-index: 2;
  top: 28px;
  display: grid;
  gap: 2px;
}

.survival-card__metric--current {
  left: 34px;
}

.survival-card__metric--expected {
  right: 34px;
  justify-items: end;
  text-align: right;
}

.survival-card__metric span {
  color: #2a2927;
  font-size: var(--font-body);
  font-weight: 700;
}

.survival-card__metric strong {
  color: #6b4e3d;
  font-size: var(--font-display);
  line-height: 1.2;
}

.survival-card__metric i {
  color: #5e6470;
  font-size: var(--font-body);
  font-style: normal;
  font-weight: 500;
}

.survival-card__metric small {
  color: #9aa2b1;
  font-size: var(--font-caption);
}

.survival-card__progress-area {
  position: absolute;
  z-index: 2;
  bottom: 23px;
  left: 24px;
  width: 30%;
}

.survival-card__progress-area b {
  display: block;
  margin-bottom: 5px;
  color: #8a5a0e;
  font-size: var(--font-caption);
}

.survival-card__progress {
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: #f8fafc;
}

.survival-card__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #f1b94c;
  transition: width 0.25s ease;
}

.survival-card__legend {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  color: #5f6773;
}

.survival-card__character {
  position: absolute;
  z-index: 1;
  top: 27px;
  left: 50%;
  width: 290px;
  height: 200px;
  transform: translateX(-50%);
}

.survival-card__character-halo {
  position: absolute;
  top: 10px;
  left: 50%;
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: rgb(255 255 255 / 57%);
  transform: translateX(-50%);
}

.survival-card__character img {
  position: absolute;
  top: 26px;
  left: 50%;
  width: 286px;
  height: 170px;
  object-fit: contain;
  transform: translateX(-50%);
}

.survival-card__level {
  min-width: 58px;
  padding: 5px 13px;
  border-radius: 999px;
  background: var(--primary);
  color: white;
  font-size: var(--font-caption);
  text-align: center;
}

.survival-card__level--mobile {
  display: none;
  position: absolute;
  right: 6px;
  bottom: 8px;
}

.survival-card__level--desktop {
  position: absolute;
  z-index: 3;
  right: 34px;
  bottom: 24px;
}

.survival-card__message {
  position: absolute;
  z-index: 3;
  bottom: 13px;
  left: 50%;
  display: flex;
  width: 34%;
  flex-direction: column-reverse;
  align-items: center;
  gap: 7px;
  text-align: center;
  transform: translateX(-50%);
}

.survival-card__message p {
  color: #4a3428;
  font-size: var(--font-small);
  font-weight: 800;
}

.survival-card__message em {
  display: inline-flex;
  min-width: 58px;
  min-height: 24px;
  align-items: center;
  justify-content: center;
  margin-top: 0;
  border-radius: 999px;
  background: #e4574c;
  color: white;
  font-size: var(--font-caption);
  font-style: normal;
  font-weight: 800;
}

.survival-card--caution .survival-card__message em {
  background: #eea63a;
}

.survival-card--stable .survival-card__message em {
  background: var(--success);
}

.summary {
  margin-top: 32px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-head h2,
.block-title {
  font-size: var(--font-card-title);
}

.section-head a {
  color: #555;
  font-size: var(--font-small);
}

.section-head a span {
  margin-left: 3px;
}

.summary__grid {
  display: grid;
  grid-template-columns: 1.15fr repeat(3, 1fr);
  gap: 18px;
}

.summary-card {
  display: grid;
  min-height: 92px;
  align-content: center;
  gap: 4px;
  padding: 16px 22px;
  border-radius: 14px;
}

.summary-card span,
.summary-card small {
  color: #626b79;
  font-size: var(--font-caption);
}

.summary-card strong {
  color: #46556e;
  font-size: var(--font-card-title);
}

.summary-card--asset {
  background: rgb(147 178 248 / 40%);
}

.summary-card--asset strong {
  color: #173d9f;
  font-size: var(--font-page-title);
}

.summary-card--income {
  background: rgb(10 22 128 / 8%);
}

.summary-card--income span {
  color: var(--primary);
}

.summary-card--expense {
  background: rgb(240 87 79 / 10%);
}

.summary-card--expense span {
  color: #f0574f;
}

.summary-card--cash {
  background: #f1eff9;
}

.summary-card--cash span {
  color: #7361ad;
}

.summary-card--cash span small {
  margin-left: 2px;
  color: inherit;
  font-size: var(--font-caption);
}

.dashboard__bottom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  margin-top: 38px;
}

.block-title {
  margin-bottom: 12px;
}

.simulation-cta {
  display: flex;
  min-height: 182px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 28px;
  border-radius: 16px;
  background: rgb(251 237 176 / 62%);
}

.simulation-cta h3 {
  color: #684f3c;
  font-size: var(--font-card-title);
  line-height: 1.4;
}

.simulation-cta p {
  margin-top: 10px;
  color: #766e66;
  font-size: var(--font-caption);
  line-height: 1.65;
}

.simulation-cta__button {
  flex: none;
  padding: 12px 22px;
  border-radius: 999px;
  background: var(--accent-strong);
  color: white;
  font-size: var(--font-small);
  font-weight: 800;
}

.simulation-cta__confirmed {
  display: grid;
  flex: 1;
  gap: 14px;
}

.simulation-cta__result {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
}

.simulation-cta__result span {
  color: #756b62;
  font-size: var(--font-caption);
}

.simulation-cta__result strong {
  color: #573b2c;
  font-size: var(--font-card-title);
}

.simulation-cta__result em {
  padding: 4px 9px;
  border-radius: 999px;
  background: #dff8ee;
  color: #18a971;
  font-size: var(--font-caption);
  font-weight: 800;
}

.simulation-cta__confirmed ul {
  display: grid;
  gap: 7px;
  list-style: none;
}

.simulation-cta__confirmed li {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  font-size: var(--font-caption);
}

.simulation-cta__confirmed li strong.is-expense { color: var(--danger); }
.simulation-cta__confirmed li strong.is-income { color: #15a66f; }
.simulation-cta__confirmed li strong.is-policy { color: #8167c9; }

.section-head--goal {
  min-height: 24px;
}

.goal-card {
  display: grid;
  min-height: 182px;
  grid-template-columns: 1fr 1fr;
  gap: 22px 30px;
  padding: 28px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: white;
  box-shadow: var(--shadow-sm);
}

.goal-card > div {
  display: grid;
  grid-template-columns: 18px 1fr;
  align-content: center;
  align-items: center;
}

.goal-card span {
  color: #676f7b;
  font-size: var(--font-small);
}

.goal-card strong {
  grid-column: 1 / -1;
  margin-top: 5px;
  font-size: var(--font-card-title);
}

.goal-card__symbol {
  display: grid;
  width: 15px;
  height: 15px;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  color: #606a7a;
  font-size: var(--font-caption);
  line-height: 1;
}

.dashboard__bottom {
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  align-items: start;
}

.block-heading {
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.block-heading h2 {
  font-size: var(--font-section-title);
  font-weight: 800;
}

.confirmed-badge {
  padding: 7px 18px;
  border-radius: 999px;
  background: #f4b945;
  box-shadow: var(--shadow-sm);
  color: white;
  font-size: var(--font-small);
  font-weight: 800;
}

.quest-card,
.quest-empty,
.goal-setting-card {
  border: 1px solid var(--border);
  border-radius: 22px;
  background: white;
  box-shadow: var(--shadow-sm);
}

.quest-card {
  padding: 22px 24px 18px;
}

.quest-tabs {
  display: grid;
  width: min(72%, 520px);
  height: 44px;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 20px;
  padding: 3px;
  border: 1px solid #e1e4ea;
  border-radius: 999px;
  background: #f2f3f6;
}

.quest-tabs button {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #9a9da5;
  font-family: inherit;
  font-size: var(--font-body);
  font-weight: 700;
  cursor: pointer;
}

.quest-tabs button.is-active {
  background: white;
  box-shadow: var(--shadow-sm);
  color: var(--text);
  font-weight: 800;
}

.quest-groups {
  display: grid;
  gap: 18px;
}

.quest-group {
  display: grid;
  gap: 9px;
}

.quest-group__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.quest-group__heading h3 {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: var(--font-body);
  font-weight: 800;
}

.quest-group__heading h3 i {
  width: 12px;
  height: 12px;
  flex: none;
  border-radius: 50%;
  background: var(--danger);
}

.quest-group--income .quest-group__heading h3 i { background: #3ed79d; }
.quest-group--policy .quest-group__heading h3 i { background: #8e79cd; }

.quest-group__heading > strong {
  color: var(--danger);
  font-size: var(--font-body);
  font-weight: 800;
}

.quest-group--income .quest-group__heading > strong { color: #23bb82; }
.quest-group--policy .quest-group__heading > strong { color: #8e79cd; }

.quest-row {
  display: grid;
  width: 100%;
  min-height: 62px;
  grid-template-columns: 42px minmax(0, 1fr) auto 34px;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid #e5e7ec;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-sm);
  color: var(--text);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.quest-row--expense { background: #fff2f2; }
.quest-row--income { background: #ecfbf5; }
.quest-row--policy { background: #f6f3fc; }

.quest-row.is-completed {
  opacity: .62;
}

.quest-row__icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid #e1e4e9;
  border-radius: 50%;
  background: white;
  font-size: 17px;
}

.quest-row__copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.quest-row__copy strong,
.quest-row__amount {
  font-size: var(--font-body);
  font-weight: 800;
}

.quest-row__copy small {
  overflow: hidden;
  color: #727985;
  font-size: var(--font-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quest-row__amount {
  color: var(--danger);
  white-space: nowrap;
}

.quest-row--income .quest-row__amount { color: #23bb82; }
.quest-row--policy .quest-row__amount { color: #8e79cd; }

.quest-row__check {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 2px solid #cfdae7;
  border-radius: 10px;
  background: white;
  color: white;
  font-size: 18px;
  font-weight: 900;
}

.quest-row.is-completed .quest-row__check {
  border-color: #666;
  background: #666;
}

.quest-card__empty {
  display: grid;
  min-height: 210px;
  place-items: center;
  color: #858b95;
  font-weight: 700;
}

.quest-card__footer {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 4px 18px;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid #e4e6ea;
}

.quest-card__footer > div {
  display: contents;
}

.quest-card__footer span,
.quest-card__footer p {
  color: #818793;
  font-size: var(--font-small);
}

.quest-card__footer strong {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  font-size: var(--font-card-title);
  font-weight: 900;
  white-space: nowrap;
}

.quest-card__footer a {
  grid-column: 1 / -1;
  justify-self: center;
  margin-top: 4px;
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 800;
}

.quest-empty {
  display: grid;
  min-height: 260px;
  place-content: center;
  gap: 10px;
  padding: 28px;
  text-align: center;
}

.quest-empty h3 { font-weight: 800; }
.quest-empty p { max-width: 420px; color: #727985; line-height: 1.6; }
.quest-empty a { margin-top: 8px; color: var(--accent-strong); font-weight: 800; }

.block-heading--goal a {
  color: #6f7580;
  font-size: var(--font-small);
  font-weight: 700;
}

.goal-setting-card {
  display: grid;
  min-height: 246px;
  grid-template-columns: 1fr 1fr;
  gap: 34px 24px;
  align-content: center;
  padding: 30px 26px;
}

.goal-setting-card > div {
  display: grid;
  gap: 8px;
}

.goal-setting-card span {
  color: #7c8390;
  font-size: var(--font-small);
}

.goal-setting-card strong {
  font-size: var(--font-card-title);
  font-weight: 900;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .dashboard {
    padding-bottom: 8px;
  }

  .dashboard__heading {
    display: none;
  }

  .survival-card {
    min-height: 457px;
    border-radius: 28px;
  }

  .survival-card__metric {
    top: 23px;
  }

  .survival-card__metric--current {
    left: 20px;
  }

  .survival-card__metric--expected {
    right: 20px;
  }

  .survival-card__metric span {
    font-size: var(--font-small);
  }

  .survival-card__metric strong {
    font-size: var(--font-display);
  }

  .survival-card__metric i {
    font-size: var(--font-body);
  }

  .survival-card__progress-area {
    top: 106px;
    bottom: auto;
    left: 20px;
    width: calc(100% - 40px);
  }

  .survival-card__progress {
    height: 14px;
  }

  .survival-card__character {
    top: 137px;
    width: 275px;
    height: 185px;
  }

  .survival-card__character-halo {
    display: none;
  }

  .survival-card__character img {
    top: 0;
    width: 275px;
    height: 185px;
  }

  .survival-card__level--mobile {
    display: block;
    right: 1px;
    bottom: 9px;
    min-width: 56px;
  }

  .survival-card__level--desktop {
    display: none;
  }

  .survival-card__message {
    display: block;
    right: 50%;
    bottom: 25px;
    left: auto;
    width: 255px;
    min-height: 92px;
    padding: 18px 18px 12px;
    border-radius: 28px;
    background: white;
    transform: translateX(50%);
  }

  .survival-card__message p {
    font-size: var(--font-small);
    line-height: 1.55;
  }

  .survival-card__message em {
    min-width: 55px;
    min-height: 23px;
    margin-top: 8px;
  }

  .summary {
    margin-top: 20px;
  }

  .section-head {
    margin-bottom: 8px;
  }

  .section-head h2,
  .block-title {
    font-size: var(--font-body);
  }

  .summary__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .summary-card {
    min-height: 82px;
    padding: 13px 10px;
    border-radius: 14px;
    box-shadow: var(--shadow-sm);
  }

  .summary-card--asset {
    grid-column: 1 / -1;
    min-height: 105px;
    padding: 16px;
  }

  .summary-card--asset strong {
    font-size: var(--font-page-title);
  }

  .summary-card:not(.summary-card--asset) span {
    min-width: 0;
    min-height: 2.8em;
    overflow-wrap: anywhere;
    line-height: 1.35;
    white-space: normal;
  }

  .summary-card:not(.summary-card--asset) strong {
    font-size: clamp(11px, 3.2vw, 13px);
    white-space: nowrap;
  }

  .summary-card--cash span {
    white-space: normal !important;
  }

  .summary-card--cash span small {
    display: inline;
  }

  .dashboard__bottom {
    grid-template-columns: 1fr;
    gap: 20px;
    margin-top: 22px;
  }

  .simulation-cta {
    min-height: 180px;
    flex-direction: column;
    justify-content: center;
    gap: 13px;
    padding: 22px 18px;
    text-align: center;
  }

  .simulation-cta__confirmed {
    width: 100%;
    text-align: left;
  }

  .simulation-cta__result {
    justify-content: center;
  }

  .simulation-cta h3 {
    font-size: var(--font-card-title);
  }

  .simulation-cta p {
    margin-top: 8px;
    font-size: var(--font-small);
  }

  .simulation-cta__button {
    padding: 11px 20px;
  }

  .section-head--goal {
    margin-bottom: 8px;
  }

  .goal-card {
    min-height: 145px;
    gap: 16px 12px;
    padding: 18px 16px;
    border-radius: 16px;
    box-shadow: var(--shadow-sm);
  }

  .goal-card span {
    font-size: var(--font-small);
  }

  .goal-card strong {
    font-size: var(--font-body);
  }

  .dashboard__bottom {
    gap: 22px;
  }

  .block-heading {
    min-height: 34px;
    margin-bottom: 10px;
  }

  .block-heading h2 {
    font-size: 22px;
  }

  .confirmed-badge {
    padding: 7px 16px;
  }

  .quest-card {
    padding: 14px 12px 16px;
    border-radius: 22px;
  }

  .quest-tabs {
    width: 100%;
    height: 52px;
    margin-bottom: 16px;
  }

  .quest-groups {
    gap: 20px;
  }

  .quest-row {
    min-height: 84px;
    grid-template-columns: 48px minmax(0, 1fr) auto 34px;
    gap: 10px;
    padding: 12px 13px;
    border-radius: 18px;
  }

  .quest-row__icon {
    width: 44px;
    height: 44px;
  }

  .quest-row__copy strong,
  .quest-row__amount {
    font-size: 16px;
  }

  .quest-row__copy small {
    white-space: normal;
  }

  .quest-card__footer {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .quest-card__footer strong {
    font-size: 20px;
  }

  .goal-setting-card {
    min-height: 190px;
    gap: 24px 18px;
    padding: 22px 20px;
  }

  .goal-setting-card strong {
    font-size: 18px;
  }
}

@media (max-width: 390px) {
  .survival-card__message {
    width: 235px;
  }

  .summary-card {
    padding-right: 7px;
    padding-left: 7px;
  }
}
</style>
