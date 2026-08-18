<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 랜딩 진입 후킹 인트로.
 * 0.00s  전면 페이퍼 오버레이 + 후킹 카피 등장
 * 0.15s  하단 로딩 라인이 차오름
 * 0.92s  카피/라인 퇴장, 히어로 애니메이션 시작
 * 1.00s  중앙에서 원형 홀이 열리며 히어로 공개 (~1.64s 종료)
 *
 * 후킹 멘트는 아래 네 상수만 바꾸면 됩니다. (MARK 부분에 노란 형광펜)
 * 대안:
 *   '통장은 줄고,'          / '취준은' + ' 길어지고' + '.'
 *   '소득 0원,'             / '얼마나 ' + '버틸' + ' 수 있나요?'
 *   '수입은 멈췄는데,'      / '나가는 돈은 ' + '안 멈춰요' + '.'
 *   '취준에는 끝이 있는데,' / '잔고에는' + ' 없더라고요' + '.'
 *
 * 인트로는 탭 세션당 한 번만 재생됩니다. 개발 중 다시 보려면 /?intro 로 열거나
 * sessionStorage.removeItem('buttie:landing-entrance-seen') 후 새로고침하세요.
 */
const HOOK_LEAD = '버티는 데도,'
const HOOK_MAIN_BEFORE = '계획이 '
const HOOK_MAIN_MARK = '필요합니다'
const HOOK_MAIN_AFTER = '.'

const SEEN_KEY = 'buttie:landing-entrance-seen'
const HOLD_CLASS = 'hero-entrance-hold'
const LOCK_CLASS = 'hero-entrance-lock'

const REVEAL_AT = 920
const FINISH_AT = 1640

const root = document.documentElement
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const forced = new URLSearchParams(window.location.search).has('intro')
const alreadySeen = (() => {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
})()

// setup 단계에서 잠가야 히어로가 한 프레임이라도 먼저 보이지 않습니다.
// ?intro 는 reduce-motion·세션 기록까지 무시하는 개발용 강제 프리뷰입니다.
// 실사용자는 여전히 reduce-motion 이면 인트로가 생략됩니다.
const active = ref(forced || (!reducedMotion && !alreadySeen))

if (active.value) {
  root.classList.add(HOLD_CLASS, LOCK_CLASS)
}

const phase = ref('load')
const timers = []
const SKIP_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart']

function releaseHold() {
  root.classList.remove(HOLD_CLASS)
}

function finish() {
  if (!active.value) return

  timers.forEach(window.clearTimeout)
  timers.length = 0
  SKIP_EVENTS.forEach((type) => window.removeEventListener(type, skip))

  releaseHold()
  root.classList.remove(LOCK_CLASS)
  active.value = false

  try {
    window.sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* 세션 저장 불가여도 인트로 자체는 정상 종료 */
  }
}

function skip() {
  if (phase.value === 'skip') return
  phase.value = 'skip'
  releaseHold()
  timers.forEach(window.clearTimeout)
  timers.length = 0
  timers.push(window.setTimeout(finish, 220))
}

onMounted(() => {
  if (!active.value) {
    finish()
    return
  }

  SKIP_EVENTS.forEach((type) => window.addEventListener(type, skip, { passive: true }))
  timers.push(
    window.setTimeout(() => {
      if (phase.value === 'skip') return
      phase.value = 'reveal'
      releaseHold()
    }, REVEAL_AT),
  )
  timers.push(window.setTimeout(finish, FINISH_AT))
})

onBeforeUnmount(() => {
  timers.forEach(window.clearTimeout)
  SKIP_EVENTS.forEach((type) => window.removeEventListener(type, skip))
  root.classList.remove(HOLD_CLASS, LOCK_CLASS)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="active"
      class="entrance"
      :data-phase="phase"
      :data-forced="forced ? 'true' : 'false'"
      aria-hidden="true"
    >
      <div class="entrance-veil"></div>
      <span class="entrance-ring"></span>

      <div class="entrance-stage">
        <p class="entrance-hook">
          <span class="entrance-hook-lead">{{ HOOK_LEAD }}</span>
          <span class="entrance-hook-main">
            {{ HOOK_MAIN_BEFORE }}<em>{{ HOOK_MAIN_MARK }}</em
            >{{ HOOK_MAIN_AFTER }}
          </span>
        </p>
        <span class="entrance-bar"><i></i></span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.entrance {
  position: fixed;
  z-index: 9999;
  inset: 0;
  pointer-events: none;
  font-family: Inter, Pretendard, 'Apple SD Gothic Neo', sans-serif;
  word-break: keep-all;
}

/* 100vmax 스프레드 그림자가 화면을 덮고, 가운데 원은 뚫린 구멍이 됩니다.
   구멍의 지름을 키우면 히어로가 가운데부터 드러납니다.
   transform: scale 대신 크기를 직접 키워야 원 테두리가 뭉개지지 않습니다. */
.entrance-veil {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 50%;
  box-shadow: 0 0 0 100vmax #f5f7f9;
}

.entrance-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border: 1px solid rgb(10 22 128 / 22%);
  border-radius: 50%;
  opacity: 0;
}

.entrance-stage {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 34px;
  padding: 0 24px;
}

.entrance-hook {
  display: grid;
  gap: 6px;
  margin: 0;
  color: #0a1680;
  font-size: clamp(28px, 4.4vw, 52px);
  font-weight: 800;
  letter-spacing: -0.055em;
  line-height: 1.12;
  text-align: center;
}

.entrance-hook-lead,
.entrance-hook-main {
  display: block;
  opacity: 0;
  transform: translateY(16px);
}

.entrance-hook-lead {
  color: #4e5968;
  font-size: 0.62em;
  font-weight: 600;
  letter-spacing: -0.03em;
}

.entrance-hook-main em {
  position: relative;
  z-index: 0;
  font-style: normal;
}

.entrance-hook-main em::after {
  position: absolute;
  right: -3%;
  bottom: 0.02em;
  left: -3%;
  z-index: -1;
  height: 0.34em;
  background: #f1b94c;
  content: '';
  opacity: 0.9;
  transform: scaleX(0);
  transform-origin: left;
}

.entrance-bar {
  display: block;
  width: min(180px, 42vw);
  height: 2px;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(10 22 128 / 10%);
  opacity: 0;
}

.entrance-bar i {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: #0a1680;
  transform: scaleX(0);
  transform-origin: left;
}

/* ── 1단계: 후킹 카피 등장 ─────────────────────────── */
.entrance[data-phase='load'] .entrance-hook-lead {
  animation: entrance-copy-in 0.62s cubic-bezier(0.16, 1, 0.3, 1) 0.09s both;
}

.entrance[data-phase='load'] .entrance-hook-main {
  animation: entrance-copy-in 0.66s cubic-bezier(0.16, 1, 0.3, 1) 0.22s both;
}

.entrance[data-phase='load'] .entrance-hook-main em::after {
  animation: entrance-mark-in 0.42s cubic-bezier(0.16, 1, 0.3, 1) 0.54s both;
}

.entrance[data-phase='load'] .entrance-bar {
  animation: entrance-copy-in 0.4s ease-out 0.14s both;
}

.entrance[data-phase='load'] .entrance-bar i {
  animation: entrance-bar-fill 0.74s cubic-bezier(0.5, 0.1, 0.2, 1) 0.16s both;
}

/* ── 2단계: 중앙에서 열리며 히어로 공개 ───────────────── */
.entrance[data-phase='reveal'] .entrance-stage {
  animation: entrance-copy-out 0.24s ease-in both;
}

.entrance[data-phase='reveal'] .entrance-veil {
  animation: entrance-open 0.66s cubic-bezier(0.62, 0, 0.28, 1) 0.06s both;
}

.entrance[data-phase='reveal'] .entrance-ring {
  animation: entrance-ring-out 0.62s cubic-bezier(0.34, 0.6, 0.24, 1) 0.06s both;
}

/* ── 스킵: 전체를 짧게 페이드 ────────────────────────── */
.entrance[data-phase='skip'] {
  animation: entrance-copy-out 0.2s ease-out both;
}

@keyframes entrance-copy-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes entrance-copy-out {
  to {
    opacity: 0;
  }
}

@keyframes entrance-mark-in {
  to {
    transform: scaleX(1);
  }
}

@keyframes entrance-bar-fill {
  to {
    transform: scaleX(1);
  }
}

@keyframes entrance-open {
  from {
    width: 12px;
    height: 12px;
    margin: -6px 0 0 -6px;
  }

  to {
    width: 260vmax;
    height: 260vmax;
    margin: -130vmax 0 0 -130vmax;
  }
}

@keyframes entrance-ring-out {
  0% {
    width: 12px;
    height: 12px;
    margin: -6px 0 0 -6px;
    opacity: 0.85;
  }

  100% {
    width: 280vmax;
    height: 280vmax;
    margin: -140vmax 0 0 -140vmax;
    opacity: 0;
  }
}

/* reduce-motion 사용자에겐 인트로를 숨기되, ?intro 강제 프리뷰는 예외로 둡니다. */
@media (prefers-reduced-motion: reduce) {
  .entrance:not([data-forced='true']) {
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

/* 인트로가 덮고 있는 동안 랜딩 자체 등장 애니메이션을 정지시켜 두었다가,
   구멍이 열리는 순간부터 재생되게 합니다. */
html.hero-entrance-hold .landing-page,
html.hero-entrance-hold .landing-page *,
html.hero-entrance-hold .landing-page *::before,
html.hero-entrance-hold .landing-page *::after {
  animation-play-state: paused !important;
}
</style>
