import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useSessionStore } from './stores/session'

import './styles/tokens.css'
import './styles/reset.css'
import './styles/global.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const initialPath = basePath && window.location.pathname.startsWith(basePath)
    ? window.location.pathname.slice(basePath.length) || '/'
    : window.location.pathname
  const initialRoute = router.resolve(initialPath)
  const isProtectedInitialRoute = initialRoute.matched.some((route) => route.meta.requiresAuth)

  await useSessionStore(pinia).restoreSession({
    reissueIfMissing: isProtectedInitialRoute,
  })
  app.use(router)
  app.mount('#app')
}

bootstrap()
