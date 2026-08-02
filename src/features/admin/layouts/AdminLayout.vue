<script setup>
import AdminHeader from '@/features/admin/components/AdminHeader.vue'
import AdminSidebar from '@/features/admin/components/AdminSidebar.vue'
</script>

<template>
  <div class="admin-shell">
    <AdminSidebar />
    <div class="admin-shell__body">
      <AdminHeader />
      <main class="admin-shell__content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  width: min(100%, 1440px);
  min-height: 100dvh;
  margin: 0 auto;
  background: var(--background);
}

.admin-shell__body {
  min-height: 100dvh;
  margin-left: var(--admin-sidebar-width);
}

.admin-shell__content {
  padding: 32px;
}
</style>
