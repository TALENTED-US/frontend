<script setup>
import SkipLink from '@/components/ui/SkipLink.vue'
</script>

<template>
  <SkipLink />
  <main id="main-content" class="auth-shell" tabindex="-1">
    <RouterView />
  </main>
</template>

<style scoped>
.auth-shell {
  min-height: 100dvh;
  background: var(--background);
}
</style>
