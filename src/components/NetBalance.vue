<template>
  <div class="bg-gray-800 rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold text-blue-400">Materials Balance</h2>
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-400">Plan for:</label>
        <input
          type="number"
          min="1"
          max="365"
          v-model.number="planDays"
          class="w-20 bg-gray-700 rounded px-2 py-1 text-white text-right"
        />
        <span class="text-sm text-gray-400">days</span>
      </div>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-700">
            <th class="text-left py-2 px-2 text-gray-400">Material</th>
            <th class="text-right py-2 px-2 text-gray-400">Balance/day</th>
            <th class="text-right py-2 px-2 text-gray-400">Stock</th>
            <th class="text-right py-2 px-2 text-gray-400">Days</th>
            <th class="text-right py-2 px-2 text-gray-400">To Buy</th>
            <th class="text-right py-2 px-2 text-gray-400">Profit/day</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="[material, amount] in sortedNetBalance"
            :key="material"
            class="border-b border-gray-700/50"
          >
            <td class="py-2 px-2 text-gray-300">
              {{ materials[material]?.name || material }}
            </td>
            <td
              :class="`py-2 px-2 text-right font-mono ${amount >= 0 ? 'text-green-300' : 'text-red-300'}`"
            >
              {{ amount >= 0 ? '+' : '' }}{{ formatNumber(amount) }}
            </td>
            <td class="py-2 px-2 text-right font-mono text-gray-300">
              {{ (stock[material] || 0) > 0 ? formatInteger(stock[material] || 0) : '-' }}
            </td>
            <td class="py-2 px-2 text-right font-mono text-yellow-300">
              {{ getDaysRemaining(material, amount) }}
            </td>
            <td class="py-2 px-2 text-right font-mono text-orange-300">
              {{ getToBuy(material, amount) }}
            </td>
            <td
              :class="`py-2 px-2 text-right font-mono ${amount * (prices[material] || 0) >= 0 ? 'text-green-300' : 'text-red-300'}`"
            >
              {{ getDailyProfit(material, amount) }}
            </td>
          </tr>
          <tr class="border-t-2 border-gray-600">
            <td class="py-2 px-2 text-gray-300 font-semibold" colspan="4">
              Total Purchase Cost
            </td>
            <td class="py-2 px-2 text-right font-mono text-orange-400 font-semibold">
              {{ formatNumber(totalPurchaseCost) }}
            </td>
            <td class="py-2 px-2 text-right font-mono text-green-400 font-semibold">
              -
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatNumber, formatInteger } from '../utils/formatNumber'
import { formatDays } from '../utils/formatDays'
import type { Material } from '../types'

interface Props {
  netBalance: Record<string, number>
  materials: Record<string, Material>
  stock: Record<string, number>
  prices: Record<string, number>
}

const props = defineProps<Props>()

const planDays = ref(7)

const sortedNetBalance = computed(() => {
  return Object.entries(props.netBalance).sort(([keyA], [keyB]) => {
    const nameA = props.materials[keyA]?.name || keyA
    const nameB = props.materials[keyB]?.name || keyB
    return nameA.localeCompare(nameB)
  })
})

const getDaysRemaining = (material: string, amount: number): string => {
  const currentStock = props.stock[material] || 0
  if (amount < 0 && currentStock > 0) {
    const days = currentStock / Math.abs(amount)
    return formatDays(days)
  } else if (amount > 0) {
    return '∞'
  }
  return '-'
}

const getToBuy = (material: string, amount: number): string => {
  const currentStock = props.stock[material] || 0
  
  // If balance is positive (producing), no need to buy
  if (amount >= 0) {
    return '-'
  }
  
  // Calculate total consumption for the plan period
  const totalConsumption = Math.abs(amount) * planDays.value
  
  // Calculate how much we need to buy (consumption - current stock)
  const needToBuy = totalConsumption - currentStock
  
  // If we have enough stock, no need to buy
  if (needToBuy <= 0) {
    return '-'
  }
  
  return formatInteger(Math.ceil(needToBuy))
}

const getDailyProfit = (material: string, amount: number): string => {
  const price = props.prices[material] || 0
  if (price > 0) {
    const dailyProfit = amount * price
    return `${dailyProfit >= 0 ? '+' : ''}${formatNumber(dailyProfit)}`
  }
  return '-'
}

const totalPurchaseCost = computed(() => {
  let total = 0
  
  Object.entries(props.netBalance).forEach(([material, amount]) => {
    // Only calculate for materials with negative balance (consuming)
    if (amount < 0) {
      const currentStock = props.stock[material] || 0
      const totalConsumption = Math.abs(amount) * planDays.value
      const needToBuy = totalConsumption - currentStock
      
      if (needToBuy > 0) {
        const price = props.prices[material] || 0
        total += Math.ceil(needToBuy) * price
      }
    }
  })
  
  return total
})
</script>
