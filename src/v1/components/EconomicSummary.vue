<template>
  <div v-if="hasPrices" class="bg-gray-800 rounded-lg p-6 mb-6">
    <h2 class="text-xl font-semibold mb-4">Daily Economic Summary</h2>
    <div class="grid md:grid-cols-3 gap-4">
      <div class="bg-gray-700 rounded p-4">
        <div class="text-sm text-gray-400 mb-1">Total Costs</div>
        <div class="text-2xl font-bold text-red-400">{{ formatNumber(totalCosts) }}</div>
      </div>
      <div class="bg-gray-700 rounded p-4">
        <div class="text-sm text-gray-400 mb-1">Total Revenue</div>
        <div class="text-2xl font-bold text-green-400">{{ formatNumber(totalRevenue) }}</div>
      </div>
      <div class="bg-gray-700 rounded p-4">
        <div class="text-sm text-gray-400 mb-1">Net Profit</div>
        <div
          :class="`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`"
        >
          {{ totalProfit >= 0 ? '+' : '' }}{{ formatNumber(totalProfit) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatNumber } from '../utils/formatNumber'

interface Props {
  totalCosts: number
  totalRevenue: number
  totalProfit: number
  hasPrices: boolean
}

defineProps<Props>()
</script>
