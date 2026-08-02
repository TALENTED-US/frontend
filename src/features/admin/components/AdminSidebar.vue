<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const menus = [
  { to: '/admin/members', label: '회원 관리' },
  { to: '/admin/dashboard', label: '대시보드' },
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
        :class="['admin-sidebar__link', { active: isMenuActive(menu.to) }]"
      >
        {{ menu.label }}
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  position: fixed;
  z-index: 20;
  inset: 0 auto 0 max(0px, calc((100vw - 1440px) / 2));
  display: flex;
  flex-direction: column;
  width: var(--admin-sidebar-width);
  height: 100dvh;
  padding: 24px;
  background: var(--surface);
  border-right: 1px solid var(--border);
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
  min-height: 40px;
  padding: 8px;
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-sidebar__link:hover {
  color: var(--primary);
}

.admin-sidebar__link.active {
  background: var(--accent);
  color: var(--text);
  font-weight: 700;
}
</style>
