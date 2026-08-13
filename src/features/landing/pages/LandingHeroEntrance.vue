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
    const targetCenterX = targetRect.left + targetRect.width / 2
    const targetCenterY = targetRect.top + targetRect.height / 2
    const scale = window.innerWidth < 600 ? 1.14 : 1.42

    Object.assign(node.style, {
      left: `${targetRect.left}px`,
      top: `${targetRect.top}px`,
      width: `${targetRect.width}px`,
      fontSize: styles.fontSize,
      lineHeight: styles.lineHeight,
      letterSpacing: styles.letterSpacing,
    })
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
  <div v-if="!finished" ref="flight" class="hero-flight-title" aria-hidden="true">
    <span class="hero-title-line">
      <span class="hero-title-first-word hero-flight-drop">취준,</span>
      <span class="hero-flight-write hero-flight-write-first">감으로</span>
    </span>
    <em class="hero-title-second-line hero-flight-second-line">
      <span class="hero-flight-write hero-flight-write-second">버티지 마세요.</span>
    </em>
  </div>
</template>

<style scoped>
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

.hero-flight-title[data-ready='true'] { opacity: 1; }
.hero-title-line { display: flex; align-items: baseline; gap: .14em; }
.hero-title-first-word { position: relative; z-index: 0; display: inline-block; }
.hero-title-first-word::after {
  content: '';
  position: absolute;
  z-index: -1;
  right: -4%;
  bottom: .02em;
  left: -4%;
  height: .13em;
  border-radius: 999px;
  background: #f1b94c;
  transform-origin: center;
}

.hero-flight-drop {
  transform-origin: center bottom;
  animation: hero-title-drop-in 1s cubic-bezier(.2,.85,.28,1.18) .18s both;
}

.hero-flight-drop::after {
  transform: scaleX(0);
  animation: hero-title-thud .35s ease-out .95s both;
}

.hero-flight-write {
  display: block;
  width: max-content;
  white-space: nowrap;
  opacity: 0;
  clip-path: inset(0 100% 0 0);
}

.hero-flight-write-first { animation: hero-title-write-in .68s steps(7, end) 1.18s both; }
.hero-title-second-line { position: relative; z-index: 0; display: block; width: max-content; font-style: normal; }
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
  animation: hero-flight-line-in .34s ease-out 2.38s both;
}

.hero-flight-write-second { animation: hero-title-write-in .82s steps(9, end) 1.72s both; }

@keyframes hero-title-drop-in {
  0% { opacity: 0; transform: translateY(-78vh) rotate(-7deg) scale(.92); }
  62% { opacity: 1; transform: translateY(15px) rotate(1deg) scale(1.07, .9); }
  78% { transform: translateY(-24px) rotate(-.5deg) scale(.98, 1.04); }
  100% { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
}

@keyframes hero-title-thud {
  0% { opacity: 0; transform: scaleX(0); }
  55% { opacity: 1; transform: scaleX(1.12); }
  100% { opacity: 1; transform: scaleX(1); }
}

@keyframes hero-flight-line-in { to { transform: rotate(-1deg) scaleX(1); } }
@keyframes hero-title-write-in {
  0% { opacity: 1; clip-path: inset(0 100% 0 0); transform: translateX(-10px); }
  100% { opacity: 1; clip-path: inset(0 0 0 0); transform: translateX(0); }
}

@media (prefers-reduced-motion: reduce) {
  .hero-flight-title { display: none; }
}
</style>

<style>
html.hero-entrance-lock,
html.hero-entrance-lock body {
  overflow: hidden !important;
  overscroll-behavior: none;
}
</style>
