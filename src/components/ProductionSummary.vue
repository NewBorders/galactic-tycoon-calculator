<template>
  <div class="bg-gray-800 rounded-lg p-6">
    <h2 class="text-xl font-semibold mb-4 text-green-400">Daily Production</h2>
    <div class="space-y-2">
      <div
        v-for="[material, amount] in Object.entries(totalOutputs)"
        :key="material"
        class="flex justify-between"
      >
        <span class="text-gray-300">{{ materials[material]?.name || material }}</span>
        <span class="font-mono text-green-300">{{ formatNumber(amount) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatNumber } from '../utils/formatNumber'
import type { Material } from '../types'

interface Props {
  totalOutputs: Record<string, number>
  materials: Record<string, Material>
}

defineProps<Props>()
</script>
