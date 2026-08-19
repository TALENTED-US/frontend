<script setup>
import AppFooter from '@/components/navigation/AppFooter.vue'
import SkipLink from '@/components/ui/SkipLink.vue'
</script>

<template>
  <SkipLink />
  <main id="main-content" class="auth-shell" tabindex="-1">
    <RouterView />
  </main>
  <AppFooter class="desktop-only" />
</template>

<style scoped>
.auth-shell {
  min-height: 100dvh;
  background: var(--background);
}
</style>
