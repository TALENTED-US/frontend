<script setup>
import { dashboard, user } from '@/data/mockData'
import AppIcon from '@/components/ui/AppIcon.vue'
import ButtieAvatar from '@/components/ui/ButtieAvatar.vue'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
</script>

<template>
  <section class="page dashboard">
    <header class="dashboard__heading">
      <div>
        <p class="mobile-only dashboard__date">7월 16일 · 목요일</p>
        <h1>{{ session.displayName }}님, 오늘도 파이팅!</h1>
        <p class="desktop-only">현재 재정과 목표를 한눈에 확인해 보세요.</p>
      </div>
      <ButtieAvatar class="mobile-only" :size="53" />
    </header>

    <article class="survival-card">
      <div class="survival-card__top"><span>생존기간</span><em>안정</em></div>
      <div class="survival-card__values">
        <div>
          <small class="desktop-only">현재 기준 기간</small>
          <span class="mobile-only">준비 가능 기간</span>
          <strong>{{ dashboard.survivalMonths }}<i>개월</i></strong>
        </div>
        <div class="survival-card__goal">
          <small>목표</small><strong>{{ dashboard.targetMonths }}개월</strong>
        </div>
      </div>
      <div class="survival-card__progress"><span /></div>
      <div class="survival-card__legend"><small>0개월</small><small>목표 6개월</small></div>
      <b>예상 부족금액 <mark>1,800,000</mark></b>
    </article>

    <section class="summary">
      <div class="section-head">
        <h2>재정 요약</h2>
        <RouterLink to="/finance">전체 내역 ›</RouterLink>
      </div>
      <div class="summary__grid">
        <article class="summary-card summary-card--asset">
          <span>총 자산</span><strong>300만원</strong><small>연결 계좌 기준</small>
        </article>
        <article class="summary-card summary-card--income">
          <span>이번 달 수입</span><strong class="desktop-only">+50만원</strong
          ><strong class="mobile-only">+0원</strong>
          <small class="desktop-only">지난달 대비 +12%</small>
        </article>
        <article class="summary-card summary-card--expense">
          <span>이번 달 지출</span><strong>-80만원</strong
          ><small class="desktop-only">예상 지출 포함</small>
        </article>
        <article class="summary-card summary-card--cash">
          <span>순현금흐름<span class="mobile-only">(수입-지출)</span></span
          ><strong class="desktop-only">-800,000원</strong
          ><strong class="mobile-only">-800,000원</strong>
          <small class="desktop-only">수입 - 지출</small>
        </article>
      </div>
    </section>

    <div class="dashboard__bottom">
      <section>
        <h2 class="block-title">시뮬레이션 현황</h2>
        <article class="simulation-cta">
          <div>
            <h3>계획을 바꾸면 준비 기간이<br />얼마나 늘어날까요?</h3>
            <p>
              아르바이트, 지출 절감, 정부지원금을 조합해<br class="desktop-only" />
              나만의 시나리오를 만들어보세요.
            </p>
          </div>
          <RouterLink class="simulation-cta__button" to="/simulation"
            >시뮬레이션 하러가기 <span>→</span></RouterLink
          >
        </article>
      </section>

      <section>
        <div class="section-head">
          <h2>목표 설정</h2>
          <RouterLink to="/mypage">수정하기 ›</RouterLink>
        </div>
        <article class="goal-card">
          <div><AppIcon name="clock" :size="15" /><span>목표 기간</span><strong>6개월</strong></div>
          <div>
            <AppIcon name="calendar" :size="15" /><span>목표 취업일</span
            ><strong>{{ user.targetDate.replaceAll('.', '-') }}</strong>
          </div>
          <div><AppIcon name="clock" :size="15" /><span>비상금</span><strong>50만원</strong></div>
          <div>
            <AppIcon name="clock" :size="15" /><span>주간 준비 시간</span><strong>30시간</strong>
          </div>
        </article>
      </section>
    </div>
  </section>
</template>

<style scoped>
.dashboard__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.dashboard__heading h1 {
  font-size: 27px;
  line-height: 1.3;
}

.dashboard__heading p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.survival-card {
  padding: 22px 24px;
  border-radius: 16px;
  background: #fff9dd;
}

.survival-card__top {
  display: flex;
  align-items: center;
  gap: 13px;
  font-size: 13px;
  font-weight: 800;
}

.survival-card__top em {
  padding: 3px 10px;
  border-radius: 999px;
  background: #e7f9eb;
  color: var(--success);
  font-size: 10px;
  font-style: normal;
}

.survival-card__values {
  display: flex;
  align-items: end;
  justify-content: space-between;
  margin-top: 10px;
}

.survival-card__values > div {
  display: grid;
  gap: 3px;
}

.survival-card__values small,
.survival-card__values span {
  color: #575757;
  font-size: 11px;
}

.survival-card__values strong {
  color: #6a4c3c;
  font-size: 27px;
}

.survival-card__values i {
  margin-left: 5px;
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
}
.survival-card__goal {
  text-align: right;
}
.survival-card__goal strong {
  font-size: 20px;
}

.survival-card__progress {
  height: 9px;
  margin-top: 16px;
  overflow: hidden;
  border-radius: 999px;
  background: white;
}

.survival-card__progress span {
  display: block;
  width: 63%;
  height: 100%;
  border-radius: inherit;
  background: #f2b943;
}

.survival-card__legend {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  color: var(--muted);
}

.survival-card > b {
  display: none;
  margin-top: 13px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 500;
}

.survival-card mark {
  margin-left: 8px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #fff0f1;
  color: var(--danger);
}

.summary {
  margin-top: 24px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-head h2,
.block-title {
  font-size: 16px;
}
.section-head a {
  color: #555;
  font-size: 11px;
}

.summary__grid {
  display: grid;
  grid-template-columns: 1.2fr repeat(3, 1fr);
  gap: 16px;
}

.summary-card {
  display: grid;
  align-content: center;
  gap: 3px;
  min-height: 76px;
  padding: 13px 16px;
  border-radius: 12px;
}

.summary-card span,
.summary-card small {
  color: #666;
  font-size: 10px;
}
.summary-card strong {
  color: #324363;
  font-size: 18px;
}
.summary-card--asset {
  background: #d9e5ff;
}
.summary-card--asset strong {
  color: #07399e;
  font-size: 23px;
}
.summary-card--income {
  background: #e8eaf4;
}
.summary-card--income span {
  color: var(--primary);
}
.summary-card--expense {
  background: #fdeced;
}
.summary-card--expense span {
  color: var(--danger);
}
.summary-card--cash {
  background: #f1eff9;
}
.summary-card--cash span {
  color: #7361ad;
}

.dashboard__bottom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  margin-top: 32px;
}

.block-title {
  margin-bottom: 12px;
}

.simulation-cta {
  display: flex;
  min-height: 162px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
  border-radius: 14px;
  background: #fff5ca;
}

.simulation-cta h3 {
  color: #684f3c;
  font-size: 18px;
  line-height: 1.35;
}
.simulation-cta p {
  margin-top: 9px;
  color: #766e66;
  font-size: 10px;
  line-height: 1.65;
}

.simulation-cta__button {
  flex: none;
  padding: 11px 22px;
  border-radius: 999px;
  background: var(--accent-strong);
  color: white;
  font-size: 11px;
  font-weight: 800;
}

.goal-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 28px;
  min-height: 162px;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 14px;
}

.goal-card > div {
  display: grid;
  grid-template-columns: 18px 1fr;
  align-items: center;
}
.goal-card span {
  color: #676767;
  font-size: 10px;
}
.goal-card strong {
  grid-column: 1 / -1;
  margin-top: 4px;
  font-size: 14px;
}

@media (max-width: 767px) {
  .dashboard__heading {
    margin: 5px 0 12px;
  }
  .dashboard__heading h1 {
    font-size: 18px;
  }
  .dashboard__date {
    margin: 0 0 2px !important;
    font-size: 11px !important;
  }
  .survival-card {
    padding: 16px;
    box-shadow: var(--shadow-sm);
  }
  .survival-card__top span {
    font-size: 11px;
  }
  .survival-card__values strong {
    font-size: 28px;
  }
  .survival-card__goal strong {
    font-size: 18px;
  }
  .survival-card > b {
    display: block;
  }

  .summary {
    margin-top: 17px;
  }
  .section-head {
    margin-bottom: 8px;
  }
  .section-head h2,
  .block-title {
    font-size: 13px;
  }
  .summary__grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 7px;
  }
  .summary-card {
    min-height: 74px;
    padding: 11px;
    box-shadow: var(--shadow-sm);
  }
  .summary-card--asset {
    grid-column: 1 / -1;
    min-height: 86px;
  }
  .summary-card--asset strong {
    font-size: 23px;
  }
  .summary-card:not(.summary-card--asset) strong {
    font-size: 13px;
  }
  .summary-card--cash span span {
    display: inline !important;
    font-size: 8px;
  }

  .dashboard__bottom {
    grid-template-columns: 1fr;
    gap: 17px;
    margin-top: 18px;
  }
  .simulation-cta {
    min-height: 154px;
    flex-direction: column;
    justify-content: center;
    padding: 18px;
    text-align: center;
  }
  .simulation-cta h3 {
    font-size: 16px;
  }
  .simulation-cta__button {
    padding: 11px 20px;
  }
  .goal-card {
    min-height: 140px;
    padding: 17px;
    gap: 15px 20px;
    box-shadow: var(--shadow-sm);
  }
}
</style>
