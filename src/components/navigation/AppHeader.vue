<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { notifyLatestOncePerDay } from '@/features/notification/notificationService'
import {
  loadNotifications,
  markNotificationRead,
  notificationItems,
  notificationState,
  refreshUnreadNotificationCheck,
  unreadNotificationCount,
} from '@/features/notification/notificationStore'

const route = useRoute()
const router = useRouter()
const openPopover = ref('')
const popoverAnchor = ref(null)
const popoverItems = computed(() =>
  notificationItems.value.filter((item) => !item.read).slice(0, 3),
)
const titles = {
  dashboard: '홈',
  finance: '내 재정',
  fixedExpenses: '고정지출',
  fixedExpenseAdd: '고정지출 추가',
  fixedExpenseDelete: '고정지출 삭제',
  simulation: '시뮬레이션',
  simulationEdit: '시뮬레이션 수정하기',
  simulationCategory: '시뮬레이션',
  simulationNew: '시뮬레이션 시작하기',
  simulationContinue: '시뮬레이션',
  simulationPreview: '예상 재정 계획 만들기',
  simulationConfirm: '시나리오 확정하기',
  timeline: '내 재정',
  search: '정책',
  searchFilter: '정책 상세 필터',
  notifications: '알림',
  mypage: '마이페이지',
  myInfo: '내 정보',
  jobInfo: '취업 준비 정보 관리',
  notificationSettings: '알림 설정',
  security: '비밀번호·보안',
  passwordVerification: '비밀번호 찾기',
  passwordChange: '비밀번호 변경',
  dataManagement: '데이터 관리',
  withdraw: '회원 탈퇴',
}
const title = computed(() => titles[route.name] || '버티')
const isMyPageDetail = computed(() => route.path.startsWith('/mypage/'))
const isSimulationStart = computed(() => route.name === 'simulationNew')
const isSimulationEdit = computed(() => route.name === 'simulationEdit')
const isSimulationContinue = computed(() => route.name === 'simulationContinue')
const isSimulationCategory = computed(() => route.name === 'simulationCategory')
const isSimulationPreview = computed(() => route.name === 'simulationCategoryPreview')
const isFixedExpense = computed(() =>
  ['fixedExpenses', 'fixedExpenseAdd', 'fixedExpenseDelete'].includes(route.name),
)
const isNotifications = computed(() => route.name === 'notifications')
const hasMobileBack = computed(
  () =>
    isMyPageDetail.value ||
    isSimulationStart.value ||
    isSimulationEdit.value ||
    isSimulationContinue.value ||
    isSimulationCategory.value ||
    isSimulationPreview.value ||
    isFixedExpense.value ||
    isNotifications.value,
)
const mobileTitle = computed(() => {
  if (isMyPageDetail.value) return '마이페이지'
  if (isSimulationPreview.value) return '미리보기'
  if (isSimulationCategory.value) {
    return (
      { expense: '지출 줄이기', income: '수입 늘리기', policy: '정책 맞춤 추천' }[
        route.params.category
      ] || '시뮬레이션'
    )
  }
  return title.value
})
const isFinanceMain = computed(() => route.name === 'finance')

async function toggle(name) {
  openPopover.value = openPopover.value === name ? '' : name
  if (openPopover.value === 'notification') {
    await refreshUnreadNotificationCheck()
    try {
      await loadNotifications(true)
    } catch {}
  }
}

function goBackFromMyPageDetail() {
  const securityRoutes = ['passwordVerification', 'passwordChange']
  router.push(securityRoutes.includes(route.name) ? '/mypage/security' : '/mypage')
}

function goBack() {
  if (isNotifications.value) router.back()
  else if (isFixedExpense.value) router.push('/finance')
  else if (isSimulationStart.value) router.push('/simulation')
  else if (isSimulationEdit.value) router.push('/simulation')
  else if (isSimulationContinue.value) router.push('/')
  else if (isSimulationPreview.value) router.push(`/simulation/${route.params.category}`)
  else if (isSimulationCategory.value) {
    const previousPath = {
      expense: '/simulation/new',
      income: '/simulation/expense/preview',
      policy: '/simulation/income/preview',
    }[route.params.category]
    router.push(previousPath || '/simulation')
  } else goBackFromMyPageDetail()
}

async function openNotification(item) {
  if (!(await markNotificationRead(item.id))) return
  openPopover.value = ''
  router.push(item.url?.startsWith('/') ? item.url : '/notifications')
}

function closePopoverOnOutsideClick(event) {
  if (openPopover.value && !popoverAnchor.value?.contains(event.target)) {
    openPopover.value = ''
  }
}

onMounted(async () => {
  document.addEventListener('pointerdown', closePopoverOnOutsideClick)
  try {
    await loadNotifications()
  } catch {}
  notifyLatestOncePerDay()
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', closePopoverOnOutsideClick))
watch(
  () => route.fullPath,
  () => {
    openPopover.value = ''
  },
)
</script>

<template>
  <header :class="['app-header', { 'app-header--finance': isFinanceMain }]">
    <button
      v-if="hasMobileBack"
      class="app-header__back mobile-only"
      type="button"
      :aria-label="
        isNotifications
          ? '이전 화면으로 돌아가기'
          : isFixedExpense
            ? '내 재정으로 돌아가기'
            : isSimulationStart || isSimulationEdit || isSimulationContinue
              ? '시뮬레이션에서 나가기'
              : isSimulationCategory || isSimulationPreview
                ? '이전 시뮬레이션 단계로 돌아가기'
                : '마이페이지로 돌아가기'
      "
      @click="goBack"
    >
      ‹
    </button>
    <strong class="app-header__title mobile-only">{{ mobileTitle }}</strong>
    <div class="app-header__spacer" />
    <div v-if="!isFixedExpense && !isNotifications" ref="popoverAnchor" class="popover-anchor">
      <button
        :class="['header-chip', { active: openPopover === 'notification' }]"
        type="button"
        aria-label="알림"
        @click="toggle('notification')"
      >
        <AppIcon name="bell" :size="19" /><b v-if="unreadNotificationCount" class="header-badge">{{
          unreadNotificationCount
        }}</b>
      </button>
      <section v-if="openPopover === 'notification'" class="header-popover notification-popover">
        <header>
          <h2>새 알림 {{ unreadNotificationCount }}</h2>
          <RouterLink to="/notifications" @click="openPopover = ''">알림함 들어가기</RouterLink>
        </header>
        <RouterLink
          v-for="item in popoverItems"
          :key="item.id"
          :to="item.url?.startsWith('/') ? item.url : '/notifications'"
          @click.prevent="openNotification(item)"
        >
          <i>•</i>
          <div>
            <strong>{{ item.title }}</strong
            ><small>{{ item.message }}</small>
          </div>
          <time>{{ item.time }}</time>
        </RouterLink>
        <p v-if="notificationState.error" class="notification-popover__empty">
          알림을 불러오지 못했어요.
        </p>
        <p v-else-if="popoverItems.length === 0" class="notification-popover__empty">
          새 알림이 없어요.
        </p>
      </section>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  z-index: 40;
  top: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: var(--header-height);
  padding: 17px clamp(30px, 4vw, 62px);
  background: rgb(251 252 255 / 94%);
  backdrop-filter: blur(10px);
}
.app-header--finance {
  position: absolute;
  inset: 0 0 auto;
  background: transparent;
  backdrop-filter: none;
}
.app-header__spacer {
  flex: 1;
}
.app-header__back {
  margin-right: 5px;
  color: #222;
  font-size: var(--font-page-title);
  line-height: 1;
}
.popover-anchor {
  position: relative;
}
.header-chip {
  position: relative;
  display: inline-flex;
  min-height: 46px;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  box-shadow: var(--shadow-figma);
  color: var(--text);
  font-size: var(--font-small);
}
.header-badge {
  position: absolute;
  top: 4px;
  right: 1px;
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 50%;
  background: #ef5f78;
  color: white;
  font-size: 11px;
  line-height: 1;
}
.header-chip.active {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 800;
}
.header-popover {
  position: absolute;
  z-index: 60;
  top: 54px;
  right: 0;
  width: 360px;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: white;
  box-shadow: var(--shadow-md);
}
.notification-popover {
  width: 420px;
  padding: 27px 28px 25px;
  border-radius: 20px;
}
.header-popover::before {
  position: absolute;
  top: -9px;
  right: 30px;
  width: 16px;
  height: 16px;
  border-top: 1px solid var(--border);
  border-left: 1px solid var(--border);
  background: white;
  content: '';
  transform: rotate(45deg);
}
.header-popover > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.header-popover h2 {
  font-size: var(--font-card-title);
}
.header-popover header a {
  color: #666;
  font-size: var(--font-caption);
}
.header-popover > a {
  display: grid;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 10px 0;
}
.header-popover > a div {
  display: grid;
  gap: 4px;
}
.header-popover strong {
  color: var(--primary);
  font-size: var(--font-small);
}
.header-popover small {
  color: #777;
  font-size: var(--font-caption);
}
.notification-popover > header {
  padding-bottom: 13px;
}
.notification-popover h2 {
  color: #242424;
  font-size: var(--font-section-title);
}
.notification-popover header a {
  font-size: var(--font-small);
}
.notification-popover > a {
  grid-template-columns: 8px minmax(0, 1fr) 34px;
  min-height: 82px;
  padding: 12px 14px;
  border-radius: 12px;
}
.notification-popover > a:first-of-type {
  margin-top: 16px;
  background: var(--primary-soft);
}
.notification-popover i {
  align-self: start;
  margin-top: 5px;
  color: var(--danger);
  font-size: var(--font-card-title);
  line-height: 1;
}
.notification-popover strong {
  font-size: var(--font-body);
}
.notification-popover small {
  font-size: var(--font-small);
  line-height: 1.5;
}
.notification-popover time {
  align-self: start;
  padding-top: 3px;
  color: #777;
  text-align: right;
  font-size: var(--font-caption);
}
.notification-popover__empty {
  padding: 36px 0 22px;
  color: var(--muted);
  text-align: center;
  font-size: var(--font-small);
}

@media (max-width: 767px) {
  .app-header {
    min-height: 64px;
    padding: 10px 16px;
    border-bottom: 1px solid #e7e7e7;
  }
  .app-header--finance {
    position: sticky;
    inset: auto;
    background: rgb(251 252 255 / 94%);
    backdrop-filter: blur(10px);
  }
  .app-header__title {
    color: var(--text);
    font-size: 17px;
    font-weight: 900;
  }
  .header-chip {
    min-height: 38px;
    padding: 7px;
    border: 0;
    background: transparent !important;
    color: #172035;
  }
  .header-badge {
    top: 0;
    right: -1px;
    width: 20px;
    height: 20px;
    font-size: var(--font-caption);
  }
  .header-popover {
    position: fixed;
    top: 64px;
    right: 10px;
    left: 10px;
    width: auto;
    max-height: calc(100dvh - 86px);
    overflow: auto;
    padding: 18px;
    border-radius: 14px;
  }
  .notification-popover {
    width: auto;
  }
  .header-popover::before {
    display: none;
  }
}
</style>
