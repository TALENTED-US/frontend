<script setup>
import AdminHeader from '@/features/admin/components/AdminHeader.vue'
import AdminSidebar from '@/features/admin/components/AdminSidebar.vue'
import SkipLink from '@/components/ui/SkipLink.vue'
</script>

<template>
  <div class="admin-shell">
    <SkipLink />
    <AdminSidebar />
    <div class="admin-shell__body">
      <AdminHeader />
      <main id="main-content" class="admin-shell__content" tabindex="-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 100dvh;
  background: var(--background);
}

.admin-shell__body {
  flex: 1;
  min-width: 0;
  min-height: 100dvh;
}

.admin-shell__content {
  padding: 32px 40px;
}

@media (max-width: 1024px) {
  .admin-shell {
    overflow-x: auto;
  }

  .admin-shell__content {
    padding: 24px;
  }
}
</style>
