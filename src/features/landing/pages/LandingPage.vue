<script setup>
import buttieLogo from '@/assets/images/brand/buttie-logo-blue.png'
import buttieStable from '@/assets/images/dashboard/buttie-stable.png'
import LandingHeroEntrance from './LandingHeroEntrance.vue'
import SkipLink from '@/components/ui/SkipLink.vue'

const policies = [
  {
    tag: '취업',
    title: '국민취업지원제도',
    note: '구직촉진수당 · 취업지원 서비스',
    tone: 'lime',
    href: 'https://m.work24.go.kr/ua/z/z/1300/selectEmssRqutIntro.do',
  },
  {
    tag: '주거',
    title: '청년 월세 지원',
    note: '월세 부담을 낮추는 주거 지원',
    tone: 'blue',
    href: 'https://housing.seoul.go.kr/site/main/content/sh01_060513',
  },
  {
    tag: '생활',
    title: '청년도약계좌',
    note: '취업 이후까지 이어지는 자산 계획',
    tone: 'peach',
    href: 'https://www.kinfa.or.kr/financialProduct/youthLeapAccount.do',
  },
]
</script>

<template>
  <LandingHeroEntrance />
  <SkipLink />
  <main id="main-content" class="landing-page" tabindex="-1">
    <section id="top" class="hero">
      <header class="nav shell">
        <a class="brand" href="#top" aria-label="버티 홈">
          <img class="brand-character brand-character--nav" :src="buttieLogo" alt="" />
        </a>
        <nav aria-label="주요 메뉴">
          <a href="#story">서비스 소개</a>
          <a href="#features">주요 기능</a>
          <a href="#policy">정책 추천</a>
        </nav>
      </header>

      <div class="hero-content shell">
        <div class="hero-copy">
          <p class="eyebrow">MYDATA FINANCIAL CARE</p>
          <h1 data-hero-title>
            <span class="hero-title-line">
              <span class="hero-title-first-word">취준,</span>
              <span>감으로</span>
            </span>
            <em class="hero-title-second-line"><span>버티지 마세요.</span></em>
          </h1>
          <p class="hero-description">
            소득 공백기의 자산을 분석하고 미래를 시뮬레이션해요.<br />
            내 상황에 맞는 현실적인 자산 방어 전략을 만나보세요.
          </p>
          <div class="hero-actions">
            <RouterLink class="button dark" :to="{ name: 'login' }"
              >시작하기 <span aria-hidden="true">↗</span></RouterLink
            >
            <a class="text-link" href="#story">버티 둘러보기 <span aria-hidden="true">↓</span></a>
          </div>
        </div>

        <div class="hero-visual" aria-label="버티 서비스 예시 화면">
          <div class="orbit orbit-one"></div>
          <div class="orbit orbit-two"></div>
          <div class="capture-stack">
            <figure class="capture capture-web">
              <figcaption><span>WEB · SIMULATION</span><i></i><i></i><i></i></figcaption>
              <img src="/landing/buttie-simulation-web.png" alt="실제 버티 웹 시뮬레이션 화면" />
            </figure>
            <figure class="capture capture-app">
              <figcaption><span>APP · SIMULATION</span></figcaption>
              <img
                src="/landing/buttie-simulation-app.png"
                alt="실제 버티 모바일 시뮬레이션 화면"
              />
            </figure>
            <span class="mascot-bubble" aria-hidden="true">같이 버텨요!</span>
            <span class="mascot-sparkle sparkle-one" aria-hidden="true">✦</span>
            <span class="mascot-sparkle sparkle-two" aria-hidden="true">♥</span>
            <img class="mascot" :src="buttieStable" alt="1레벨 버티 캐릭터" />
          </div>
        </div>
      </div>

      <div class="hero-ticker" aria-hidden="true">
        <div>
          PLAN YOUR JOB SEARCH · KNOW YOUR MONEY · FIND YOUR POLICY · <span>BUTTIE</span> · PLAN
          YOUR JOB SEARCH · KNOW YOUR MONEY · FIND YOUR POLICY ·
        </div>
      </div>
    </section>

    <section id="story" class="story shell">
      <div class="section-index"><span>01</span><span>WHY BUTTIE</span></div>
      <div class="story-heading">
        <p>소득 공백기는 감이 아니라 전략이 필요하니까</p>
        <h2>지금의 자산으로<br /><span>미래를 볼 수 있도록.</span></h2>
      </div>
      <div class="story-grid">
        <article class="statement-card card-yellow">
          <span class="card-kicker">THE REAL QUESTION</span>
          <span class="cute-badge" aria-hidden="true">오늘도 +1</span>
          <h3>
            “내가 앞으로<br /><strong>몇 달</strong>이나 더<br /><strong>버틸</strong> 수 있을까?”
          </h3>
          <img class="statement-character" :src="buttieStable" alt="1레벨 버티 캐릭터" />
          <div class="scribble" aria-hidden="true">?</div>
        </article>
        <article class="story-copy">
          <p>
            버티는 마이데이터를 기반으로 현재 재정 상태를 분석하고, 선택에 따른 미래 자산 변화를
            보여줍니다. 막연했던 숫자는 실행 가능한 퀘스트가 되고, 놓치기 쉬운 지원 정책은 내 조건에
            맞춰 가까워져요.
          </p>
          <div class="impact-row">
            <div><strong>1분</strong><span>간단한 상황 입력</span></div>
            <div><strong>한눈에</strong><span>목표일까지 자금 흐름</span></div>
            <div><strong>맞춤형</strong><span>신청 가능한 청년 정책</span></div>
          </div>
        </article>
      </div>
    </section>

    <section id="features" class="features">
      <div class="shell">
        <div class="section-index light"><span>02</span><span>HOW IT WORKS</span></div>
        <div class="feature-title-row">
          <h2>복잡한 취업 준비,<br /><em>세 가지</em>면 충분해요.</h2>
          <p>나의 현재를 입력하면<br />버티가 계획의 빈칸을 채워드려요.</p>
        </div>
        <div class="feature-grid">
          <article class="feature-card feature-lime">
            <div class="feature-no">01</div>
            <div class="feature-art art-calendar">
              <span>DEC</span><b>01</b><i></i
              ><img class="feature-buttie stable" :src="buttieStable" alt="" />
            </div>
            <div>
              <h3>목표일을 정하고</h3>
              <p>원하는 취업 시점과 지금 가진 자금을 알려주세요.</p>
            </div>
          </article>
          <article class="feature-card feature-blue">
            <div class="feature-no">02</div>
            <div class="feature-art art-chart">
              <i></i><i></i><i></i><span>+ 18%</span
              ><img class="feature-buttie caution" :src="buttieStable" alt="" />
            </div>
            <div>
              <h3>흐름을 확인하고</h3>
              <p>월별 수입과 지출, 남은 준비 기간을 한눈에 봐요.</p>
            </div>
          </article>
          <article class="feature-card feature-yellow">
            <div class="feature-no">03</div>
            <div class="feature-art art-ticket">
              <span>MATCH</span><b>92%</b><i>✓</i
              ><img class="feature-buttie crown" :src="buttieStable" alt="" />
            </div>
            <div>
              <h3>지원까지 챙겨요</h3>
              <p>내 조건에 맞는 청년 정책을 놓치지 않게 추천해요.</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section id="policy" class="policy shell">
      <div class="section-index"><span>03</span><span>POLICY MATCH</span></div>
      <div class="policy-header">
        <h2>나에게 맞는 지원,<br />찾는 시간은 <em>줄이고.</em></h2>
        <div class="policy-intro">
          <p>지역·나이·소득·취업 상태를 바탕으로<br />확인할 가치가 높은 정책부터 보여드려요.</p>
        </div>
      </div>
      <div class="policy-stack">
        <a
          v-for="(policy, index) in policies"
          :key="policy.title"
          class="policy-card"
          :class="policy.tone"
          :href="policy.href"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`${policy.title} 정책 페이지로 이동`"
        >
          <span class="policy-number">0{{ index + 1 }}</span>
          <span class="policy-tag">{{ policy.tag }}</span>
          <div>
            <h3>{{ policy.title }}</h3>
            <p>{{ policy.note }}</p>
          </div>
          <span class="policy-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
      <p class="policy-disclaimer">
        ※ 정책의 최종 자격과 신청 가능 여부는 담당 기관의 최신 공고에서 다시 확인해 주세요.
      </p>
    </section>

    <section class="final-cta">
      <div class="cta-orbit one"></div>
      <div class="cta-orbit two"></div>
      <span class="cta-charm charm-one" aria-hidden="true">✦</span>
      <span class="cta-charm charm-two" aria-hidden="true">♥</span>
      <span class="cta-charm charm-three" aria-hidden="true">✦</span>
      <img class="cta-face" :src="buttieStable" alt="1레벨 버티 캐릭터" />
      <div class="cta-content">
        <p>READY TO KEEP GOING?</p>
        <h2>막막한 오늘도,<br />우리 같이 <em>버텨봐요.</em></h2>
        <RouterLink class="button dark" :to="{ name: 'login' }"
          >내 계획 만들기 <span aria-hidden="true">↗</span></RouterLink
        >
      </div>
    </section>

    <footer>
      <div class="shell footer-inner">
        <div>
          <a class="brand footer-brand" href="#top" aria-label="버티 홈으로 이동">
            <img class="brand-character" :src="buttieLogo" alt="버티" />
          </a>
          <p>취업 준비를 버티는 가장 현실적인 방법</p>
        </div>
        <div class="footer-links">
          <a href="#story">서비스 소개</a><a href="#features">주요 기능</a
          ><a href="#policy">정책 추천</a>
        </div>
        <div class="copyright">© 2026 BUTTIE.<br />ALL RIGHTS RESERVED.</div>
      </div>
    </footer>
  </main>
</template>

<style scoped src="./LandingPage.css"></style>
