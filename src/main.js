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
  await useSessionStore(pinia).restoreSession()
  app.use(router)
  app.mount('#app')
}

bootstrap()
