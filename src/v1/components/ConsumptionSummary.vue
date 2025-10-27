<template>
  <div class="bg-gray-800 rounded-lg p-6">
    <h2 class="text-xl font-semibold mb-4 text-red-400">Daily Consumption</h2>
    <div class="space-y-2">
      <div
        v-for="[material, amount] in Object.entries(totalInputs)"
        :key="material"
        class="flex justify-between items-center"
      >
        <span class="text-gray-300">{{ materials[material]?.name || material }}</span>
        <div class="text-right">
          <span class="font-mono text-red-300">{{ formatNumber(amount) }}</span>
          <div v-if="timeToEmpty[material]" class="text-xs text-yellow-400">
            Stock: {{ formatInteger(stock[material] || 0) }} ({{ formatDays(timeToEmpty[material]) }})
          </div>
        </div>
      </div>
      <div v-if="Object.keys(totalInputs).length === 0" class="text-gray-500">
        No material consumption
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatNumber, formatInteger } from '../utils/formatNumber'
import { formatDays } from '../utils/formatDays'
import type { Material } from '../types'

interface Props {
  totalInputs: Record<string, number>
  materials: Record<string, Material>
  stock: Record<string, number>
  timeToEmpty: Record<string, number>
}

defineProps<Props>()
</script>
