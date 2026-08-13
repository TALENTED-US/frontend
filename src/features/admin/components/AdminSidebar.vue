<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const menus = [
  { to: '/admin/dashboard', label: '대시보드' },
  { to: '/admin/members', label: '회원 관리' },
  { to: '/admin/finance-data', label: '금융데이터 관리' },
  { to: '/admin/policies', label: '정부지원정책 관리' },
  { to: '/admin/level', label: '경험치 및 버티 관리' },
]

function isMenuActive(to) {
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <aside class="admin-sidebar">
    <div class="admin-sidebar__brand">
      <span class="admin-sidebar__logo" aria-hidden="true" />
      <strong>버티 Admin</strong>
    </div>
    <nav class="admin-sidebar__nav" aria-label="관리자 메뉴">
      <RouterLink
        v-for="menu in menus"
        :key="menu.to"
        :to="menu.to"
        :aria-current="isMenuActive(menu.to) ? 'page' : undefined"
        :class="['admin-sidebar__link', { active: isMenuActive(menu.to) }]"
      >
        {{ menu.label }}
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  position: sticky;
  z-index: 20;
  top: 0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  width: var(--admin-sidebar-width);
  height: 100dvh;
  padding: 24px;
  background: linear-gradient(180deg, #fff8d8 0, #fff 46%);
  border-right: 1px solid rgb(10 22 128 / 14%);
}

.admin-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
}

.admin-sidebar__logo {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--accent-strong);
  box-shadow: 5px 5px 0 rgb(10 22 128 / 12%);
}

.admin-sidebar__brand strong {
  color: var(--text);
  font-size: var(--font-card-title);
  font-weight: 800;
}

.admin-sidebar__nav {
  display: grid;
  gap: 4px;
  margin-top: 40px;
}

.admin-sidebar__link {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 8px;
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-sidebar__link:hover {
  color: var(--primary);
}

.admin-sidebar__link.active {
  background: var(--primary);
  color: #fff;
  font-weight: 700;
}
</style>
