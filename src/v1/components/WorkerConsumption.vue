<template>
  <div class="bg-gray-800 rounded-lg p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-yellow-400">Worker Consumption</h2>
        <div class="flex gap-4 mt-2 text-sm">
          <span class="text-blue-300" v-if="totalWorkersByTier[0] > 0">
            👷 Workers: {{ formatInteger(totalWorkersByTier[0]) }}
          </span>
          <span class="text-green-300" v-if="totalWorkersByTier[1] > 0">
            🔧 Technicians: {{ formatInteger(totalWorkersByTier[1]) }}
          </span>
          <span class="text-purple-300" v-if="totalWorkersByTier[2] > 0">
            ⚙️ Engineers: {{ formatInteger(totalWorkersByTier[2]) }}
          </span>
          <span class="text-orange-300" v-if="totalWorkersByTier[3] > 0">
            🔬 Scientists: {{ formatInteger(totalWorkersByTier[3]) }}
          </span>
        </div>
      </div>
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

    <!-- Worker Tier 1 -->
    <div v-if="totalWorkersByTier[0] > 0" class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <h3 class="text-lg font-semibold text-blue-300">👷 Workers (Tier 1)</h3>
        <span class="text-sm text-gray-400"
          >{{ formatInteger(totalWorkersByTier[0]) }} workers</span
        >
        <span class="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded">
          Productivity: {{ tier1Productivity }}%
        </span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-700">
              <th class="text-left py-2 px-2 text-gray-400 w-48">Resource</th>
              <th class="text-center py-2 px-2 text-gray-400 w-20">Active</th>
              <th class="text-right py-2 px-2 text-gray-400 w-32">Consumption/day</th>
              <th class="text-right py-2 px-2 text-gray-400 w-24">Stock</th>
              <th class="text-right py-2 px-2 text-gray-400 w-24">Days</th>
              <th class="text-right py-2 px-2 text-gray-400 w-24">To Buy</th>
              <th class="text-right py-2 px-2 text-gray-400 w-28">Cost/day</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="resource in tier1Essential"
              :key="resource"
              class="border-b border-gray-700/50"
            >
              <td class="py-2 px-2 text-gray-300">
                {{ getResourceDisplayName(resource) }}
                <span class="text-xs text-green-400 ml-1">Essential</span>
              </td>
              <td class="py-2 px-2 text-center"><span class="text-green-400">✓</span></td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ formatNumber(tier1Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-gray-300">
                {{ getStockDisplay(resource) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceDays(resource, tier1Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-orange-300">
                {{ getResourceToBuy(resource, tier1Consumption[resource] || 0, true) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceCost(resource, tier1Consumption[resource] || 0) }}
              </td>
            </tr>
            <tr
              v-for="resource in tier1Optional"
              :key="resource"
              class="border-b border-gray-700/50"
              :class="{ 'opacity-50': !optionalActive[resource] }"
            >
              <td class="py-2 px-2 text-gray-300">
                {{ getResourceDisplayName(resource) }}
                <span class="text-xs text-blue-400 ml-1">Optional +10%</span>
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
                {{ formatNumber(tier1Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-gray-300">
                {{ getStockDisplay(resource) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceDays(resource, tier1Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-orange-300">
                {{ getResourceToBuy(resource, tier1Consumption[resource] || 0, true) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceCost(resource, tier1Consumption[resource] || 0) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Worker Tier 2 -->
    <div v-if="totalWorkersByTier[1] > 0" class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <h3 class="text-lg font-semibold text-green-300">🔧 Technicians (Tier 2)</h3>
        <span class="text-sm text-gray-400"
          >{{ formatInteger(totalWorkersByTier[1]) }} workers</span
        >
        <span class="text-xs bg-green-900/30 text-green-300 px-2 py-1 rounded">
          Productivity: {{ tier2Productivity }}%
        </span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-700">
              <th class="text-left py-2 px-2 text-gray-400 w-48">Resource</th>
              <th class="text-center py-2 px-2 text-gray-400 w-20">Active</th>
              <th class="text-right py-2 px-2 text-gray-400 w-32">Consumption/day</th>
              <th class="text-right py-2 px-2 text-gray-400 w-24">Stock</th>
              <th class="text-right py-2 px-2 text-gray-400 w-24">Days</th>
              <th class="text-right py-2 px-2 text-gray-400 w-24">To Buy</th>
              <th class="text-right py-2 px-2 text-gray-400 w-28">Cost/day</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="resource in tier2Essential"
              :key="resource"
              class="border-b border-gray-700/50"
            >
              <td class="py-2 px-2 text-gray-300">
                {{ getResourceDisplayName(resource) }}
                <span class="text-xs text-green-400 ml-1">Essential</span>
              </td>
              <td class="py-2 px-2 text-center"><span class="text-green-400">✓</span></td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ formatNumber(tier2Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-gray-300">
                {{ getStockDisplay(resource) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceDays(resource, tier2Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-orange-300">
                {{ getResourceToBuy(resource, tier2Consumption[resource] || 0, true) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceCost(resource, tier2Consumption[resource] || 0) }}
              </td>
            </tr>
            <tr
              v-for="resource in tier2Optional"
              :key="resource"
              class="border-b border-gray-700/50"
              :class="{ 'opacity-50': !optionalActive[resource] }"
            >
              <td class="py-2 px-2 text-gray-300">
                {{ getResourceDisplayName(resource) }}
                <span class="text-xs text-blue-400 ml-1">Optional +10%</span>
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
                {{ formatNumber(tier2Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-gray-300">
                {{ getStockDisplay(resource) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceDays(resource, tier2Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-orange-300">
                {{ getResourceToBuy(resource, tier2Consumption[resource] || 0, true) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceCost(resource, tier2Consumption[resource] || 0) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Worker Tier 3 -->
    <div v-if="totalWorkersByTier[2] > 0" class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <h3 class="text-lg font-semibold text-purple-300">⚙️ Engineers (Tier 3)</h3>
        <span class="text-sm text-gray-400"
          >{{ formatInteger(totalWorkersByTier[2]) }} workers</span
        >
        <span class="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded">
          Productivity: {{ tier3Productivity }}%
        </span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-700">
              <th class="text-left py-2 px-2 text-gray-400 w-48">Resource</th>
              <th class="text-center py-2 px-2 text-gray-400 w-20">Active</th>
              <th class="text-right py-2 px-2 text-gray-400 w-32">Consumption/day</th>
              <th class="text-right py-2 px-2 text-gray-400 w-24">Stock</th>
              <th class="text-right py-2 px-2 text-gray-400 w-24">Days</th>
              <th class="text-right py-2 px-2 text-gray-400 w-24">To Buy</th>
              <th class="text-right py-2 px-2 text-gray-400 w-28">Cost/day</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="resource in tier3Essential"
              :key="resource"
              class="border-b border-gray-700/50"
            >
              <td class="py-2 px-2 text-gray-300">
                {{ getResourceDisplayName(resource) }}
                <span class="text-xs text-green-400 ml-1">Essential</span>
              </td>
              <td class="py-2 px-2 text-center"><span class="text-green-400">✓</span></td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ formatNumber(tier3Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-gray-300">
                {{ getStockDisplay(resource) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceDays(resource, tier3Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-orange-300">
                {{ getResourceToBuy(resource, tier3Consumption[resource] || 0, true) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceCost(resource, tier3Consumption[resource] || 0) }}
              </td>
            </tr>
            <tr
              v-for="resource in tier3Optional"
              :key="resource"
              class="border-b border-gray-700/50"
              :class="{ 'opacity-50': !optionalActive[resource] }"
            >
              <td class="py-2 px-2 text-gray-300">
                {{ getResourceDisplayName(resource) }}
                <span class="text-xs text-blue-400 ml-1">Optional +10%</span>
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
                {{ formatNumber(tier3Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-gray-300">
                {{ getStockDisplay(resource) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceDays(resource, tier3Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-orange-300">
                {{ getResourceToBuy(resource, tier3Consumption[resource] || 0, true) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceCost(resource, tier3Consumption[resource] || 0) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Worker Tier 4 -->
    <div v-if="totalWorkersByTier[3] > 0" class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <h3 class="text-lg font-semibold text-orange-300">🔬 Scientists (Tier 4)</h3>
        <span class="text-sm text-gray-400"
          >{{ formatInteger(totalWorkersByTier[3]) }} workers</span
        >
        <span class="text-xs bg-orange-900/30 text-orange-300 px-2 py-1 rounded">
          Productivity: {{ tier4Productivity }}%
        </span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-700">
              <th class="text-left py-2 px-2 text-gray-400 w-48">Resource</th>
              <th class="text-center py-2 px-2 text-gray-400 w-20">Active</th>
              <th class="text-right py-2 px-2 text-gray-400 w-32">Consumption/day</th>
              <th class="text-right py-2 px-2 text-gray-400 w-24">Stock</th>
              <th class="text-right py-2 px-2 text-gray-400 w-24">Days</th>
              <th class="text-right py-2 px-2 text-gray-400 w-24">To Buy</th>
              <th class="text-right py-2 px-2 text-gray-400 w-28">Cost/day</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="resource in tier4Essential"
              :key="resource"
              class="border-b border-gray-700/50"
            >
              <td class="py-2 px-2 text-gray-300">
                {{ getResourceDisplayName(resource) }}
                <span class="text-xs text-green-400 ml-1">Essential</span>
              </td>
              <td class="py-2 px-2 text-center"><span class="text-green-400">✓</span></td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ formatNumber(tier4Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-gray-300">
                {{ getStockDisplay(resource) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceDays(resource, tier4Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-orange-300">
                {{ getResourceToBuy(resource, tier4Consumption[resource] || 0, true) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceCost(resource, tier4Consumption[resource] || 0) }}
              </td>
            </tr>
            <tr
              v-for="resource in tier4Optional"
              :key="resource"
              class="border-b border-gray-700/50"
              :class="{ 'opacity-50': !optionalActive[resource] }"
            >
              <td class="py-2 px-2 text-gray-300">
                {{ getResourceDisplayName(resource) }}
                <span class="text-xs text-blue-400 ml-1">Optional +10%</span>
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
                {{ formatNumber(tier4Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-gray-300">
                {{ getStockDisplay(resource) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceDays(resource, tier4Consumption[resource] || 0) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-orange-300">
                {{ getResourceToBuy(resource, tier4Consumption[resource] || 0, true) }}
              </td>
              <td class="py-2 px-2 text-right font-mono text-yellow-300">
                {{ getResourceCost(resource, tier4Consumption[resource] || 0) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Totals -->
    <div class="bg-gray-900 rounded p-4 mt-4">
      <div class="grid grid-cols-3 gap-4">
        <div>
          <div class="text-sm text-gray-400">Total Purchase Cost</div>
          <div class="text-2xl font-bold text-orange-400">
            {{ formatNumber(totalPurchaseCost) }}
          </div>
        </div>
        <div>
          <div class="text-sm text-gray-400">Total Purchase Weight</div>
          <div class="text-2xl font-bold text-purple-400">{{ formatNumber(totalPurchaseWeight) }}</div>
        </div>
        <div>
          <div class="text-sm text-gray-400">Total Daily Cost</div>
          <div class="text-2xl font-bold text-yellow-400">{{ formatNumber(totalDailyCost) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber, formatInteger } from '../utils/formatNumber'
import { formatDays } from '../utils/formatDays'
import { WORKER_CONFIG, GAME_LIMITS } from '../config/constants'
import { WORKER_CONSUMPTION_BY_TIER } from '../data/workerConsumption'
import { MATERIALS } from '../data/materials'
import {
  useWorkerPlanDays,
  useStockDays,
  usePurchaseCalculations,
  useEconomicCalculations,
} from '../composables'

interface Props {
  workerConsumption: Record<string, number>
  totalWorkers: number
  totalWorkersByTier: [number, number, number, number]
  stock: Record<string, number>
  prices: Record<string, number>
  optionalActive: Record<string, boolean>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:optionalActive': [value: Record<string, boolean>]
}>()

const { planDays } = useWorkerPlanDays()

// Define consumables per tier
const tier1Essential = [...WORKER_CONFIG.TIER1_ESSENTIAL]
const tier1Optional = [...WORKER_CONFIG.TIER1_OPTIONAL]
const tier2Essential = [...WORKER_CONFIG.TIER2_ESSENTIAL]
const tier2Optional = [...WORKER_CONFIG.TIER2_OPTIONAL]
const tier3Essential = [...WORKER_CONFIG.TIER3_ESSENTIAL]
const tier3Optional = [...WORKER_CONFIG.TIER3_OPTIONAL]
const tier4Essential = [...WORKER_CONFIG.TIER4_ESSENTIAL]
const tier4Optional = [...WORKER_CONFIG.TIER4_OPTIONAL]

// Calculate productivity per tier
const tier1Productivity = computed(() => {
  const active = tier1Optional.filter((r) => props.optionalActive[r]).length
  return WORKER_CONFIG.BASE_PRODUCTIVITY + active * WORKER_CONFIG.PRODUCTIVITY_BONUS_PER_OPTIONAL
})

const tier2Productivity = computed(() => {
  const active = tier2Optional.filter((r) => props.optionalActive[r]).length
  return WORKER_CONFIG.BASE_PRODUCTIVITY + active * WORKER_CONFIG.PRODUCTIVITY_BONUS_PER_OPTIONAL
})

const tier3Productivity = computed(() => {
  const active = tier3Optional.filter((r) => props.optionalActive[r]).length
  return WORKER_CONFIG.BASE_PRODUCTIVITY + active * WORKER_CONFIG.PRODUCTIVITY_BONUS_PER_OPTIONAL
})

const tier4Productivity = computed(() => {
  const active = tier4Optional.filter((r) => props.optionalActive[r]).length
  return WORKER_CONFIG.BASE_PRODUCTIVITY + active * WORKER_CONFIG.PRODUCTIVITY_BONUS_PER_OPTIONAL
})

const getResourceDisplayName = (resource: string): string => {
  return resource.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const getStockDisplay = (resource: string): string => {
  if (!props.stock) return '-'
  const stockValue = props.stock[resource]
  return stockValue && stockValue > 0 ? formatInteger(stockValue) : '-'
}

const getResourceDays = (resource: string, amount: number): string => {
  if (amount === 0) return '-'

  const { daysRemaining } = useStockDays(
    computed(() => props.stock[resource] || 0),
    computed(() => -amount),
  )
  return formatDays(daysRemaining.value)
}

const getResourceToBuy = (resource: string, amount: number, isActive: boolean): string => {
  if (!isActive || amount === 0) return '-'

  const { needToBuy } = usePurchaseCalculations(
    computed(() => -amount),
    computed(() => props.stock[resource] || 0),
    planDays,
    computed(() => props.prices[resource] || 0),
  )

  if (needToBuy.value <= 0) return '-'

  return formatInteger(Math.ceil(needToBuy.value))
}

const getResourceCost = (resource: string, amount: number): string => {
  if (amount === 0) return '-'

  const { dailyCost } = useEconomicCalculations(
    computed(() => -amount),
    computed(() => props.prices[resource] || 0),
  )

  if (dailyCost.value === 0) return '-'

  return formatNumber(dailyCost.value)
}

const toggleOptional = (resource: string) => {
  emit('update:optionalActive', {
    ...props.optionalActive,
    [resource]: !props.optionalActive[resource],
  })
}

const allConsumables = computed(() => {
  // Use Set to remove duplicates (e.g., drinking_water and workwear appear in multiple tiers)
  return Array.from(
    new Set([
      ...tier1Essential,
      ...tier1Optional,
      ...tier2Essential,
      ...tier2Optional,
      ...tier3Essential,
      ...tier3Optional,
      ...tier4Essential,
      ...tier4Optional,
    ]),
  )
})

const totalPurchaseCost = computed(() => {
  let total = 0

  allConsumables.value.forEach((resource) => {
    const consumption = getTotalConsumptionForResource(resource)
    if (consumption > 0) {
      const { purchaseCost } = usePurchaseCalculations(
        computed(() => -consumption),
        computed(() => props.stock[resource] || 0),
        planDays,
        computed(() => props.prices[resource] || 0),
      )
      total += purchaseCost.value
    }
  })

  return total
})

const getTierConsumption = (resource: string, tier: number): number => {
  switch (tier) {
    case 1:
      return tier1Consumption.value[resource] || 0
    case 2:
      return tier2Consumption.value[resource] || 0
    case 3:
      return tier3Consumption.value[resource] || 0
    case 4:
      return tier4Consumption.value[resource] || 0
    default:
      return 0
  }
}

// Calculate consumption per tier
const tier1Consumption = computed(() => {
  const consumption: Record<string, number> = {}
  if (props.totalWorkersByTier[0] > 0) {
    const workerGroups = props.totalWorkersByTier[0] / 100
    const tierData = WORKER_CONSUMPTION_BY_TIER['worker']
    Object.entries(tierData).forEach(([resource, amount]) => {
      consumption[resource] = amount * workerGroups
    })
  }
  return consumption
})

const tier2Consumption = computed(() => {
  const consumption: Record<string, number> = {}
  if (props.totalWorkersByTier[1] > 0) {
    const workerGroups = props.totalWorkersByTier[1] / 100
    const tierData = WORKER_CONSUMPTION_BY_TIER['technician']
    Object.entries(tierData).forEach(([resource, amount]) => {
      consumption[resource] = amount * workerGroups
    })
  }
  return consumption
})

const tier3Consumption = computed(() => {
  const consumption: Record<string, number> = {}
  if (props.totalWorkersByTier[2] > 0) {
    const workerGroups = props.totalWorkersByTier[2] / 100
    const tierData = WORKER_CONSUMPTION_BY_TIER['engineer']
    Object.entries(tierData).forEach(([resource, amount]) => {
      consumption[resource] = amount * workerGroups
    })
  }
  return consumption
})

const tier4Consumption = computed(() => {
  const consumption: Record<string, number> = {}
  if (props.totalWorkersByTier[3] > 0) {
    const workerGroups = props.totalWorkersByTier[3] / 100
    const tierData = WORKER_CONSUMPTION_BY_TIER['scientist']
    Object.entries(tierData).forEach(([resource, amount]) => {
      consumption[resource] = amount * workerGroups
    })
  }
  return consumption
})

// Helper to get consumption for a resource from all active tiers
const getTotalConsumptionForResource = (resource: string): number => {
  let total = 0

  // Tier 1
  if (props.totalWorkersByTier[0] > 0) {
    const isTier1Essential = tier1Essential.includes(resource as any)
    const isTier1Optional = tier1Optional.includes(resource as any)
    const isActive = isTier1Essential || (isTier1Optional && props.optionalActive[resource])
    if (isActive) {
      total += tier1Consumption.value[resource] || 0
    }
  }

  // Tier 2
  if (props.totalWorkersByTier[1] > 0) {
    const isTier2Essential = tier2Essential.includes(resource as any)
    const isTier2Optional = tier2Optional.includes(resource as any)
    const isActive = isTier2Essential || (isTier2Optional && props.optionalActive[resource])
    if (isActive) {
      total += tier2Consumption.value[resource] || 0
    }
  }

  // Tier 3
  if (props.totalWorkersByTier[2] > 0) {
    const isTier3Essential = tier3Essential.includes(resource as any)
    const isTier3Optional = tier3Optional.includes(resource as any)
    const isActive = isTier3Essential || (isTier3Optional && props.optionalActive[resource])
    if (isActive) {
      total += tier3Consumption.value[resource] || 0
    }
  }

  // Tier 4
  if (props.totalWorkersByTier[3] > 0) {
    const isTier4Essential = tier4Essential.includes(resource as any)
    const isTier4Optional = tier4Optional.includes(resource as any)
    const isActive = isTier4Essential || (isTier4Optional && props.optionalActive[resource])
    if (isActive) {
      total += tier4Consumption.value[resource] || 0
    }
  }

  return total
}
const totalDailyCost = computed(() => {
  let total = 0

  // Sumar consumo de todos los recursos activos de cada tier
  allConsumables.value.forEach((resource) => {
    const consumption = getTotalConsumptionForResource(resource)
    if (consumption > 0) {
      const price = props.prices[resource] || 0
      total += consumption * price
    }
  })

  return total
})

const totalPurchaseWeight = computed(() => {
  let total = 0

  allConsumables.value.forEach((resource) => {
    const consumption = getTotalConsumptionForResource(resource)
    if (consumption > 0) {
      const { needToBuy } = usePurchaseCalculations(
        computed(() => -consumption),
        computed(() => props.stock[resource] || 0),
        planDays,
        computed(() => props.prices[resource] || 0),
      )
      
      const material = MATERIALS[resource]
      if (material && material.weight && needToBuy.value > 0) {
        total += needToBuy.value * material.weight
      }
    }
  })

  return total
})
</script>
