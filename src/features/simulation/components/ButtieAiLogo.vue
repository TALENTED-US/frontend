<script setup>
import logoSource from '@/assets/images/simulation/buttie-ai-logo-source.png'
</script>

<template>
  <span class="buttie-ai-logo" aria-hidden="true">
    <span class="buttie-ai-logo__crop">
      <img :src="logoSource" alt="" />
    </span>
  </span>
</template>

<style scoped>
.buttie-ai-logo {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: 14%;
  background: #fff;
  box-shadow: 2px 2px 4px rgb(0 0 0 / 20%);
}

.buttie-ai-logo__crop {
  position: absolute;
  top: 49.5%;
  left: 9.58%;
  width: 84.43%;
  height: 54.89%;
  overflow: hidden;
  pointer-events: none;
}

.buttie-ai-logo__crop img {
  position: absolute;
  top: -91.58%;
  left: -24.62%;
  display: block;
  width: 144.46%;
  max-width: none;
  height: 221.86%;
}
</style>
