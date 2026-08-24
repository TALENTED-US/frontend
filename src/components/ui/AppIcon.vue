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
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v11h14V10" />
      <path d="M9 21v-7h6v7" />
    </template>
    <template v-else-if="name === 'wallet'">
      <path d="M4 5h15a2 2 0 0 1 2 2v12H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M2 9h19" />
      <path d="M16 14h2" />
    </template>
    <template v-else-if="name === 'trend'">
      <path d="m3 17 6-6 4 4 8-9" />
      <path d="M15 6h6v6" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </template>
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </template>
    <template v-else-if="name === 'bell'">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </template>
    <template v-else-if="name === 'calendar'">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </template>
    <template v-else-if="name === 'briefcase'">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </template>
    <template v-else-if="name === 'shield'">
      <path d="M12 3 20 6v5c0 5.2-3.1 8.3-8 10-4.9-1.7-8-4.8-8-10V6l8-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </template>
    <template v-else-if="name === 'map-pin'">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </template>
    <template v-else-if="name === 'users'">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 14a5 5 0 0 1 6 5" />
    </template>
    <template v-else-if="name === 'house'">
      <path d="m3 11 9-8 9 8v10H3Z" />
      <path d="M9 21v-7h6v7" />
    </template>
    <template v-else-if="name === 'lock'">
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </template>
    <template v-else-if="name === 'chevron'">
      <path d="m9 18 6-6-6-6" />
    </template>
    <template v-else-if="name === 'chevron-left'">
      <path d="m15 18-6-6 6-6" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="m6 6 12 12M18 6 6 18" />
    </template>
    <template v-else-if="name === 'logout'">
      <path d="M10 5H4v14h6M14 8l4 4-4 4M8 12h10" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M3 6h18M8 6V3h8v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
    </template>
    <template v-else-if="name === 'edit'">
      <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </template>
    <template v-else-if="name === 'arrow-down'">
      <path d="M12 4v16" />
      <path d="m6 14 6 6 6-6" />
    </template>
    <template v-else-if="name === 'arrow-right'">
      <path d="M4 12h16" />
      <path d="m14 6 6 6-6 6" />
    </template>
    <template v-else-if="name === 'landmark'">
      <path d="m3 9 9-5 9 5" />
      <path d="M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M3 20h18" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="m5 12 4 4L19 6" />
    </template>
    <template v-else-if="name === 'check-circle'">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </template>
    <template v-else-if="name === 'eye'">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </template>
  </svg>
</template>

<style scoped>
.app-icon {
  display: block;
  flex: none;
}
</style>
