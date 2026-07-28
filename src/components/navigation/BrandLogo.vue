<script setup>
import ButtieAvatar from '@/components/ui/ButtieAvatar.vue'

defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <RouterLink class="brand-logo" to="/">
    <ButtieAvatar :size="30" />
    <span v-if="!compact" class="brand-logo__name">버티</span>
  </RouterLink>
</template>

<style scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.brand-logo__name {
  font-size: 17px;
  font-weight: 900;
}
</style>
