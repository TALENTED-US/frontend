<script setup>
import { ref } from 'vue'

const selectedMonth = ref(3)
const months = [
  { label: '7월', balance: 300, income: 0, expense: 80, event: '현재' },
  { label: '8월', balance: 270, income: 50, expense: 80, event: '구직지원금' },
  { label: '9월', balance: 246, income: 58, expense: 82, event: '적금 가입' },
  { label: '10월', balance: 224, income: 60, expense: 82, event: '재정 조정' },
  { label: '11월', balance: 205, income: 62, expense: 81, event: '정책 종료' },
  { label: '12월', balance: 188, income: 64, expense: 81, event: '취업 목표' },
]
</script>

<template>
  <section class="page">
    <header class="page-heading">
      <div>
        <h1 class="page-title">재정 타임라인</h1>
        <p class="page-description">확정한 계획을 바탕으로 월별 자산 흐름과 주요 일정을 보여드려요.</p>
      </div>
      <span class="pill">2026.07 — 2026.12</span>
    </header>

    <article class="timeline-chart card">
      <div class="chart-y"><span>300만원</span><span>200만원</span><span>100만원</span><span>0원</span></div>
      <div class="chart-content">
        <svg viewBox="0 0 600 220" preserveAspectRatio="none" aria-label="월별 예상 잔액 그래프">
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#a9c2fb" stop-opacity=".55" />
              <stop offset="1" stop-color="#a9c2fb" stop-opacity=".04" />
            </linearGradient>
          </defs>
          <path d="M20 28 L132 48 L244 70 L356 93 L468 118 L580 142 L580 210 L20 210 Z" fill="url(#area)" />
          <path d="M20 28 L132 48 L244 70 L356 93 L468 118 L580 142" fill="none" stroke="#0a1680" stroke-width="5" stroke-linecap="round" />
          <circle v-for="(point, index) in [28, 48, 70, 93, 118, 142]" :key="point" :cx="20 + index * 112" :cy="point" r="6" fill="#fff" stroke="#0a1680" stroke-width="4" />
        </svg>
        <div class="chart-months"><button v-for="(month, index) in months" :key="month.label" :class="{ active: selectedMonth === index }" @click="selectedMonth = index">{{ month.label }}</button></div>
      </div>
    </article>

    <div class="timeline-grid">
      <article class="card month-detail">
        <div><span>{{ months[selectedMonth].label }} 예상 잔액</span><strong>{{ months[selectedMonth].balance }}만원</strong></div>
        <dl>
          <div><dt>예상 수입</dt><dd class="income">+{{ months[selectedMonth].income }}만원</dd></div>
          <div><dt>예상 지출</dt><dd>-{{ months[selectedMonth].expense }}만원</dd></div>
          <div><dt>주요 이벤트</dt><dd>{{ months[selectedMonth].event }}</dd></div>
        </dl>
      </article>

      <article class="card events">
        <h2 class="section-title">주요 일정</h2>
        <button v-for="(month, index) in months.slice(1)" :key="month.label" @click="selectedMonth = index + 1">
          <span>{{ month.label }}</span><i /><div><strong>{{ month.event }}</strong><small>재정 계획에 반영된 일정</small></div><b>›</b>
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.timeline-chart {
  display: grid;
  grid-template-columns: 70px 1fr;
  min-height: 330px;
  padding: 30px 30px 20px;
}

.chart-y {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-bottom: 38px;
  color: var(--muted);
  font-size: 11px;
}

.chart-content svg {
  width: 100%;
  height: 250px;
  overflow: visible;
}

.chart-months {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
}

.chart-months button {
  padding: 8px;
  border-radius: 999px;
  color: var(--muted);
  font-size: 12px;
}

.chart-months button.active {
  background: var(--primary);
  color: white;
}

.timeline-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.6fr);
  gap: 18px;
  margin-top: 18px;
}

.month-detail {
  padding: 24px;
  background: var(--sky-soft);
}

.month-detail > div {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
}

.month-detail > div strong {
  color: var(--primary);
  font-size: 30px;
}

.month-detail dl {
  display: grid;
  gap: 12px;
  margin-top: 25px;
}

.month-detail dl div {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.month-detail dd.income {
  color: #20916c;
}

.events {
  padding: 22px;
}

.events h2 {
  margin-bottom: 12px;
}

.events button {
  display: grid;
  grid-template-columns: 44px 10px 1fr 20px;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 13px 0;
  border-top: 1px solid var(--border);
  text-align: left;
}

.events button > span {
  color: var(--primary);
  font-weight: 800;
}

.events i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--warning);
}

.events button div {
  display: grid;
}

.events small {
  color: var(--muted);
  font-size: 11px;
}

@media (max-width: 700px) {
  .timeline-chart {
    grid-template-columns: 48px 1fr;
    min-height: 260px;
    padding: 20px 12px;
  }

  .chart-content svg {
    height: 190px;
  }

  .timeline-grid {
    grid-template-columns: 1fr;
  }
}
</style>
