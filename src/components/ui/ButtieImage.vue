<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  fallback: { type: String, required: true },
  alt: { type: String, default: '' },
})

const displayedSource = ref(props.fallback)
let imageRequestId = 0

watch(
  () => [props.src, props.fallback],
  ([source, fallback]) => {
    const requestId = ++imageRequestId
    displayedSource.value = fallback
    if (!source || source === fallback) return

    const image = new Image()
    image.onload = () => {
      if (requestId === imageRequestId) displayedSource.value = source
    }
    image.onerror = () => {
      if (requestId === imageRequestId) displayedSource.value = fallback
    }
    image.src = source
  },
  { immediate: true },
)
</script>

<template>
  <img :src="displayedSource" :alt="alt" />
</template>
