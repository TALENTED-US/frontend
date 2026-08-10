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
  display: flex;
  width: 1440px;
  min-width: 1440px;
  min-height: 100dvh;
  background: var(--background);
}

.admin-shell__body {
  flex: 1;
  min-width: 0;
  min-height: 100dvh;
}

.admin-shell__content {
  padding: 32px;
}
</style>
