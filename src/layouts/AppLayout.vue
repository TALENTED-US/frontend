<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/navigation/AppHeader.vue'
import BottomNavigation from '@/components/navigation/BottomNavigation.vue'
import DesktopSidebar from '@/components/navigation/DesktopSidebar.vue'
import SkipLink from '@/components/ui/SkipLink.vue'

const route = useRoute()
const body = ref(null)
const mainContent = ref(null)
const isSimulationContinue = computed(() => route.name === 'simulationContinue')

watch(
  () => route.fullPath,
  async () => {
    await nextTick()
    body.value?.scrollTo({ top: 0, behavior: 'instant' })
    mainContent.value?.focus({ preventScroll: true })
  },
)
</script>

<template>
  <div class="app-shell">
    <SkipLink />
    <DesktopSidebar class="desktop-only" />
    <div
      ref="body"
      class="app-shell__body"
      :class="{ 'app-shell__body--continue': isSimulationContinue }"
    >
      <AppHeader :class="{ 'app-shell__header--continue': isSimulationContinue }" />
      <main
        id="main-content"
        ref="mainContent"
        class="app-shell__content"
        :class="{ 'app-shell__content--continue': isSimulationContinue }"
        tabindex="-1"
      >
        <RouterView />
      </main>
    </div>
    <BottomNavigation class="mobile-only" />
  </div>
</template>

<style scoped>
.app-shell {
  width: 100%;
  min-height: 100dvh;
  background: var(--background);
}

.app-shell__body {
  position: relative;
  min-height: 100dvh;
  margin-left: var(--sidebar-width);
}

.app-shell__body--continue,
.app-shell__content--continue {
  background: #fff;
}

.app-shell__content {
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: 79px clamp(32px, 5vw, 64px) 96px;
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

@media (min-width: 768px) {
  .app-shell__header--continue {
    display: none;
  }

  .app-shell__content--continue {
    min-height: 100dvh;
    padding: 0;
  }
}
</style>
