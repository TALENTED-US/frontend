import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useSessionStore } from './stores/session'

import './styles/tokens.css'
import './styles/reset.css'
import './styles/global.css'

const isMobileStandalone = document.documentElement.classList.contains('pwa-standalone')
const splashStartedAt = performance.now()
const PWA_LANDING_SEEN_KEY = 'buttie-pwa-landing-seen'

function hasSeenPwaLanding() {
  try {
    return localStorage.getItem(PWA_LANDING_SEEN_KEY) === 'true'
  } catch {
    return false
  }
}

function markPwaLandingSeen() {
  try {
    localStorage.setItem(PWA_LANDING_SEEN_KEY, 'true')
  } catch {
    // 저장소를 사용할 수 없는 환경에서는 기존 랜딩 동작을 유지한다.
  }
}

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  const session = useSessionStore(pinia)

  app.use(pinia)
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const initialPath = basePath && window.location.pathname.startsWith(basePath)
    ? window.location.pathname.slice(basePath.length) || '/'
    : window.location.pathname
  const initialRoute = router.resolve(initialPath)
  const isProtectedInitialRoute = initialRoute.matched.some((route) => route.meta.requiresAuth)
  const isPwaRootLaunch = isMobileStandalone && initialPath === '/'

  await session.restoreSession({
    reissueIfMissing: isProtectedInitialRoute || isPwaRootLaunch,
  })

  const shouldSkipPwaLanding =
    isPwaRootLaunch && (session.isAuthenticated || hasSeenPwaLanding())

  if (isPwaRootLaunch && !session.isAuthenticated && !shouldSkipPwaLanding) {
    markPwaLandingSeen()
  }

  if (isMobileStandalone) {
    const remainingSplashTime = Math.max(0, 1000 - (performance.now() - splashStartedAt))
    await new Promise((resolve) => window.setTimeout(resolve, remainingSplashTime))
  }

  if (shouldSkipPwaLanding) {
    const destination = session.isAuthenticated ? '/dashboard' : '/auth/login'
    const destinationPath = `${basePath}${destination}`
    window.history.replaceState(window.history.state, '', destinationPath)
  }

  app.use(router)
  app.mount('#app')
}

bootstrap()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('서비스 워커 등록에 실패했습니다.', error)
    })
  })
}
