<script setup>
import buttieLogo from '@/assets/images/dashboard/main-logo2.png'

defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <RouterLink class="brand-logo" :to="{ name: 'dashboard' }">
    <img
      class="brand-logo__image"
      :class="{ 'brand-logo__image--compact': compact }"
      :src="buttieLogo"
      alt=""
    />
    <!-- <span v-if="!compact" class="brand-logo__name">버티</span> -->
  </RouterLink>
</template>

<style scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.brand-logo__image {
  width: 132px;
  height: 44px;
  flex: none;
  object-fit: contain;
}

.brand-logo__image--compact {
  width: 132px;
  height: 44px;
}

@media (max-width: 767px) {
  .brand-logo__image,
  .brand-logo__image--compact {
    width: 92px;
    height: 34px;
  }
}

.brand-logo__name {
  color: #171717;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.05em;
}
</style>
