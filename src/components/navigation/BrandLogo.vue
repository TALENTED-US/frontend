<script setup>
import buttieLogo from '@/assets/images/brand/buttie-logo-blue.png'

defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <RouterLink class="brand-logo" :to="{ name: 'dashboard' }" aria-label="버티 홈">
    <img
      class="brand-logo__image"
      :class="{ 'brand-logo__image--compact': compact }"
      :src="buttieLogo"
      alt=""
    />
  </RouterLink>
</template>

<style scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
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
</style>
