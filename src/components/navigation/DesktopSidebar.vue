<script setup>
import BrandLogo from './BrandLogo.vue'

const menus = [
  { to: '/', label: '홈' },
  { to: '/finance', label: '내 재정' },
  { to: '/simulation', label: '시뮬레이션' },
  { to: '/search', label: '검색' },
  { to: '/mypage', label: '마이페이지' },
]
</script>

<template>
  <aside class="sidebar">
    <BrandLogo />
    <nav class="sidebar__nav" aria-label="주요 메뉴">
      <RouterLink v-for="menu in menus" :key="menu.to" :to="menu.to" class="sidebar__link">
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
  padding: 32px 28px;
  background: #fbfcff;
}

.sidebar__nav {
  display: grid;
  gap: 9px;
  margin-top: 58px;
}

.sidebar__link {
  display: flex;
  align-items: center;
  height: 42px;
  padding: 0 16px;
  border-radius: 9px;
  color: #353535;
  font-size: 14px;
}

.sidebar__link:hover {
  color: var(--primary);
}

.sidebar__link.router-link-exact-active,
.sidebar__link.router-link-active:not([href='/']) {
  background: var(--accent);
  color: var(--primary);
  font-weight: 800;
}
</style>
