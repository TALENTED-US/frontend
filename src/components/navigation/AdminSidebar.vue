<!-- src/components/navigation/AdminSidebar.vue -->
<template>
  <aside class="admin-sidebar">
    <div class="admin-sidebar__brand">
      <div class="admin-sidebar__logo"></div>
      <p class="admin-sidebar__brand-name">버티</p>
    </div>

    <p class="admin-sidebar__section-label">관리자 메뉴</p>

    <nav class="admin-sidebar__nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="admin-sidebar__item"
        :class="{ 'admin-sidebar__item--active': isActive(item.to) }"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="admin-sidebar__spacer"></div>

    <div class="admin-sidebar__account">
      <p class="admin-sidebar__account-name">{{ adminName }}</p>
      <p class="admin-sidebar__account-role">{{ adminRole }}</p>
    </div>
  </aside>
</template>

<script setup>
import { useRoute } from 'vue-router'

defineProps({
  adminName: {
    type: String,
    default: '관리자',
  },
  adminRole: {
    type: String,
    default: 'Admin',
  },
})

const route = useRoute()

const navItems = [
  { label: '회원 관리', to: '/admin/members' },
  { label: '대시보드', to: '/admin/dashboard' },
  { label: '금융데이터 관리', to: '/admin/finance-data' },
  { label: '정부지원정책 관리', to: '/admin/policies' },
  { label: '금융상품 관리', to: '/admin/products' },
  { label: '리워드 관리', to: '/admin/rewards' },
]

function isActive(path) {
  return route.path === path
}
</script>

<style scoped>
.admin-sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 252px;
  min-height: 100vh;
  padding: 34px 18px 0;
  background-color: #0b0c0f;
}

.admin-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
}

.admin-sidebar__logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background-color: #ffc747;
  flex-shrink: 0;
}

.admin-sidebar__brand-name {
  font-family: 'Pretendard', sans-serif;
  font-weight: 700;
  font-size: 20px;
  color: #ffffff;
  margin: 0;
}

.admin-sidebar__section-label {
  font-family: 'Pretendard', sans-serif;
  font-weight: 500;
  font-size: 12px;
  color: #9eabcc;
  margin: 0;
}

.admin-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.admin-sidebar__item {
  display: flex;
  align-items: center;
  height: 42px;
  padding-left: 20px;
  border-radius: 10px;
  font-family: 'Pretendard', sans-serif;
  font-weight: 500;
  font-size: 14px;
  color: #ccd1e0;
  text-decoration: none;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.admin-sidebar__item:hover {
  background-color: rgba(255, 199, 71, 0.08);
}

.admin-sidebar__item--active {
  background-color: #ffc747;
  color: #14171f;
  font-weight: 700;
}

.admin-sidebar__spacer {
  flex: 1;
}

.admin-sidebar__account {
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 64px;
  padding: 10px 0 0 12px;
  margin-bottom: 18px;
  border-radius: 10px;
  background-color: #17181f;
}

.admin-sidebar__account-name {
  font-family: 'Pretendard', sans-serif;
  font-weight: 700;
  font-size: 13px;
  color: #f0f2fa;
  margin: 0;
}

.admin-sidebar__account-role {
  font-family: 'Pretendard', sans-serif;
  font-weight: 400;
  font-size: 11px;
  color: #5e6e87;
  margin: 0;
}
</style>
