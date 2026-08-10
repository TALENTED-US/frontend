<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <section class="admin-placeholder">
    <h1>{{ route.meta.title }}</h1>
    <p>구현 예정인 화면입니다.</p>
  </section>
</template>

<style scoped>
.admin-placeholder {
  display: grid;
  place-items: center;
  min-height: 360px;
  padding: 48px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
  color: var(--muted);
  text-align: center;
}

.admin-placeholder h1 {
  margin-bottom: 8px;
  color: var(--text);
  font-size: var(--font-section-title);
}
</style>
