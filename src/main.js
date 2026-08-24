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
  const isPwaEntryRoute =
    isMobileStandalone && (initialPath === '/' || initialPath === '/auth/login')

  await session.restoreSession({
    reissueIfMissing: isProtectedInitialRoute || isMobileStandalone,
  })

  const pwaEntryPath = session.isAuthenticated ? '/dashboard' : '/'

  if (isMobileStandalone) {
    const remainingSplashTime = Math.max(0, 1000 - (performance.now() - splashStartedAt))
    await new Promise((resolve) => window.setTimeout(resolve, remainingSplashTime))
  }

  if (isPwaEntryRoute && initialPath !== pwaEntryPath) {
    const destinationPath = `${basePath}${pwaEntryPath}`
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
