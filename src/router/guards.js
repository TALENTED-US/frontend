const DEFAULT_TITLE = 'Buttie'

const createDocumentTitle = (routeTitle) => {
  if (!routeTitle) {
    return DEFAULT_TITLE
  }

  return `${routeTitle} | ${DEFAULT_TITLE}`
}

/**
 * 애플리케이션에서 사용하는 전역 Navigation Guard를 등록합니다.
 *
 * 각 route의 meta에는 다음 속성을 사용할 수 있습니다.
 * - title: 브라우저 탭에 표시할 페이지 이름
 * - requiresAuth: 로그인한 사용자만 접근 가능한 페이지
 * - requiresAdmin: 관리자만 접근 가능한 페이지
 *
 * requiresAuth와 requiresAdmin의 실제 권한 검사는 auth store 구현 후
 * 이 함수의 beforeEach Guard에 추가합니다.
 */
export const setupRouterGuards = (router) => {
  router.beforeEach(() => {
    // 현재는 인증 Store가 없으므로 모든 페이지 이동을 허용합니다.
    return true
  })

  router.afterEach((to) => {
    document.title = createDocumentTitle(to.meta.title)
  })
}
