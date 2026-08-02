<script setup>
import { useRoute } from 'vue-router'
import BrandLogo from './BrandLogo.vue'

const route = useRoute()

const menus = [
  { to: '/', label: '홈' },
  { to: '/finance', label: '내 재정' },
  { to: '/simulation', label: '시뮬레이션' },
  { to: '/search', label: '검색' },
  { to: '/mypage', label: '마이페이지' },
]

function isMenuActive(to) {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
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
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  z-index: 20;
  inset: 0 auto 0 max(0px, calc((100vw - 1440px) / 2));
  width: var(--sidebar-width);
  padding: 32px 24px;
  background: #fbfcff;
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
  font-size: var(--font-ui);
  line-height: 1.4;
}

.sidebar__link:hover {
  color: var(--primary);
}

.sidebar__link.active {
  background: #eef0fb;
  color: var(--primary);
  font-weight: 800;
}
</style>
