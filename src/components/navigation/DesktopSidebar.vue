<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import {
  loadNotifications,
  markNotificationRead,
  notificationItems,
  notificationState,
  refreshUnreadNotificationCheck,
  unreadNotificationCount,
} from '@/features/notification/notificationStore'
import { useSessionStore } from '@/stores/session'
import BrandLogo from './BrandLogo.vue'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const notificationArea = ref(null)
const isNotificationOpen = ref(false)
const popoverItems = computed(() =>
  notificationItems.value.filter((item) => !item.read).slice(0, 3),
)

const menus = [
  { to: '/dashboard', label: '홈' },
  { to: '/finance', label: '내 재정' },
  { to: '/simulation', label: '시뮬레이션' },
  { to: '/search', label: '정책' },
  { to: '/mypage', label: '마이페이지' },
]

function isMenuActive(to) {
  if (to === '/dashboard') return route.name === 'dashboard'
  return route.path === to || route.path.startsWith(`${to}/`)
}

async function toggleNotifications() {
  isNotificationOpen.value = !isNotificationOpen.value
  if (!isNotificationOpen.value) return

  await refreshUnreadNotificationCheck()
  try {
    await loadNotifications(true)
  } catch {
    // 오류 상태는 팝오버 안에서 안내합니다.
  }
}

async function openNotification(item) {
  if (!(await markNotificationRead(item.id))) return
  isNotificationOpen.value = false
  router.push(item.url?.startsWith('/') ? item.url : '/notifications')
}

function closeNotifications(event) {
  if (isNotificationOpen.value && !notificationArea.value?.contains(event.target)) {
    isNotificationOpen.value = false
  }
}

function closeNotificationsOnEscape(event) {
  if (event.key === 'Escape') isNotificationOpen.value = false
}

async function logout() {
  await session.logout()
  router.replace('/auth/login')
}

onMounted(async () => {
  document.addEventListener('pointerdown', closeNotifications)
  document.addEventListener('keydown', closeNotificationsOnEscape)
  try {
    await loadNotifications()
  } catch {
    // 사이드바 렌더링은 유지하고 팝오버에서 오류를 안내합니다.
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeNotifications)
  document.removeEventListener('keydown', closeNotificationsOnEscape)
})

watch(
  () => route.fullPath,
  () => {
    isNotificationOpen.value = false
  },
)
</script>

<template>
  <aside class="sidebar">
    <BrandLogo />
    <nav class="sidebar__nav" aria-label="주요 메뉴">
      <RouterLink
        v-for="menu in menus"
        :key="menu.to"
        :to="menu.to"
        :class="['sidebar__link', { active: isMenuActive(menu.to) }]"
      >
        {{ menu.label }}
      </RouterLink>
    </nav>

    <div class="sidebar__footer">
      <div ref="notificationArea" class="sidebar__notification">
        <button
          class="sidebar__utility"
          :class="{ active: isNotificationOpen }"
          type="button"
          aria-label="알림 확인"
          aria-controls="sidebar-notification-popover"
          :aria-expanded="isNotificationOpen"
          @click.stop="toggleNotifications"
        >
          <span class="sidebar__utility-icon">
            <AppIcon name="bell" :size="24" />
            <b v-if="unreadNotificationCount" class="sidebar__badge">{{
              unreadNotificationCount
            }}</b>
          </span>
          <span>알림</span>
        </button>

        <section
          v-if="isNotificationOpen"
          id="sidebar-notification-popover"
          class="notification-bubble"
          aria-label="최근 알림"
        >
          <header class="notification-bubble__header">
            <div>
              <span>NOTIFICATIONS</span>
              <h2>새 알림 {{ unreadNotificationCount }}</h2>
            </div>
            <RouterLink to="/notifications" @click="isNotificationOpen = false"
              >전체 보기</RouterLink
            >
          </header>

          <div v-if="popoverItems.length" class="notification-bubble__list">
            <RouterLink
              v-for="item in popoverItems"
              :key="item.id"
              :to="item.url?.startsWith('/') ? item.url : '/notifications'"
              class="notification-bubble__item"
              @click.prevent="openNotification(item)"
            >
              <i aria-hidden="true" />
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.message }}</p>
              </div>
              <time>{{ item.time }}</time>
            </RouterLink>
          </div>
          <p v-else-if="notificationState.error" class="notification-bubble__empty">
            알림을 불러오지 못했어요.
          </p>
          <p v-else class="notification-bubble__empty">새 알림이 없어요.</p>
        </section>
      </div>

      <button class="sidebar__logout" type="button" @click="logout">
        <AppIcon name="logout" :size="24" />
        <span>로그아웃</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  z-index: 50;
  inset: 0 auto 0 0;
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  padding: 32px 24px;
  background: #fbfcff;
  box-shadow: var(--shadow-figma);
}

.sidebar__nav {
  display: grid;
  gap: 10px;
  margin-top: 58px;
}

.sidebar__link {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 8px 18px;
  border-radius: 9px;
  color: #353535;
  font-size: 17px;
  line-height: 1.4;
}

.sidebar__link:hover {
  color: var(--primary);
}

.sidebar__link.active {
  background: #eef0fb;
  box-shadow: var(--shadow-figma);
  color: var(--primary);
  font-weight: 800;
}

.sidebar__footer {
  margin-top: auto;
  margin-bottom: -10px;
  padding-top: 20px;
  border-top: 1px solid #e2e5ec;
}

.sidebar__notification {
  position: relative;
  margin-bottom: 4px;
}

.sidebar__utility,
.sidebar__logout {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 8px 18px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  box-shadow: none;
  font-size: 17px;
  line-height: 1.4;
  text-align: left;
}

.sidebar__utility {
  color: #56606f;
}

.sidebar__utility:hover,
.sidebar__utility.active {
  background: #f0f2fb;
  color: var(--primary);
}

.sidebar__utility-icon {
  position: relative;
  display: inline-grid;
  place-items: center;
}

.sidebar__badge {
  position: absolute;
  top: -8px;
  right: -10px;
  display: grid;
  min-width: 20px;
  height: 20px;
  place-items: center;
  padding: 0 5px;
  border: 2px solid #fbfcff;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.notification-bubble {
  position: absolute;
  z-index: 100;
  bottom: -4px;
  left: calc(100% + 18px);
  width: 360px;
  overflow: visible;
  border: 1px solid #e0e4ec;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 18px 50px rgb(31 42 68 / 16%);
}

.notification-bubble::before {
  position: absolute;
  bottom: 23px;
  left: -9px;
  width: 18px;
  height: 18px;
  border-bottom: 1px solid #e0e4ec;
  border-left: 1px solid #e0e4ec;
  background: #fff;
  content: '';
  transform: rotate(45deg);
}

.notification-bubble__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 16px;
}

.notification-bubble__header span {
  display: block;
  margin-bottom: 4px;
  color: #8a93a3;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.notification-bubble__header h2 {
  margin: 0;
  color: #171c27;
  font-size: 18px;
  font-weight: 800;
}

.notification-bubble__header a {
  flex: none;
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
}

.notification-bubble__list {
  padding: 0 10px 10px;
}

.notification-bubble__item {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: start;
  min-height: 76px;
  padding: 14px 12px;
  border-top: 1px solid #edf0f4;
  border-radius: 12px;
  color: inherit;
}

.notification-bubble__item:hover {
  background: #f7f8fc;
}

.notification-bubble__item i {
  width: 7px;
  height: 7px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--primary);
}

.notification-bubble__item strong,
.notification-bubble__item p {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-bubble__item strong {
  color: #202631;
  font-size: 14px;
  font-weight: 800;
}

.notification-bubble__item p {
  margin: 5px 0 0;
  color: #687385;
  font-size: 13px;
  line-height: 1.4;
}

.notification-bubble__item time {
  color: #98a0ae;
  font-size: 11px;
  white-space: nowrap;
}

.notification-bubble__empty {
  margin: 0;
  padding: 32px 22px;
  border-top: 1px solid #edf0f4;
  color: #7a8493;
  font-size: 14px;
  text-align: center;
}

.sidebar__logout {
  color: #98a0ae;
}

.sidebar__logout:hover {
  color: #727b89;
}
</style>
