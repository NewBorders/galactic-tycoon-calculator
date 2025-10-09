<template>
  <div class="bg-gray-800 rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold text-blue-400">Materials Balance</h2>
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-400">Plan for:</label>
        <input
          type="number"
          :min="GAME_LIMITS.MIN_PLAN_DAYS"
          :max="GAME_LIMITS.MAX_PLAN_DAYS"
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
              {{ getMaterialDays(material, amount) }}
            </td>
            <td class="py-2 px-2 text-right font-mono text-orange-300">
              {{ getMaterialToBuy(material, amount) }}
            </td>
            <td
              :class="`py-2 px-2 text-right font-mono ${amount * (prices[material] || 0) >= 0 ? 'text-green-300' : 'text-red-300'}`"
            >
              {{ getMaterialProfit(material, amount) }}
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
import { computed } from 'vue'
import { formatNumber, formatInteger } from '../utils/formatNumber'
import { formatDays } from '../utils/formatDays'
import { GAME_LIMITS } from '../config/constants'
import { usePlanDays, useStockDays, usePurchaseCalculations, useEconomicCalculations } from '../composables'
import type { Material } from '../types'

interface Props {
  netBalance: Record<string, number>
  materials: Record<string, Material>
  stock: Record<string, number>
  prices: Record<string, number>
}

const props = defineProps<Props>()

const { planDays } = usePlanDays()

const sortedNetBalance = computed(() => {
  return Object.entries(props.netBalance).sort(([keyA], [keyB]) => {
    const nameA = props.materials[keyA]?.name || keyA
    const nameB = props.materials[keyB]?.name || keyB
    return nameA.localeCompare(nameB)
  })
})

const getMaterialDays = (material: string, amount: number): string => {
  const { daysRemaining } = useStockDays(
    computed(() => props.stock[material] || 0),
    computed(() => amount)
  )
  return formatDays(daysRemaining.value)
}

const getMaterialToBuy = (material: string, amount: number): string => {
  const { needToBuy } = usePurchaseCalculations(
    computed(() => amount),
    computed(() => props.stock[material] || 0),
    planDays,
    computed(() => props.prices[material] || 0)
  )
  
  if (needToBuy.value <= 0) {
    return '-'
  }
  
  return formatInteger(Math.ceil(needToBuy.value))
}

const getMaterialProfit = (material: string, amount: number): string => {
  const { dailyProfit } = useEconomicCalculations(
    computed(() => amount),
    computed(() => props.prices[material] || 0)
  )
  
  if (dailyProfit.value === 0) {
    return '-'
  }
  
  return `${dailyProfit.value >= 0 ? '+' : ''}${formatNumber(dailyProfit.value)}`
}

const totalPurchaseCost = computed(() => {
  let total = 0
  
  Object.entries(props.netBalance).forEach(([material, amount]) => {
    // Only calculate for materials with negative balance (consuming)
    if (amount < 0) {
      const { purchaseCost } = usePurchaseCalculations(
        computed(() => amount),
        computed(() => props.stock[material] || 0),
        planDays,
        computed(() => props.prices[material] || 0)
      )
      total += purchaseCost.value
    }
  })
  
  return total
})
</script>
