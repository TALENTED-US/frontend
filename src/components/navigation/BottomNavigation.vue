<script setup>
import { useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'

const route = useRoute()

const menus = [
  { to: '/dashboard', label: '홈', icon: 'home' },
  { to: '/finance', label: '내 재정', icon: 'wallet' },
  { to: '/simulation', label: '시뮬레이션', icon: 'trend' },
  { to: '/search', label: '정책', icon: 'search' },
  { to: '/mypage', label: '마이페이지', icon: 'user' },
]

function isMenuActive(to) {
  if (to === '/dashboard') return route.name === 'dashboard'
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <nav class="bottom-nav" aria-label="모바일 주요 메뉴">
    <RouterLink
      v-for="menu in menus"
      :key="menu.to"
      :to="menu.to"
      :aria-current="isMenuActive(menu.to) ? 'page' : undefined"
      :class="['bottom-nav__link', { active: isMenuActive(menu.to) }]"
    >
      <AppIcon :name="menu.icon" :size="19" />
      <small>{{ menu.label }}</small>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  z-index: 30;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  height: var(--bottom-nav-height);
  border-top: 1px solid #eef0f2;
  background: rgb(255 255 255 / 97%);
  box-shadow: 0 -8px 24px rgb(15 23 42 / 5%);
}

.bottom-nav__link {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 5px;
  min-height: 48px;
  padding: 6px 2px;
  position: relative;
  color: #8b95a1;
}

.bottom-nav__link small {
  max-width: 100%;
  overflow: hidden;
  font-size: var(--font-caption);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottom-nav__link.active {
  color: var(--primary);
  font-weight: 800;
}

.bottom-nav__link.active::before {
  position: absolute;
  top: 0;
  width: 28px;
  height: 3px;
  border-radius: 999px;
  background: var(--primary);
  content: '';
}
</style>
