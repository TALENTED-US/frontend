import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { refreshMyDataForPage } from '@/features/mydata/mydataStore'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AdminLayout from '@/features/admin/layouts/AdminLayout.vue'

const routes = [
  {
    path: '/',
    name: 'landing',
    component: () => import('@/features/landing/pages/LandingPage.vue'),
  },
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/features/auth/pages/LoginPage.vue'),
      },
      {
        path: 'signup',
        name: 'signup',
        component: () => import('@/features/auth/pages/SignupPage.vue'),
      },
      {
        path: 'find-id',
        name: 'find-id',
        component: () => import('@/features/auth/pages/RecoveryPage.vue'),
      },
      {
        path: 'find-password',
        name: 'find-password',
        component: () => import('@/features/auth/pages/RecoveryPage.vue'),
      },
    ],
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/features/onboarding/pages/OnboardingPage.vue'),
  },
  {
    path: '/dashboard',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        meta: { refreshMyData: true },
        component: () => import('@/features/dashboard/pages/DashboardPage.vue'),
      },
      {
        path: '/finance',
        name: 'finance',
        meta: { refreshMyData: true },
        component: () => import('@/features/finance/pages/FinancePage.vue'),
      },
      {
        path: '/finance/fixed',
        name: 'fixedExpenses',
        meta: { refreshMyData: true },
        component: () => import('@/features/finance/pages/FixedExpensePage.vue'),
      },
      {
        path: '/finance/fixed/add',
        name: 'fixedExpenseAdd',
        meta: { refreshMyData: true },
        component: () => import('@/features/finance/pages/FixedExpensePage.vue'),
      },
      {
        path: '/finance/fixed/delete',
        name: 'fixedExpenseDelete',
        meta: { refreshMyData: true },
        component: () => import('@/features/finance/pages/FixedExpensePage.vue'),
      },
      {
        path: '/simulation',
        name: 'simulation',
        meta: { refreshMyData: true },
        component: () => import('@/features/simulation/pages/SimulationPage.vue'),
      },
      {
        path: '/simulation/edit',
        name: 'simulationEdit',
        meta: { refreshMyData: true },
        component: () => import('@/features/simulation/pages/SimulationEditPage.vue'),
      },
      {
        path: '/simulation/new',
        name: 'simulationNew',
        meta: { simulationStep: 'categories', refreshMyData: true },
        component: () => import('@/features/simulation/pages/SimulationFlowPage.vue'),
      },
      {
        path: '/simulation/continue',
        name: 'simulationContinue',
        meta: { simulationStep: 'continue', refreshMyData: true },
        component: () => import('@/features/simulation/pages/SimulationFlowPage.vue'),
      },
      { path: '/simulation/preview', redirect: '/simulation/expense/preview' },
      {
        path: '/simulation/confirm',
        name: 'simulationConfirm',
        meta: { simulationStep: 'confirm', refreshMyData: true },
        component: () => import('@/features/simulation/pages/SimulationFlowPage.vue'),
      },
      {
        path: '/simulation/:category(expense|income|policy)/preview',
        name: 'simulationCategoryPreview',
        meta: { refreshMyData: true },
        component: () => import('@/features/simulation/pages/SimulationPreviewPage.vue'),
      },
      {
        path: '/simulation/:category(expense|income|policy)',
        name: 'simulationCategory',
        meta: { refreshMyData: true },
        component: () => import('@/features/simulation/pages/SimulationCategoryPage.vue'),
      },
      {
        path: '/timeline',
        name: 'timeline',
        meta: { refreshMyData: true },
        component: () => import('@/features/timeline/pages/TimelinePage.vue'),
      },
      {
        path: '/search',
        name: 'search',
        component: () => import('@/features/search/pages/SearchPage.vue'),
      },
      {
        path: '/search/filter',
        name: 'searchFilter',
        component: () => import('@/features/search/pages/SearchFilterPage.vue'),
      },
      {
        path: '/notifications',
        name: 'notifications',
        component: () => import('@/features/notification/pages/NotificationPage.vue'),
      },
      {
        path: '/mypage',
        name: 'mypage',
        meta: { refreshMyData: true },
        component: () => import('@/features/mypage/pages/MyPage.vue'),
      },
      {
        path: '/mypage/info',
        name: 'myInfo',
        meta: { refreshMyData: true },
        component: () => import('@/features/mypage/pages/MyPageDetail.vue'),
      },
      {
        path: '/mypage/job',
        name: 'jobInfo',
        meta: { refreshMyData: true },
        component: () => import('@/features/mypage/pages/MyPageDetail.vue'),
      },
      {
        path: '/mypage/notifications',
        name: 'notificationSettings',
        component: () => import('@/features/mypage/pages/MyPageDetail.vue'),
      },
      {
        path: '/mypage/security',
        name: 'security',
        component: () => import('@/features/mypage/pages/MyPageDetail.vue'),
      },
      {
        path: '/mypage/security/password/verify',
        name: 'passwordVerification',
        component: () => import('@/features/mypage/pages/PasswordVerificationPage.vue'),
      },
      {
        path: '/mypage/security/password',
        name: 'passwordChange',
        component: () => import('@/features/mypage/pages/PasswordChangePage.vue'),
      },
      {
        path: '/mypage/data',
        name: 'dataManagement',
        meta: { refreshMyData: true },
        component: () => import('@/features/mypage/pages/MyPageDetail.vue'),
      },
      {
        path: '/mypage/withdraw',
        name: 'withdraw',
        component: () => import('@/features/mypage/pages/MyPageDetail.vue'),
      },
    ],
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'adminDashboard' } },
      {
        path: 'dashboard',
        name: 'adminDashboard',
        component: () => import('@/features/admin/pages/AdminDashboardPage.vue'),
      },
      {
        path: 'finance-data',
        name: 'adminFinanceData',
        component: () => import('@/features/admin/pages/AdminFinanceDataPage.vue'),
      },
      {
        path: 'finance-data/history',
        name: 'adminFinanceHistory',
        component: () => import('@/features/admin/pages/AdminFinanceHistoryPage.vue'),
      },
      {
        path: 'finance-data/datasets/create',
        name: 'adminFinanceDatasetCreate',
        component: () => import('@/features/admin/pages/AdminFinanceDatasetCreatePage.vue'),
      },
      {
        path: 'finance-data/members/:memberId',
        name: 'adminFinanceMemberDetail',
        component: () => import('@/features/admin/pages/AdminFinanceMemberDetailPage.vue'),
      },
      {
        path: 'finance-data/:datasetKey',
        name: 'adminFinanceDatasetDetail',
        component: () => import('@/features/admin/pages/AdminFinanceDatasetDetailPage.vue'),
      },
      {
        path: 'policies',
        name: 'adminPolicies',
        component: () => import('@/features/admin/pages/AdminPolicyListPage.vue'),
      },
      {
        path: 'policies/new',
        name: 'adminPolicyCreate',
        component: () => import('@/features/admin/pages/AdminPolicyFormPage.vue'),
      },
      {
        path: 'policies/:policyId/edit',
        name: 'adminPolicyEdit',
        component: () => import('@/features/admin/pages/AdminPolicyFormPage.vue'),
      },
      {
        path: 'policies/history',
        name: 'adminPolicyHistory',
        component: () => import('@/features/admin/pages/AdminPolicyHistoryPage.vue'),
      },
      {
        path: 'members',
        name: 'adminMembers',
        component: () => import('@/features/admin/pages/AdminMemberListPage.vue'),
      },
      {
        path: 'members/:memberId',
        name: 'adminMemberDetail',
        component: () => import('@/features/admin/pages/AdminMemberDetailPage.vue'),
      },
      {
        path: 'level',
        name: 'adminLevel',
        component: () => import('@/features/admin/pages/AdminLevelPage.vue'),
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to, from) => {
  const session = useSessionStore()
  if (to.meta.requiresAuth && !session.isAuthenticated) return { name: 'login' }
  if (to.name === 'login' && session.isAuthenticated) return { name: 'dashboard' }
  if (to.name === 'passwordVerification' && from.name !== 'passwordChange') {
    session.clearPasswordChangeVerification()
  }
  if (to.name === 'passwordChange' && !session.passwordChangeVerified) {
    return { name: 'passwordVerification' }
  }
  if (from.name === 'passwordChange' && to.name !== 'passwordChange') {
    session.clearPasswordChangeVerification()
  }
  const isMyDataConnected =
    session.myDataConnected || session.currentUser.mydataStatus === 'CONNECTED'
  if (
    to.meta.refreshMyData &&
    session.isAuthenticated &&
    !session.isMockMode &&
    isMyDataConnected
  ) {
    try {
      const syncResult = await refreshMyDataForPage()
      session.refreshMyData(syncResult?.lastSyncedAt)
    } catch {
      // 최신화 실패가 페이지 이동과 기존 데이터 표시를 막지 않도록 한다.
    }
  }
  return true
})

router.afterEach((to) => {
  const titles = {
    landing: '버티 | 취준 자산 시뮬레이션',
    dashboard: '홈',
    finance: '내 재정',
    fixedExpenses: '고정지출',
    fixedExpenseAdd: '고정지출 추가',
    fixedExpenseDelete: '고정지출 삭제',
    simulation: '시뮬레이션',
    simulationEdit: '시뮬레이션 수정하기',
    timeline: '타임라인',
    search: '정책',
    notifications: '알림함',
    mypage: '마이페이지',
    login: '로그인',
    signup: '회원가입',
    'find-id': '아이디 찾기',
    'find-password': '비밀번호 찾기',
    simulationCategory: '시뮬레이션 항목',
    simulationNew: '예상 재정 계획 만들기',
    simulationContinue: '시뮬레이션 이어하기',
    simulationPreview: '시나리오 미리보기',
    simulationConfirm: '시나리오 확정하기',
    searchFilter: '상세 필터',
    myInfo: '내 정보',
    jobInfo: '취업 준비 정보 관리',
    notificationSettings: '알림 설정',
    security: '비밀번호·보안',
    passwordVerification: '비밀번호 찾기',
    passwordChange: '비밀번호 변경',
    dataManagement: '데이터 관리',
    withdraw: '회원 탈퇴',
    onboarding: '시작하기',
    adminDashboard: '관리자 대시보드',
    adminMembers: '회원 관리',
    adminMemberDetail: '회원 상세 · 상태 변경',
    adminFinanceData: '금융데이터 관리',
    adminFinanceDatasetDetail: '데이터 세트 상세',
    adminFinanceHistory: '등록·수정·삭제 이력',
    adminPolicies: '정부지원정책 관리',
    adminPolicyCreate: '정책 등록·수정',
    adminPolicyEdit: '정책 등록·수정',
    adminPolicyHistory: '정책 변경 이력·검수',
    adminLevel: '경험치 및 버티 관리',
  }
  document.title = `${titles[to.name] || to.meta.title || 'Buttie'} | Buttie`
})

export default router
