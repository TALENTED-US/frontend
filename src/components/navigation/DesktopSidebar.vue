<script setup>
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useSessionStore } from '@/stores/session'
import BrandLogo from './BrandLogo.vue'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

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

async function logout() {
  await session.logout()
  router.replace('/auth/login')
}
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
  color: #98a0ae;
  font-size: 17px;
  line-height: 1.4;
  text-align: left;
}

.sidebar__logout:hover {
  color: #727b89;
}
</style>
