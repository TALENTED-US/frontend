<script setup>
import buttieLogo from '@/assets/images/brand/buttie-logo.png'

defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <RouterLink class="brand-logo" to="/">
    <img class="brand-logo__image" :src="buttieLogo" alt="" />
    <span v-if="!compact" class="brand-logo__name">버티</span>
  </RouterLink>
</template>

<style scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.brand-logo__image {
  width: 35px;
  height: 35px;
  flex: none;
  object-fit: contain;
}

.brand-logo__name {
  font-size: 17px;
  font-weight: 900;
}
</style>
