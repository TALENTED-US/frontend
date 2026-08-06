<script setup>
import { nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/navigation/AppHeader.vue'
import BottomNavigation from '@/components/navigation/BottomNavigation.vue'
import DesktopSidebar from '@/components/navigation/DesktopSidebar.vue'

const route = useRoute()
const body = ref(null)

watch(() => route.fullPath, async () => {
  await nextTick()
  body.value?.scrollTo({ top: 0, behavior: 'instant' })
})
</script>

<template>
  <div class="app-shell">
    <DesktopSidebar class="desktop-only" />
    <div ref="body" class="app-shell__body">
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
  .app-shell {
    height: 100dvh;
    min-height: 0;
    overflow: hidden;
  }

  .app-shell__body {
    height: calc(100dvh - var(--bottom-nav-height));
    min-height: 0;
    margin-left: 0;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    background: var(--background);
    -webkit-overflow-scrolling: touch;
  }

  .app-shell__content {
    padding: 10px 16px 26px;
  }
}
</style>
