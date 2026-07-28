<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
})
</script>

<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'home'">
      <path d="m3 11 9-8 9 8" /><path d="M5 10v11h14V10" /><path d="M9 21v-7h6v7" />
    </template>
    <template v-else-if="name === 'wallet'">
      <path d="M4 5h15a2 2 0 0 1 2 2v12H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M2 9h19" /><path d="M16 14h2" />
    </template>
    <template v-else-if="name === 'trend'">
      <path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" />
    </template>
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="7.5" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" />
    </template>
    <template v-else-if="name === 'bell'">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" />
    </template>
    <template v-else-if="name === 'quest'">
      <path d="M6 3h11v15H6z" /><path d="M9 7h5M9 11h5M9 15h3" /><path d="M3 6v15h11" />
    </template>
    <template v-else-if="name === 'calendar'">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" />
    </template>
    <template v-else-if="name === 'chevron'">
      <path d="m9 18 6-6-6-6" />
    </template>
    <template v-else-if="name === 'logout'">
      <path d="M10 5H4v14h6M14 8l4 4-4 4M8 12h10" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M3 6h18M8 6V3h8v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
    </template>
    <template v-else-if="name === 'eye'">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="9" /><path d="M8 12h8" />
    </template>
  </svg>
</template>

<style scoped>
.app-icon {
  display: block;
  flex: none;
}
</style>
