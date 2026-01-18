<script setup lang="ts">
import { computed } from 'vue'
import { resolveIconId, spriteIndexReady } from '@/v2/constants/spriteIndex'

const props = defineProps<{
  name: string
  size?: number
  variant?: 'xs' | 'sm' | 'md' | 'lg'
  class?: string
}>()

const iconSize = props.size ?? undefined
const variantClass = props.variant ? `icon-${props.variant}` : 'icon-md'
const symbolId = computed(() => {
  // Depend on spriteIndexReady so we recompute after index load
  void spriteIndexReady.value
  return resolveIconId(props.name)
})
const href = computed(() => `#${symbolId.value}`)
</script>

<template>
  <svg
    :width="iconSize"
    :height="iconSize"
    :class="['inline-block align-middle', variantClass, props.class]"
    aria-hidden="true"
    focusable="false"
  >
    <use :href="href"></use>
  </svg>
</template>
