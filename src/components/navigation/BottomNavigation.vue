<!-- src/components/navigation/BottomNavigation.vue -->
<template>
  <nav class="bottom-nav">
    <RouterLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="bottom-nav__item"
      :class="{ 'bottom-nav__item--active': isActive(item.to) }"
    >
      <img :src="item.icon" alt="" class="bottom-nav__icon" />
      <span class="bottom-nav__label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'
import homeIcon from '@/assets/icons/nav-home.svg'
import financeIcon from '@/assets/icons/nav-finance.svg'
import simulationIcon from '@/assets/icons/nav-simulation.svg'
import searchIcon from '@/assets/icons/nav-search.svg'
import myPageIcon from '@/assets/icons/nav-mypage.svg'

const route = useRoute()

const navItems = [
  { label: '홈', to: '/', icon: homeIcon },
  { label: '내 재정', to: '/finance', icon: financeIcon },
  { label: '시뮬레이션', to: '/simulation', icon: simulationIcon },
  { label: '혜택 찾기', to: '/benefits', icon: searchIcon },
  { label: '마이페이지', to: '/mypage', icon: myPageIcon },
]

function isActive(path) {
  return route.path === path
}
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: stretch;
  background-color: #ffffff;
  border-top: 0.829px solid rgba(30, 58, 138, 0.1);
}

.bottom-nav__item {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 0;
  text-decoration: none;
  color: #6b4e3d;
  opacity: 0.5;
  transition: opacity 0.15s ease;
}

.bottom-nav__item--active {
  opacity: 1;
}

.bottom-nav__icon {
  width: 19.99px;
  height: 19.99px;
  filter: brightness(0) saturate(100%);
}

.bottom-nav__label {
  font-family: 'Pretendard', sans-serif;
  font-weight: 600;
  font-size: 10px;
  line-height: 15px;
  color: #6b4e3d;
  text-align: center;
}
</style>
