<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import BrandLogo from './BrandLogo.vue'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const menus = [
  { to: '/', label: '홈' },
  { to: '/finance', label: '내 재정' },
  { to: '/simulation', label: '시뮬레이션' },
  { to: '/search', label: '정책' },
  { to: '/mypage', label: '마이페이지' },
]

function isMenuActive(to) {
  if (to === '/') return route.path === '/'
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
    <button class="sidebar__logout" type="button" @click="logout">로그아웃</button>
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

.sidebar__logout {
  width: 100%;
  min-height: 56px;
  margin-top: auto;
  border: 1px solid #e2e3e8;
  border-radius: 14px;
  background: #fff;
  box-shadow: none;
  color: #666;
  font-size: var(--font-body);
  font-weight: 800;
}
</style>
