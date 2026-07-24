<!-- components/navigation/DesktopSidebar.vue -->
<template>
  <aside class="desktop-sidebar">
    <div class="desktop-sidebar__brand">
      <div class="desktop-sidebar__logo">
        <img
          src="@/assets/icons/logo-mascot.png"
          alt="버티 로고"
          class="desktop-sidebar__logo-img"
        />
      </div>
      <div class="desktop-sidebar__brand-text">
        <p class="desktop-sidebar__brand-name">버티</p>
        <p class="desktop-sidebar__brand-sub">취업 준비 대시보드</p>
      </div>
    </div>

    <nav class="desktop-sidebar__nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="desktop-sidebar__item"
        :class="{ 'desktop-sidebar__item--active': isActive(item.to) }"
      >
        {{ item.label }}
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { label: '홈', to: '/' },
  { label: '내 재정', to: '/finance' },
  { label: '시뮬레이션', to: '/simulation' },
  { label: '검색', to: '/search' },
  { label: '마이페이지', to: '/mypage' },
]

function isActive(path) {
  return route.path === path
}
</script>

<style scoped>
.desktop-sidebar {
  display: flex;
  flex-direction: column;
  width: 244px;
  height: 100vh;
  padding: 34px 20px;
  background-color: #fcfdff;
  border-right: 0.829px solid rgba(30, 58, 138, 0.1);
}

.desktop-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
}

.desktop-sidebar__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background-color: rgba(251, 237, 176, 0.4);
  overflow: hidden;
}

.desktop-sidebar__logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.desktop-sidebar__brand-name {
  font-family: 'Pretendard', sans-serif;
  font-weight: 700;
  font-size: 21px;
  color: #171717;
  line-height: 1.2;
}

.desktop-sidebar__brand-sub {
  font-family: 'Pretendard', sans-serif;
  font-weight: 400;
  font-size: 13px;
  color: #171717;
  margin-top: 2px;
}

.desktop-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.desktop-sidebar__item {
  display: flex;
  align-items: center;
  height: 42px;
  padding: 0 18px;
  border-radius: 12px;
  font-family: 'Noto Sans KR', sans-serif;
  font-weight: 400;
  font-size: 15px;
  color: #171717;
  text-decoration: none;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.desktop-sidebar__item:hover {
  background-color: rgba(10, 22, 128, 0.04);
}

.desktop-sidebar__item--active {
  background-color: rgba(10, 22, 128, 0.08);
  color: #0a1680;
  font-weight: 500;
}
</style>
