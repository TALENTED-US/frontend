<script setup>
import AppHeader from '@/components/navigation/AppHeader.vue'
import BottomNavigation from '@/components/navigation/BottomNavigation.vue'
import DesktopSidebar from '@/components/navigation/DesktopSidebar.vue'
</script>

<template>
  <div class="app-shell">
    <DesktopSidebar class="desktop-only" />
    <div class="app-shell__body">
      <AppHeader />
      <main class="app-shell__content">
        <RouterView />
      </main>
    </div>
    <BottomNavigation class="mobile-only" />
  </div>
</template>

<style scoped>
.app-shell {
  width: min(100%, 1440px);
  min-height: 100dvh;
  margin: 0 auto;
  background: var(--background);
}

.app-shell__body {
  min-height: 100dvh;
  margin-left: var(--sidebar-width);
}

.app-shell__content {
  padding: 4px clamp(30px, 4vw, 62px) 70px;
}

@media (max-width: 767px) {
  .app-shell__body {
    margin-left: 0;
    background: var(--background);
  }

  .app-shell__content {
    padding: 12px 14px calc(var(--bottom-nav-height) + 22px);
  }
}
</style>
