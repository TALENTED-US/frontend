import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

const routes = [
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      { path: 'login', name: 'login', component: () => import('@/features/auth/pages/LoginPage.vue') },
      { path: 'signup', name: 'signup', component: () => import('@/features/auth/pages/SignupPage.vue') },
      { path: 'find-id', name: 'find-id', component: () => import('@/features/auth/pages/RecoveryPage.vue') },
      { path: 'find-password', name: 'find-password', component: () => import('@/features/auth/pages/RecoveryPage.vue') },
    ],
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/features/onboarding/pages/OnboardingPage.vue'),
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('@/features/dashboard/pages/DashboardPage.vue') },
      { path: 'finance', name: 'finance', component: () => import('@/features/finance/pages/FinancePage.vue') },
      { path: 'simulation', name: 'simulation', component: () => import('@/features/simulation/pages/SimulationPage.vue') },
      { path: 'simulation/:category(expense|income|policy|finance)', name: 'simulationCategory', component: () => import('@/features/simulation/pages/SimulationCategoryPage.vue') },
      { path: 'timeline', name: 'timeline', component: () => import('@/features/timeline/pages/TimelinePage.vue') },
      { path: 'search', name: 'search', component: () => import('@/features/search/pages/SearchPage.vue') },
      { path: 'search/filter', name: 'searchFilter', component: () => import('@/features/search/pages/SearchFilterPage.vue') },
      { path: 'notifications', name: 'notifications', component: () => import('@/features/notification/pages/NotificationPage.vue') },
      { path: 'mypage', name: 'mypage', component: () => import('@/features/mypage/pages/MyPage.vue') },
      { path: 'mypage/info', name: 'myInfo', component: () => import('@/features/mypage/pages/MyPageDetail.vue') },
      { path: 'mypage/job', name: 'jobInfo', component: () => import('@/features/mypage/pages/MyPageDetail.vue') },
      { path: 'mypage/notifications', name: 'notificationSettings', component: () => import('@/features/mypage/pages/MyPageDetail.vue') },
      { path: 'mypage/security', name: 'security', component: () => import('@/features/mypage/pages/MyPageDetail.vue') },
      { path: 'mypage/data', name: 'dataManagement', component: () => import('@/features/mypage/pages/MyPageDetail.vue') },
      { path: 'mypage/withdraw', name: 'withdraw', component: () => import('@/features/mypage/pages/MyPageDetail.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const session = useSessionStore()
  if (to.meta.requiresAuth && !session.isAuthenticated) return { name: 'login' }
  if (to.name === 'login' && session.isAuthenticated) return { name: 'dashboard' }
  return true
})

router.afterEach((to) => {
  const titles = {
    dashboard: '홈',
    finance: '내 재정',
    simulation: '시뮬레이션',
    timeline: '타임라인',
    search: '검색',
    notifications: '알림함',
    mypage: '마이페이지',
    login: '로그인',
    signup: '회원가입',
    'find-id': '아이디 찾기',
    'find-password': '비밀번호 찾기',
    simulationCategory: '시뮬레이션 항목',
    searchFilter: '상세 필터',
    myInfo: '내 정보',
    jobInfo: '취업 준비 정보 관리',
    notificationSettings: '알림 설정',
    security: '비밀번호·보안',
    dataManagement: '데이터 관리',
    withdraw: '회원 탈퇴',
    onboarding: '시작하기',
  }
  document.title = `${titles[to.name] || 'Buttie'} | Buttie`
})

export default router
