<script setup>
import buttieLogo from '@/assets/images/brand/buttie-logo-blue.png'
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer__inner">
      <div class="app-footer__brand">
        <RouterLink :to="{ name: 'landing' }" aria-label="버티 소개 페이지로 이동">
          <img :src="buttieLogo" alt="버티" />
        </RouterLink>
        <p>취업 준비를 버티는 가장 현실적인 방법</p>
        <span>오늘의 자산에서 취업 이후의 계획까지, 버티가 함께해요.</span>
      </div>

      <section class="app-footer__contact" aria-label="버티 연락처">
        <strong>CONTACT</strong>
        <address>
          <p><b>대표</b> 감만세</p>
          <p><b>대표전화</b> 02-0000-2026</p>
          <p><b>대표이메일</b> hello@buttie.example</p>
          <p><b>주소</b> (00000) 서울특별시 버티구 희망로 26, 버티타워 3층</p>
        </address>
      </section>

      <div class="app-footer__meta">
        <p>© 2026 BUTTIE.<br />ALL RIGHTS RESERVED.</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  position: relative;
  z-index: 6;
  width: 100%;
  border-top: 1px solid #dfe4ec;
  background: #f0f3f8;
  color: #4f5d73;
}

.app-footer__inner {
  display: grid;
  width: min(100%, 1180px);
  min-height: 190px;
  margin: 0 auto;
  grid-template-columns: minmax(260px, 1.2fr) minmax(180px, 1fr) minmax(180px, 0.7fr);
  align-items: start;
  gap: clamp(36px, 5vw, 72px);
  padding: 24px clamp(32px, 5vw, 64px) 18px;
}

.app-footer__brand {
  display: grid;
  justify-items: start;
}

.app-footer__brand a {
  display: inline-flex;
}

.app-footer__brand img {
  width: 116px;
  height: 38px;
  object-fit: contain;
}

.app-footer__brand p {
  margin-top: 20px;
  color: #364152;
  font-size: 15px;
  font-weight: 750;
  line-height: 1.5;
}

.app-footer__brand > span {
  max-width: 280px;
  margin-top: 7px;
  color: #7b8798;
  font-size: 12px;
  line-height: 1.6;
}

.app-footer__contact {
  display: grid;
  align-content: start;
  justify-items: start;
  gap: 10px;
}

.app-footer__contact > strong {
  margin-bottom: 5px;
  color: #4f5d73;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.13em;
}

.app-footer__contact address {
  display: grid;
  gap: 8px;
  font-style: normal;
}

.app-footer__contact p {
  margin: 0;
  color: #657188;
  font-size: 12px;
  line-height: 1.5;
}

.app-footer__contact b {
  margin-right: 5px;
  color: #4f5d73;
  font-weight: 750;
}

.app-footer__meta {
  display: grid;
  justify-items: end;
  text-align: right;
}

.app-footer__meta p {
  color: #7b8798;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.8;
  letter-spacing: 0.06em;
}

@media (max-width: 1000px) {
  .app-footer__inner {
    grid-template-columns: 1fr 1.4fr;
  }

  .app-footer__meta {
    grid-column: 1 / -1;
    grid-template-columns: 1fr 1fr;
    justify-items: start;
    gap: 24px;
    text-align: left;
  }

  .app-footer__meta p {
    justify-self: end;
    text-align: right;
  }
}

@media (max-width: 620px) {
  .app-footer__inner {
    min-height: 0;
    grid-template-columns: 1fr;
    gap: 36px;
    padding: 44px 24px 38px;
  }

  .app-footer__meta {
    grid-column: auto;
    grid-template-columns: 1fr;
    justify-items: start;
    gap: 24px;
  }

  .app-footer__meta p {
    justify-self: start;
    text-align: left;
  }
}
</style>
