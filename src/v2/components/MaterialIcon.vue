<script setup lang="ts">
const props = defineProps<{
  name: string
  size?: number
  variant?: 'sm' | 'md' | 'lg'
  class?: string
}>()

const iconSize = props.size ?? undefined
const variantClass = props.variant ? `icon-${props.variant}` : 'icon-md'
const href = `/galactic_tycoon_sprites.svg#${props.name}`
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
