<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import buttieLogo from '@/assets/images/brand/buttie-logo-blue.png'
import buttieCaution from '@/assets/images/dashboard/buttie-caution.png'
import buttieFront from '@/assets/images/dashboard/buttie-front.png'
import buttieStable from '@/assets/images/dashboard/buttie-stable.png'
import SkipLink from '@/components/ui/SkipLink.vue'
import LandingHeroEntrance from './LandingHeroEntrance.vue'

const landingRoot = ref(null)
const mascotScene = ref(null)
const motionSequence = ref(null)
const productShowcase = ref(null)
let revealObserver
let scrollFrame = 0

function updateLandingMotion() {
  scrollFrame = 0
  const scene = mascotScene.value

  if (scene) {
    const rect = scene.getBoundingClientRect()
    const travel = Math.max(scene.offsetHeight - window.innerHeight, 1)
    const progress = Math.min(1, Math.max(0, -rect.top / travel))
    // 버티가 끝에서 가만히 떠 있는 시간을 줄이려고, 상승 모션이 스크롤의
    // 90% 지점에서 마무리되도록 진행도를 늘려 매핑한다.
    const riseProgress = Math.min(1, progress / 0.9)
    const eased = riseProgress * riseProgress * (3 - 2 * riseProgress)
    // 헤드라인이 너무 일찍 사라지지 않게, 버티가 올라와 자리를 잡는
    // 구간(0.44~0.78)에 맞춰 천천히 페이드아웃한다.
    const copyProgress = Math.min(1, Math.max(0, (progress - 0.44) / 0.34))
    const copyEased = copyProgress * copyProgress * (3 - 2 * copyProgress)

    scene.style.setProperty('--mascot-y', `${76 - eased * 84}%`)
    scene.style.setProperty('--mascot-scale', `${0.58 + eased * 0.47}`)
    scene.style.setProperty('--mascot-rotate', `${-4 + eased * 6}deg`)
    scene.style.setProperty('--mascot-opacity', `${0.42 + eased * 0.58}`)
    scene.style.setProperty('--scene-copy-y', `${copyEased * -58}px`)
    scene.style.setProperty('--scene-copy-opacity', `${1 - copyEased}`)
    scene.style.setProperty('--cloud-y', `${eased * 8}%`)
  }

  const showcase = productShowcase.value

  if (showcase) {
    const rect = showcase.getBoundingClientRect()
    const distance = window.innerHeight * 0.8 + rect.height * 0.78
    const progress = Math.min(1, Math.max(0, (window.innerHeight * 0.72 - rect.top) / distance))

    showcase.style.setProperty('--preview-scroll', progress.toFixed(4))
  }

  const sequence = motionSequence.value

  if (sequence) {
    const rect = sequence.getBoundingClientRect()
    const travel = Math.max(sequence.offsetHeight - window.innerHeight, 1)
    const progress = Math.min(1, Math.max(0, -rect.top / travel))
    const smooth = (value) => {
      const clamped = Math.min(1, Math.max(0, value))
      return clamped * clamped * (3 - 2 * clamped)
    }
    // 갤러리 → 버스트 전환을 넓은 구간에서 겹치게 해, 어두운 화면이
    // 갑자기 덮이지 않고 부드럽게 크로스페이드되도록 한다.
    const galleryExit = smooth((progress - 0.14) / 0.22)
    const burstIn = smooth((progress - 0.12) / 0.22)
    const burstOut = smooth((progress - 0.55) / 0.12)
    const burstProgress = Math.min(1, Math.max(0, (progress - 0.18) / 0.38))
    const copyShift = smooth((progress - 0.34) / 0.1)
    const finaleIn = smooth((progress - 0.5) / 0.14)

    sequence.style.setProperty('--sequence-progress', progress.toFixed(4))
    sequence.style.setProperty('--gallery-progress', smooth(progress / 0.28).toFixed(4))
    sequence.style.setProperty('--gallery-opacity', (1 - galleryExit).toFixed(4))
    sequence.style.setProperty('--burst-opacity', (burstIn * (1 - burstOut)).toFixed(4))
    sequence.style.setProperty('--burst-progress', burstProgress.toFixed(4))
    sequence.style.setProperty('--burst-copy-one', (1 - copyShift).toFixed(4))
    sequence.style.setProperty('--burst-copy-two', copyShift.toFixed(4))
    sequence.style.setProperty('--finale-progress', finaleIn.toFixed(4))
    sequence.style.setProperty('--finale-opacity', finaleIn.toFixed(4))
  }
}

function requestLandingMotionUpdate() {
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(updateLandingMotion)
}

function moveHeroButtie(event) {
  const stage = event.currentTarget
  const rect = stage.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width - 0.5
  const y = (event.clientY - rect.top) / rect.height - 0.5

  stage.style.setProperty('--buttie-x', `${x * 42}px`)
  stage.style.setProperty('--buttie-y', `${y * 34}px`)
  stage.style.setProperty('--buttie-rotate-x', `${y * -10}deg`)
  stage.style.setProperty('--buttie-rotate-y', `${x * 14}deg`)
}

function resetHeroButtie(event) {
  const stage = event.currentTarget
  stage.style.setProperty('--buttie-x', '0px')
  stage.style.setProperty('--buttie-y', '0px')
  stage.style.setProperty('--buttie-rotate-x', '0deg')
  stage.style.setProperty('--buttie-rotate-y', '0deg')
}

onMounted(() => {
  const root = landingRoot.value
  if (!root) return

  const targets = root.querySelectorAll('[data-reveal]')
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((target) => target.classList.add('is-visible'))
  } else {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          revealObserver.unobserve(entry.target)
        })
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
    )

    targets.forEach((target) => revealObserver.observe(target))
  }

  window.addEventListener('scroll', requestLandingMotionUpdate, { passive: true })
  window.addEventListener('resize', requestLandingMotionUpdate)
  requestLandingMotionUpdate()
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
  window.cancelAnimationFrame(scrollFrame)
  window.removeEventListener('scroll', requestLandingMotionUpdate)
  window.removeEventListener('resize', requestLandingMotionUpdate)
})

const features = [
  {
    step: '01',
    label: 'PLAN',
    title: '목표일을 정하고',
    description: '원하는 취업 시점과 지금 가진 자금을 간단히 알려주세요.',
    tone: 'lavender',
    symbol: 'D−DAY',
  },
  {
    step: '02',
    label: 'SIMULATE',
    title: '흐름을 확인하고',
    description: '월별 수입과 지출, 목표일까지 남은 준비 기간을 한눈에 봐요.',
    tone: 'mint',
    symbol: '+18%',
  },
  {
    step: '03',
    label: 'MATCH',
    title: '지원까지 챙겨요',
    description: '내 조건에 맞는 청년 정책을 놓치지 않도록 먼저 추천해요.',
    tone: 'powder',
    symbol: '92%',
  },
]

const policies = [
  {
    tag: '취업',
    title: '국민취업지원제도',
    note: '구직촉진수당 · 취업지원 서비스',
    tone: 'lavender',
    href: 'https://m.work24.go.kr/ua/z/z/1300/selectEmssRqutIntro.do',
  },
  {
    tag: '주거',
    title: '청년 월세 지원',
    note: '월세 부담을 낮추는 주거 지원',
    tone: 'mint',
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
  <SkipLink />
  <LandingHeroEntrance />
  <main id="main-content" ref="landingRoot" class="landing-page" tabindex="-1">
    <header class="nav shell">
      <a class="brand" href="#top" aria-label="버티 홈">
        <img :src="buttieLogo" alt="버티" />
      </a>
      <nav aria-label="주요 메뉴">
        <a href="#story">서비스 소개</a>
        <a href="#features">이용 방법</a>
        <a href="#policy">정책 추천</a>
      </nav>
      <RouterLink class="button button--compact" :to="{ name: 'login' }">시작하기</RouterLink>
    </header>

    <section id="top" class="hero shell">
      <div class="hero-intro">
        <div class="hero-copy">
          <p class="eyebrow">취준 기간을 위한 현실적인 자산 계획</p>
          <h1 data-hero-title>
            <span class="hero-title-line"
              ><span class="hero-title-first-word">취준,</span> 감으로</span
            >
            <span class="hero-title-line"
              ><em class="hero-title-second-line">버티지 마세요.</em></span
            >
          </h1>
          <p class="hero-description">
            소득 공백기의 자산을 분석하고 미래를 시뮬레이션해요.<br />
            내 상황에 맞는 현실적인 자산 방어 전략을 만나보세요.
          </p>
          <div class="hero-actions">
            <RouterLink class="button" :to="{ name: 'login' }">
              시작하기 <span aria-hidden="true">↗</span>
            </RouterLink>
            <a class="text-link" href="#features"
              >이용 방법 보기 <span aria-hidden="true">↓</span></a
            >
          </div>
        </div>

        <div
          class="hero-buttie-stage"
          role="img"
          aria-label="공중에서 움직이는 버티 캐릭터"
          @pointermove="moveHeroButtie"
          @pointerleave="resetHeroButtie"
        >
          <span class="hero-buttie-shadow" aria-hidden="true"></span>
          <div class="hero-buttie-parallax">
            <div class="hero-buttie-float">
              <img :src="buttieStable" alt="" />
            </div>
          </div>
        </div>
      </div>

      <div ref="productShowcase" class="hero-frame" aria-label="버티 서비스 시뮬레이션 화면">
        <div class="hero-canvas">
          <span class="float-shape shape-star" aria-hidden="true">✦</span>
          <span class="float-shape shape-dot" aria-hidden="true"></span>
          <span class="float-shape shape-pill" aria-hidden="true"></span>
          <span class="float-shape shape-heart" aria-hidden="true">♥</span>
          <span class="hero-label">계획을 세우면, 마음도 가벼워져요</span>

          <figure class="capture capture-web">
            <figcaption><span>WEB · SIMULATION</span><i></i><i></i><i></i></figcaption>
            <img src="/landing/buttie-simulation-web.png" alt="버티 웹 시뮬레이션 실제 화면" />
          </figure>
          <figure class="capture capture-app">
            <figcaption>APP · HOME</figcaption>
            <div class="capture-app__screen" role="img" aria-label="버티 모바일 홈 화면 예시">
              <div class="app-home-preview">
                <div class="app-home-preview__topbar">
                  <img :src="buttieLogo" alt="" />
                  <span aria-hidden="true">●</span>
                </div>
                <div class="app-home-preview__hello">
                  <p>오늘도 같이 버텨요</p>
                  <strong>나의 준비 현황</strong>
                </div>
                <div class="app-home-preview__status">
                  <div>
                    <span>예상 버티는 기간</span>
                    <strong>60개월</strong>
                    <small>목표일까지 안정적이에요</small>
                  </div>
                  <img class="app-home-buttie" :src="buttieFront" alt="" />
                </div>
                <div class="app-home-preview__quest">
                  <div>
                    <strong>퀘스트 현황</strong>
                    <span>2개 진행 중</span>
                  </div>
                  <div class="app-home-preview__progress"><i></i></div>
                  <p><span></span> 이번 달 식비 줄이기</p>
                  <p><span></span> 청년 정책 확인하기</p>
                </div>
                <div class="app-home-preview__nav" aria-hidden="true">
                  <span>홈</span><span>자산</span><span>계획</span><span>검색</span>
                </div>
              </div>
            </div>
          </figure>
          <img class="hero-mascot" :src="buttieStable" alt="버티 캐릭터" />
          <span class="mascot-message">같이 버텨요!</span>
        </div>
      </div>
    </section>

    <section ref="mascotScene" class="mascot-reveal" aria-label="버티 캐릭터 소개">
      <div class="mascot-reveal__sticky">
        <div class="mascot-reveal__copy">
          <p>SCROLL WITH BUTTIE</p>
          <h2>혼자 버티지 않도록,<br />버티가 함께할게요.</h2>
          <span>함께라면 끝까지 갈 수 있어요</span>
        </div>

        <span class="reveal-decoration reveal-decoration--star" aria-hidden="true">✦</span>
        <span class="reveal-decoration reveal-decoration--heart" aria-hidden="true">♥</span>
        <span class="reveal-decoration reveal-decoration--orb" aria-hidden="true"></span>
        <img class="giant-mascot" :src="buttieFront" alt="화면 아래에서 크게 등장하는 버티" />
        <div class="cloud-bank" aria-hidden="true"></div>
      </div>
    </section>

    <section id="story" class="story section shell">
      <div class="section-heading" data-reveal>
        <p class="section-label">WHY BUTTIE</p>
        <h2>지금 가진 자산으로<br />미래를 볼 수 있도록.</h2>
        <p>소득 공백기는 감이 아니라, 나를 안심시키는 계획이 필요하니까요.</p>
      </div>

      <div class="story-grid">
        <article class="statement-card" data-reveal="left">
          <span class="pill-tag">오늘도 +1</span>
          <p>취업 준비생의 진짜 질문</p>
          <h3>“내가 앞으로<br /><span>몇 달이나 더</span><br />버틸 수 있을까?”</h3>
          <img :src="buttieCaution" alt="걱정스러운 표정의 버티 캐릭터" />
          <span class="question-mark" aria-hidden="true">?</span>
        </article>

        <article class="story-card" data-reveal="right" style="--reveal-delay: 100ms">
          <div>
            <p class="story-lead">
              막연했던 숫자는 <span>실행 가능한 계획</span>이 되고, 놓치기 쉬운 지원 정책은 내
              조건에 맞춰 가까워져요.
            </p>
            <p class="story-body">
              버티는 마이데이터를 기반으로 현재 재정 상태를 분석하고, 선택에 따른 미래 자산 변화를
              이해하기 쉽게 보여줍니다.
            </p>
          </div>
          <dl class="metrics">
            <div>
              <dt>1분</dt>
              <dd>간단한 상황 입력</dd>
            </div>
            <div>
              <dt>한눈에</dt>
              <dd>목표일까지 자금 흐름</dd>
            </div>
            <div>
              <dt>맞춤형</dt>
              <dd>신청 가능한 청년 정책</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>

    <section id="features" class="features section">
      <div class="shell">
        <div class="section-heading" data-reveal>
          <p class="section-label">HOW IT WORKS</p>
          <h2>복잡한 취업 준비,<br />세 가지면 충분해요.</h2>
          <p>나의 현재를 입력하면 버티가 계획의 빈칸을 차근차근 채워드려요.</p>
        </div>

        <div class="feature-grid">
          <article
            v-for="(feature, index) in features"
            :key="feature.step"
            class="feature-card"
            :class="`feature-card--${feature.tone}`"
            data-reveal
            :style="{ '--reveal-delay': `${index * 110}ms` }"
          >
            <div class="feature-meta">
              <span>{{ feature.step }}</span>
              <span>{{ feature.label }}</span>
            </div>
            <div class="feature-art" aria-hidden="true">
              <span class="feature-symbol">{{ feature.symbol }}</span>
              <span class="feature-orb"></span>
            </div>
            <div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section ref="motionSequence" class="motion-sequence" aria-label="버티 서비스 핵심 가치">
      <div class="motion-sequence__sticky">
        <div class="motion-gallery">
          <div class="motion-gallery__heading">
            <p>MY PLAN, IN ONE VIEW</p>
            <h2>흩어진 준비를<br />하나의 계획으로.</h2>
          </div>
          <div class="motion-gallery__grid">
            <article class="motion-gallery-card motion-gallery-card--screen">
              <span>SIMULATION</span>
              <img src="/landing/buttie-simulation-web.png" alt="" />
              <strong>자산 흐름 미리보기</strong>
            </article>
            <article class="motion-gallery-card motion-gallery-card--period">
              <span>MY SURVIVAL</span>
              <div>
                <small>예상 버티는 기간</small>
                <strong>60개월</strong>
                <img :src="buttieFront" alt="" />
              </div>
              <b>목표일까지 안정적이에요</b>
            </article>
            <article class="motion-gallery-card motion-gallery-card--policy">
              <span>POLICY MATCH</span>
              <strong>92%</strong>
              <p>내 조건에 가까운<br />정책부터 한눈에</p>
            </article>
            <article class="motion-gallery-card motion-gallery-card--quest">
              <span>QUEST</span>
              <strong>오늘의 준비 +1</strong>
              <div><i></i></div>
              <p>이번 달 식비 줄이기</p>
              <p>청년 정책 확인하기</p>
            </article>
          </div>
        </div>

        <div class="motion-burst" aria-hidden="true">
          <div class="motion-burst__lines">
            <i v-for="line in 36" :key="line" :style="{ '--line-index': line }"></i>
          </div>
          <p>FROM UNCERTAINTY TO CLARITY</p>
          <div class="motion-burst__copy">
            <h2 class="motion-burst__copy-one">막막함을<br />계획으로.</h2>
            <h2 class="motion-burst__copy-two">숫자를<br />안심으로.</h2>
          </div>
        </div>

        <div class="motion-finale">
          <span class="motion-finale__light motion-finale__light--one" aria-hidden="true"></span>
          <span class="motion-finale__light motion-finale__light--two" aria-hidden="true"></span>
          <span class="motion-finale__glass" aria-hidden="true">BUTTIE</span>
          <div class="motion-finale__buttie-wrap">
            <img :src="buttieFront" alt="함께 계획하는 버티 캐릭터" />
          </div>
          <div class="motion-finale__copy">
            <p>PLAN WITH BUTTIE</p>
            <h2>
              <span>버틸 수 있는 시간을</span>
              <span>계획하는 서비스.</span>
            </h2>
          </div>
          <span class="motion-token motion-token--period" aria-hidden="true">60개월</span>
          <span class="motion-token motion-token--policy" aria-hidden="true">정책 92%</span>
          <span class="motion-token motion-token--day" aria-hidden="true">D−DAY</span>
        </div>
      </div>
    </section>

    <section id="policy" class="policy section shell">
      <div class="section-heading" data-reveal>
        <p class="section-label">POLICY MATCH</p>
        <h2>나에게 맞는 지원은<br />찾는 시간을 줄이고.</h2>
        <p>지역·나이·소득·취업 상태를 바탕으로 확인할 가치가 높은 정책부터 보여드려요.</p>
      </div>

      <div class="policy-grid">
        <a
          v-for="(policy, index) in policies"
          :key="policy.title"
          class="policy-card"
          :class="`policy-card--${policy.tone}`"
          :href="policy.href"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`${policy.title} 정책 페이지로 이동`"
          data-reveal
          :style="{ '--reveal-delay': `${index * 110}ms` }"
        >
          <div class="policy-topline">
            <span class="pill-tag">{{ policy.tag }}</span>
            <span>0{{ index + 1 }}</span>
          </div>
          <div>
            <h3>{{ policy.title }}</h3>
            <p>{{ policy.note }}</p>
          </div>
          <span class="policy-link">자세히 보기 <b aria-hidden="true">↗</b></span>
        </a>
      </div>
      <p class="policy-disclaimer">
        ※ 정책의 최종 자격과 신청 가능 여부는 담당 기관의 최신 공고에서 다시 확인해 주세요.
      </p>
    </section>

    <section class="final-cta shell" data-reveal>
      <span class="cta-spark cta-spark--one" aria-hidden="true">✦</span>
      <span class="cta-spark cta-spark--two" aria-hidden="true">♥</span>
      <img :src="buttieStable" alt="응원하는 버티 캐릭터" />
      <div>
        <p class="section-label">READY TO KEEP GOING?</p>
        <h2>막막한 오늘도,<br />우리 같이 버텨봐요.</h2>
        <RouterLink class="button" :to="{ name: 'login' }">
          내 계획 만들기 <span aria-hidden="true">↗</span>
        </RouterLink>
      </div>
    </section>

    <footer class="footer shell" data-reveal>
      <div>
        <a class="brand" href="#top" aria-label="버티 홈으로 이동">
          <img :src="buttieLogo" alt="버티" />
        </a>
        <p>취업 준비를 버티는 가장 현실적인 방법</p>
      </div>
      <div class="footer-links">
        <a href="#story">서비스 소개</a>
        <a href="#features">이용 방법</a>
        <a href="#policy">정책 추천</a>
      </div>
      <p class="copyright">© 2026 BUTTIE. ALL RIGHTS RESERVED.</p>
    </footer>
  </main>
</template>

<style scoped src="./LandingPage.css"></style>
