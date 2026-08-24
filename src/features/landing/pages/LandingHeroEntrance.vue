<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const flight = ref(null)
const finished = ref(false)
let frame = 0
let flightAnimation = null

function finish() {
  document.documentElement.classList.remove('hero-entrance-lock')
  document.documentElement.classList.add('hero-entrance-complete')
  finished.value = true
}

onMounted(async () => {
  document.documentElement.classList.add('hero-entrance-lock')
  await nextTick()

  const target = document.querySelector('[data-hero-title]')
  const node = flight.value
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!target || !node || reducedMotion) {
    finish()
    return
  }

  frame = window.requestAnimationFrame(() => {
    const targetRect = target.getBoundingClientRect()
    if (targetRect.bottom < 0 || targetRect.top > window.innerHeight) {
      finish()
      return
    }

    const styles = window.getComputedStyle(target)
    const isMobile = window.innerWidth < 600
    const desiredScale = isMobile ? 1.14 : 1.42
    const safeHorizontalMargin = isMobile ? 16 : 32
    const landingOvershoot = isMobile ? 1.08 : 1

    Object.assign(node.style, {
      left: `${targetRect.left}px`,
      top: `${targetRect.top}px`,
      width: 'max-content',
      maxWidth: `calc(100vw - ${safeHorizontalMargin * 2}px)`,
      fontSize: styles.fontSize,
      lineHeight: styles.lineHeight,
      letterSpacing: styles.letterSpacing,
    })

    const flightRect = node.getBoundingClientRect()
    const contentWidth = Math.max(flightRect.width, node.scrollWidth)
    const availableWidth = Math.max(0, window.innerWidth - safeHorizontalMargin * 2)
    const safeScale = availableWidth / (contentWidth * landingOvershoot)
    const scale = Math.min(desiredScale, safeScale)
    const landingLeft = Math.min(
      Math.max(targetRect.left, safeHorizontalMargin),
      window.innerWidth - contentWidth - safeHorizontalMargin,
    )
    const targetCenterX = landingLeft + contentWidth / 2
    const targetCenterY = targetRect.top + flightRect.height / 2

    node.style.left = `${landingLeft}px`
    node.dataset.ready = 'true'

    flightAnimation = node.animate(
      [
        {
          transform: `translate(${window.innerWidth / 2 - targetCenterX}px, ${window.innerHeight / 2 - targetCenterY}px) scale(${scale})`,
        },
        { transform: 'translate(0, 0) scale(1)' },
      ],
      {
        delay: 2600,
        duration: 780,
        easing: 'cubic-bezier(.2,.86,.22,1)',
        fill: 'both',
      },
    )

    flightAnimation.finished.then(finish).catch(() => {})
  })
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(frame)
  flightAnimation?.cancel()
  document.documentElement.classList.remove('hero-entrance-lock')
  document.documentElement.classList.remove('hero-entrance-complete')
})
</script>

<template>
  <template v-if="!finished">
    <div class="hero-flight-backdrop" aria-hidden="true"></div>
    <div ref="flight" class="hero-flight-title" aria-hidden="true">
      <span class="hero-title-line">
        <span class="hero-title-first-word hero-flight-drop">취준,</span>
        <span class="hero-flight-write hero-flight-write-first">감으로</span>
      </span>
      <em class="hero-title-second-line hero-flight-second-line">
        <span class="hero-flight-write hero-flight-write-second">버티지 마세요.</span>
      </em>
    </div>
  </template>
</template>

<style scoped>
/* 인트로 전용 배경. 글자가 나는 동안 실제 페이지(nav·마스코트 등)를 가려
   깨끗한 인트로 화면을 만들고, 착지 시점(~3.34s)에 페이드아웃되며 페이지를 드러낸다.
   배경 톤은 랜딩(#f5f7f9)과 같아 사라질 때 이음새가 보이지 않는다. */
.hero-flight-backdrop {
  position: fixed;
  z-index: 9998;
  inset: 0;
  pointer-events: none;
  background-color: #f5f7f9;
  background-image:
    radial-gradient(circle at 50% 40%, rgb(255 249 223 / 72%), transparent 46%),
    linear-gradient(to right, rgb(10 22 128 / 6%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(10 22 128 / 6%) 1px, transparent 1px);
  background-size:
    100% 100%,
    25% 100%,
    100% 25%;
  animation: hero-backdrop-out 0.44s cubic-bezier(0.4, 0, 0.2, 1) 2.9s both;
}

.hero-flight-title {
  position: fixed;
  z-index: 9999;
  display: grid;
  pointer-events: none;
  color: #0a1680 !important;
  font-weight: 800;
  opacity: 0;
  transform-origin: center;
  will-change: transform;
}

.hero-flight-title :where(span, em) {
  color: #0a1680 !important;
}

.hero-flight-title[data-ready='true'] {
  opacity: 1;
}
.hero-title-line {
  display: flex;
  align-items: baseline;
  gap: 0.14em;
}
.hero-title-first-word {
  position: relative;
  z-index: 0;
  display: inline-block;
}
.hero-title-first-word::after {
  content: '';
  position: absolute;
  z-index: -1;
  right: -4%;
  bottom: 0.02em;
  left: -4%;
  height: 0.13em;
  border-radius: 999px;
  background: #f1b94c;
  transform-origin: center;
}

.hero-flight-drop {
  transform-origin: center bottom;
  animation: hero-title-drop-in 1s cubic-bezier(0.2, 0.85, 0.28, 1.18) 0.18s both;
}

.hero-flight-drop::after {
  transform: scaleX(0);
  animation: hero-title-thud 0.35s ease-out 0.95s both;
}

.hero-flight-write {
  display: block;
  width: max-content;
  white-space: nowrap;
  opacity: 0;
  clip-path: inset(0 100% 0 0);
}

.hero-flight-write-first {
  animation: hero-title-write-in 0.68s steps(7, end) 1.18s both;
}
.hero-title-second-line {
  position: relative;
  z-index: 0;
  display: block;
  width: max-content;
  font-style: normal;
}
.hero-title-second-line::after {
  content: '';
  position: absolute;
  z-index: -1;
  right: -3%;
  bottom: 1%;
  left: -3%;
  height: 18%;
  border-radius: 999px;
  background: #f1b94c;
  transform: rotate(-1deg);
  transform-origin: center;
}

.hero-flight-second-line::after {
  transform: rotate(-1deg) scaleX(0);
  animation: hero-flight-line-in 0.34s ease-out 2.38s both;
}

.hero-flight-write-second {
  animation: hero-title-write-in 0.82s steps(9, end) 1.72s both;
}

@keyframes hero-title-drop-in {
  0% {
    opacity: 0;
    transform: translateY(-78vh) rotate(-7deg) scale(0.92);
  }
  62% {
    opacity: 1;
    transform: translateY(15px) rotate(1deg) scale(1.07, 0.9);
  }
  78% {
    transform: translateY(-24px) rotate(-0.5deg) scale(0.98, 1.04);
  }
  100% {
    opacity: 1;
    transform: translateY(0) rotate(0) scale(1);
  }
}

@keyframes hero-title-thud {
  0% {
    opacity: 0;
    transform: scaleX(0);
  }
  55% {
    opacity: 1;
    transform: scaleX(1.12);
  }
  100% {
    opacity: 1;
    transform: scaleX(1);
  }
}

@keyframes hero-flight-line-in {
  to {
    transform: rotate(-1deg) scaleX(1);
  }
}
@keyframes hero-title-write-in {
  0% {
    opacity: 1;
    clip-path: inset(0 100% 0 0);
    transform: translateX(-10px);
  }
  100% {
    opacity: 1;
    clip-path: inset(0 0 0 0);
    transform: translateX(0);
  }
}

@keyframes hero-backdrop-out {
  to {
    opacity: 0;
  }
}

@keyframes hero-mobile-word-in {
  0% { opacity: 0; transform: translateY(10px) scale(.96); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 599px) {
  .hero-flight-write {
    clip-path: none;
  }

  .hero-flight-write-first {
    animation: hero-mobile-word-in .4s ease-out 1.18s both;
  }

  .hero-flight-write-second {
    animation: hero-mobile-word-in .46s ease-out 1.72s both;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-flight-title,
  .hero-flight-backdrop {
    display: none;
  }
}
</style>

<style>
html.hero-entrance-lock,
html.hero-entrance-lock body {
  overflow: hidden !important;
  overscroll-behavior: none;
}
</style>
