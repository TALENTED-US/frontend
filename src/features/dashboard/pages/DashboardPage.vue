<script setup>
import { computed } from "vue";
import { dashboard } from "@/data/mockData";
import AppIcon from "@/components/ui/AppIcon.vue";
import { useSessionStore } from "@/stores/session";
import buttieMeltingImage from "@/assets/images/dashboard/buttie-melting.png";

const session = useSessionStore();
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

function formatMonthLabel(date) {
  return `${String(date.getFullYear()).slice(2)}년 ${date.getMonth() + 1}월`;
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
const monthlyExpense = computed(() =>
  Math.max(0, Number(dashboard.monthlyExpense) || 0),
);
const monthlyIncome = computed(() =>
  Math.max(0, Number(dashboard.monthlyIncome) || 0),
);
const survivalMonths = computed(() =>
  monthlyExpense.value > 0 ? availableAssets.value / monthlyExpense.value : 0,
);
const displayedSurvivalMonths = computed(() => survivalMonths.value.toFixed(1));
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
const isFinancialRisk = computed(() => shortageMonths.value > 0);
const statusLabel = computed(() => (isFinancialRisk.value ? "위험" : "안정"));
const statusMessage = computed(() => {
  if (!isFinancialRisk.value)
    return "현재 자산으로 목표 취업일까지 안정적으로 준비할 수 있어요";
  const shortage = Math.max(1, Math.ceil(shortageMonths.value));
  return `생존기간이 목표보다 ${shortage}개월 부족해서 버티가 녹고 있어요`;
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
      <h2 id="survival-title" class="mobile-only section-label">생존기간</h2>
      <article
        :class="[
          'survival-card',
          { 'survival-card--stable': !isFinancialRisk },
        ]"
      >
        <div class="survival-card__metric survival-card__metric--current">
          <span class="desktop-only">현재 생존기간</span>
          <span class="mobile-only">준비 가능 기간</span>
          <strong>{{ displayedSurvivalMonths }} <i>개월</i></strong>
        </div>

        <div class="survival-card__metric survival-card__metric--expected">
          <span>예상 생존기간</span>
          <strong>- <i>개월</i></strong>
          <small>시뮬레이션하면 확인 가능</small>
        </div>

        <div class="survival-card__progress-area">
          <b>목표 충족률 {{ achievementRate }}%</b>
          <div
            class="survival-card__progress"
            role="progressbar"
            aria-label="목표 생존기간 충족률"
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
            :src="buttieMeltingImage"
            alt="재정 상태에 따라 녹고 있는 버티"
          />
          <b class="survival-card__level survival-card__level--mobile">Lv.1</b>
        </div>

        <div class="survival-card__message">
          <p>{{ statusMessage }}</p>
          <em>{{ statusLabel }}</em>
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
          <span>↗ 이번 달 수입</span>
          <strong>{{ formatWon(monthlyIncome, { sign: true }) }}</strong>
        </article>
        <article class="summary-card summary-card--expense">
          <span>↘ 이번 달 지출</span>
          <strong>{{ formatWon(-monthlyExpense) }}</strong>
        </article>
        <article class="summary-card summary-card--cash">
          <span>순현금흐름<small>(수입-지출)</small></span>
          <strong>{{ formatWon(netCashFlow) }}</strong>
        </article>
      </div>
    </section>

    <div class="dashboard__bottom">
      <section>
        <h2 class="block-title">시뮬레이션 현황</h2>
        <article class="simulation-cta">
          <div>
            <h3>예상 재정 계획이 아직 없어요</h3>
            <p>
              아르바이트, 지출 절감, 정부지원금을 조합해<br
                class="desktop-only"
              />
              나만의 시나리오를 만들어보세요.
            </p>
          </div>
          <RouterLink class="simulation-cta__button" to="/simulation">
            시뮬레이션 하러가기 <span>→</span>
          </RouterLink>
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
  box-shadow: var(--shadow-sm);
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
    white-space: nowrap;
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
