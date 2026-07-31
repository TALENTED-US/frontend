<script setup>
import { useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'

const route = useRoute()

const menus = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/finance', label: '내 재정', icon: 'wallet' },
  { to: '/simulation', label: '시뮬레이션', icon: 'trend' },
  { to: '/search', label: '검색', icon: 'search' },
  { to: '/mypage', label: '마이페이지', icon: 'user' },
]

function isMenuActive(to) {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <nav class="bottom-nav" aria-label="모바일 주요 메뉴">
    <RouterLink
      v-for="menu in menus"
      :key="menu.to"
      :to="menu.to"
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
  right: max(0px, calc((100vw - 1440px) / 2));
  bottom: 0;
  left: max(0px, calc((100vw - 1440px) / 2));
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  height: var(--bottom-nav-height);
  border-top: 1px solid var(--border);
  background: rgb(255 255 255 / 97%);
}

.bottom-nav__link {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 5px;
  padding: 6px 2px;
  color: #4b4b4b;
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
</style>
