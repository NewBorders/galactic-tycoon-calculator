<template>
  <div class="bg-gray-800 rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold text-yellow-400">
        Worker Consumption ({{ formatInteger(totalWorkers) }} workers)
      </h2>
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
    <div class="mb-4 text-sm text-gray-400">
      Base productivity: 70% + {{ activeOptionalCount * 10 }}% = <span class="text-yellow-300 font-semibold">{{ calculatedProductivity }}%</span>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-700">
            <th class="text-left py-2 px-2 text-gray-400">Resource</th>
            <th class="text-center py-2 px-2 text-gray-400">Active</th>
            <th class="text-right py-2 px-2 text-gray-400">Consumption/day</th>
            <th class="text-right py-2 px-2 text-gray-400">Stock</th>
            <th class="text-right py-2 px-2 text-gray-400">Days</th>
            <th class="text-right py-2 px-2 text-gray-400">To Buy</th>
            <th class="text-right py-2 px-2 text-gray-400">Cost/day</th>
          </tr>
        </thead>
        <tbody>
          <!-- Essential consumables -->
          <tr
            v-for="resource in essentialConsumables"
            :key="resource"
            class="border-b border-gray-700/50"
          >
            <td class="py-2 px-2 text-gray-300 capitalize">
              {{ resource.replace(/_/g, ' ') }}
              <span class="text-xs text-green-400 ml-1">(Essential)</span>
            </td>
            <td class="py-2 px-2 text-center">
              <span class="text-green-400">✓</span>
            </td>
            <td class="py-2 px-2 text-right font-mono text-yellow-300">
              {{ formatNumber(workerConsumption[resource]) }}
            </td>
            <td class="py-2 px-2 text-right font-mono text-gray-300">
              {{ getStockDisplay(resource) }}
            </td>
            <td class="py-2 px-2 text-right font-mono text-yellow-300">
              {{ getDaysRemaining(resource, workerConsumption[resource]) }}
            </td>
            <td class="py-2 px-2 text-right font-mono text-orange-300">
              {{ getToBuy(resource, workerConsumption[resource], true) }}
            </td>
            <td class="py-2 px-2 text-right font-mono text-yellow-300">
              {{ getDailyCost(resource, workerConsumption[resource]) }}
            </td>
          </tr>
          
          <!-- Optional consumables -->
          <tr
            v-for="resource in optionalConsumables"
            :key="resource"
            class="border-b border-gray-700/50"
            :class="{ 'opacity-50': !optionalActive[resource] }"
          >
            <td class="py-2 px-2 text-gray-300 capitalize">
              {{ resource.replace(/_/g, ' ') }}
              <span class="text-xs text-blue-400 ml-1">(Optional +10%)</span>
            </td>
            <td class="py-2 px-2 text-center">
              <input
                type="checkbox"
                :checked="optionalActive[resource]"
                @change="toggleOptional(resource)"
                class="w-4 h-4 cursor-pointer"
              />
            </td>
            <td class="py-2 px-2 text-right font-mono text-yellow-300">
              {{ formatNumber(workerConsumption[resource]) }}
            </td>
            <td class="py-2 px-2 text-right font-mono text-gray-300">
              {{ getStockDisplay(resource) }}
            </td>
            <td class="py-2 px-2 text-right font-mono text-yellow-300">
              {{ getDaysRemaining(resource, workerConsumption[resource]) }}
            </td>
            <td class="py-2 px-2 text-right font-mono text-orange-300">
              {{ getToBuy(resource, workerConsumption[resource], optionalActive[resource]) }}
            </td>
            <td class="py-2 px-2 text-right font-mono text-yellow-300">
              {{ optionalActive[resource] ? getDailyCost(resource, workerConsumption[resource]) : '-' }}
            </td>
          </tr>

          <tr class="border-t-2 border-gray-600">
            <td class="py-2 px-2 text-gray-300 font-semibold" colspan="5">
              Total Purchase Cost
            </td>
            <td class="py-2 px-2 text-right font-mono text-orange-400 font-semibold">
              {{ formatNumber(totalPurchaseCost) }}
            </td>
            <td class="py-2 px-2 text-right font-mono text-yellow-400 font-semibold">
              -
            </td>
          </tr>

          <tr class="border-t-2 border-gray-600">
            <td class="py-2 px-2 text-gray-300 font-semibold" colspan="6">
              Total Daily Cost
            </td>
            <td class="py-2 px-2 text-right font-mono text-yellow-400 font-semibold">
              {{ formatNumber(totalCost) }}
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

interface Props {
  workerConsumption: Record<string, number>
  totalWorkers: number
  stock: Record<string, number>
  prices: Record<string, number>
  optionalActive: Record<string, boolean>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:optionalActive': [value: Record<string, boolean>]
  'update:calculatedProductivity': [value: number]
}>()

const planDays = ref(7)

// Define essential and optional consumables
const essentialConsumables = ['rations', 'drinking_water', 'tools']
const optionalConsumables = ['ale', 'pie', 'workwear']

const activeOptionalCount = computed(() => {
  return optionalConsumables.filter(resource => props.optionalActive[resource]).length
})

const calculatedProductivity = computed(() => {
  const productivity = 70 + (activeOptionalCount.value * 10)
  emit('update:calculatedProductivity', productivity)
  return productivity
})

const getStockDisplay = (resource: string): string => {
  if (!props.stock) return '-'
  const stockValue = props.stock[resource]
  return stockValue && stockValue > 0 ? formatInteger(stockValue) : '-'
}

const totalCost = computed(() => {
  if (!props.prices) return 0
  let total = 0
  
  // Always count essential consumables
  essentialConsumables.forEach(resource => {
    const amount = props.workerConsumption[resource] || 0
    const price = props.prices[resource] || 0
    total += amount * price
  })
  
  // Only count active optional consumables
  optionalConsumables.forEach(resource => {
    if (props.optionalActive[resource]) {
      const amount = props.workerConsumption[resource] || 0
      const price = props.prices[resource] || 0
      total += amount * price
    }
  })
  
  return total
})

const getDaysRemaining = (resource: string, amount: number): string => {
  if (!props.stock) return '-'
  const currentStock = props.stock[resource] || 0
  if (amount > 0 && currentStock > 0) {
    const days = currentStock / amount
    return formatDays(days)
  }
  return '-'
}

const getToBuy = (resource: string, amount: number, isActive: boolean): string => {
  // If not active (for optional consumables), don't need to buy
  if (!isActive) {
    return '-'
  }
  
  const currentStock = props.stock[resource] || 0
  
  // Calculate total consumption for the plan period
  const totalConsumption = amount * planDays.value
  
  // Calculate how much we need to buy (consumption - current stock)
  const needToBuy = totalConsumption - currentStock
  
  // If we have enough stock, no need to buy
  if (needToBuy <= 0) {
    return '-'
  }
  
  return formatInteger(Math.ceil(needToBuy))
}

const getDailyCost = (resource: string, amount: number): string => {
  if (!props.prices) return '-'
  const price = props.prices[resource] || 0
  if (price > 0) {
    const dailyCost = amount * price
    return formatNumber(dailyCost)
  }
  return '-'
}

const toggleOptional = (resource: string) => {
  emit('update:optionalActive', {
    ...props.optionalActive,
    [resource]: !props.optionalActive[resource]
  })
}

const totalPurchaseCost = computed(() => {
  let total = 0
  
  // Calculate for essential consumables
  essentialConsumables.forEach(resource => {
    const amount = props.workerConsumption[resource] || 0
    const currentStock = props.stock[resource] || 0
    const totalConsumption = amount * planDays.value
    const needToBuy = totalConsumption - currentStock
    
    if (needToBuy > 0) {
      const price = props.prices[resource] || 0
      total += Math.ceil(needToBuy) * price
    }
  })
  
  // Calculate for active optional consumables
  optionalConsumables.forEach(resource => {
    if (props.optionalActive[resource]) {
      const amount = props.workerConsumption[resource] || 0
      const currentStock = props.stock[resource] || 0
      const totalConsumption = amount * planDays.value
      const needToBuy = totalConsumption - currentStock
      
      if (needToBuy > 0) {
        const price = props.prices[resource] || 0
        total += Math.ceil(needToBuy) * price
      }
    }
  })
  
  return total
})
</script>
