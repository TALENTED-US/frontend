import { createRouter, createWebHistory } from 'vue-router'
import { setupRouterGuards } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  // 화면별 라우트는 src/router/routes에서 도메인 단위로 추가합니다.
  routes: [],

  scrollBehavior(to, from, savedPosition) {
    // 브라우저의 뒤로가기·앞으로가기는 기존 스크롤 위치를 복원합니다.
    if (savedPosition) {
      return savedPosition
    }

    // URL에 #section 형태의 해시가 있으면 해당 요소로 이동합니다.
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      }
    }

    // 일반적인 페이지 이동은 화면 최상단에서 시작합니다.
    return {
      top: 0,
      left: 0,
    }
  },
})

setupRouterGuards(router)

export default router
