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
  position: relative;
  min-height: 100dvh;
  margin-left: var(--sidebar-width);
}

.app-shell__content {
  padding: 0 74px 78px 56px;
}

@media (max-width: 767px) {
  .app-shell__body {
    margin-left: 0;
    background: var(--background);
  }

  .app-shell__content {
    padding: 10px 16px calc(var(--bottom-nav-height) + 26px);
  }
}
</style>
