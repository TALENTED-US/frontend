<script setup>
defineProps({
  size: { type: [Number, String], default: 52 },
  crown: Boolean,
})
</script>

<template>
  <span class="buttie-avatar" :style="{ '--avatar-size': `${size}px` }" aria-label="버티 캐릭터">
    <span v-if="crown" class="buttie-avatar__crown">♛</span>
    <i class="buttie-avatar__eye buttie-avatar__eye--left" />
    <i class="buttie-avatar__eye buttie-avatar__eye--right" />
    <i class="buttie-avatar__mouth" />
  </span>
</template>

<style scoped>
.buttie-avatar {
  position: relative;
  display: inline-block;
  width: var(--avatar-size);
  height: var(--avatar-size);
  flex: none;
  border: calc(var(--avatar-size) * 0.08) solid #fff7ce;
  border-radius: 30%;
  background: #e8bd56;
  box-shadow: inset 5px 5px 10px rgb(255 255 255 / 48%), 0 5px 12px rgb(117 80 17 / 16%);
}

.buttie-avatar__eye {
  position: absolute;
  top: 38%;
  width: 13%;
  height: 17%;
  border-radius: 50%;
  background: #262117;
  box-shadow: inset 1px 1px 0 #fff;
}

.buttie-avatar__eye--left { left: 27%; }
.buttie-avatar__eye--right { right: 27%; }

.buttie-avatar__mouth {
  position: absolute;
  right: 38%;
  bottom: 23%;
  left: 38%;
  height: 10%;
  border-bottom: 2px solid #3d301d;
  border-radius: 0 0 50% 50%;
}

.buttie-avatar__crown {
  position: absolute;
  z-index: 2;
  top: -12%;
  left: 22%;
  color: #c98512;
  font-size: calc(var(--avatar-size) * 0.28);
  filter: drop-shadow(0 1px 1px white);
}
</style>
