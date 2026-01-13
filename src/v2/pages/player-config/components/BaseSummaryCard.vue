<script setup lang="ts">
import { computed } from 'vue'
import { formatPrice, formatNumber } from '@/v2/utils/formatNumber'
import type { GameData, GdIndex } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import { computeBaseReport } from '@/v2/services/production/engine'
import { translate } from '@/v2/localisation'
import type { MarketOpportunity } from '@/v2/services/marketAnalysis/types'
import {
  calculateExportMaterials,
  calculateExportMetrics,
  calculateNetProfitPriceTrend,
} from '@/v2/services/production/baseSummaryMetrics'

const props = defineProps<{
  base: PlayerBase
  gameData: GameData
  index: GdIndex
  priceResolver: (materialId: number) => number
  technologyLevels: Partial<Record<number, number>>
  startingBonus: number
  currentTechnologyLevels: Partial<Record<number, number>>
  currentStartingBonus: number
  timeframeHours: number
  globalWorkforceBurden: number
  marketOpportunities?: MarketOpportunity[]
}>()

const technologyLevelMap = computed(() => {
  const map = new Map<number, number>()
  Object.entries(props.technologyLevels ?? {}).forEach(([key, value]) => {
    const spec = Number(key)
    const level = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(spec) || Number.isNaN(level)) return
    map.set(spec, Math.max(0, Math.floor(level)))
  })
  return map
})

const technologyLevelsOption = computed(() => {
  const obj: Record<number, number> = {}
  technologyLevelMap.value.forEach((level, spec) => {
    obj[spec] = level
  })
  return obj
})

const currentTechnologyLevelMap = computed(() => {
  const map = new Map<number, number>()
  Object.entries(props.currentTechnologyLevels ?? {}).forEach(([key, value]) => {
    const spec = Number(key)
    const level = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(spec) || Number.isNaN(level)) return
    map.set(spec, Math.max(0, Math.floor(level)))
  })
  return map
})

const currentTechnologyLevelsOption = computed(() => {
  const obj: Record<number, number> = {}
  currentTechnologyLevelMap.value.forEach((level, spec) => {
    obj[spec] = level
  })
  return obj
})

const currentAssignment = computed(() => ({
  planetId: props.base.planetId,
  buildings: (props.base.currentBuildings ?? []).map((b) => ({
    buildingId: b.buildingId,
    level: b.level,
  })),
  recipes: props.base.recipes
    .filter((r) => r.currentCount !== undefined)
    .map((r) => ({
      recipeId: r.recipeId,
      count: typeof r.currentCount === 'number' && Number.isFinite(r.currentCount) ? Math.max(0, Math.floor(r.currentCount)) : 0,
    })),
}))

const plannedAssignment = computed(() => ({
  planetId: props.base.planetId,
  buildings: props.base.buildings.map((b) => ({
    buildingId: b.buildingId,
    level: b.level,
  })),
  recipes: props.base.recipes.map((r) => ({
    recipeId: r.recipeId,
    count: typeof r.count === 'number' && Number.isFinite(r.count) ? Math.max(1, Math.floor(r.count)) : 1,
  })),
}))

const activeOptionalConsumables = computed(() => {
  return new Set((props.base.optionalConsumables ?? []).filter((id): id is number => typeof id === 'number'))
})

// Current production report (using current technology levels from API)
const currentReport = computed(() =>
  computeBaseReport(props.gameData, {
    assignment: currentAssignment.value,
    horizonDays: 1,
    options: {
      activeOptionalConsumables: activeOptionalConsumables.value,
      priceResolver: props.priceResolver,
      technologyLevels: currentTechnologyLevelsOption.value,
      startingBonus: props.currentStartingBonus,
      globalWorkforceBurden: props.globalWorkforceBurden,
    },
  }),
)

// Planned production report (using planned technology levels)
const plannedReport = computed(() =>
  computeBaseReport(props.gameData, {
    assignment: plannedAssignment.value,
    horizonDays: 1,
    options: {
      activeOptionalConsumables: activeOptionalConsumables.value,
      priceResolver: props.priceResolver,
      technologyLevels: technologyLevelsOption.value,
      startingBonus: props.startingBonus,
      globalWorkforceBurden: props.globalWorkforceBurden,
    },
  }),
)

const currentSummary = computed(() => currentReport.value.summary)
const plannedSummary = computed(() => plannedReport.value.summary)

const periodFactor = computed(() => {
  const hours = Number(props.timeframeHours)
  if (!Number.isFinite(hours)) return 1
  const clamped = Math.min(336, Math.max(1, Math.round(hours)))
  return clamped / 24
})

const currentSummaryForPeriod = computed(() => ({
  productionRevenue: currentSummary.value.productionRevenue * periodFactor.value,
  materialPurchaseCosts: currentSummary.value.materialPurchaseCosts * periodFactor.value,
  workerPurchaseCosts: currentSummary.value.workerPurchaseCosts * periodFactor.value,
  net: currentSummary.value.net * periodFactor.value,
}))

const plannedSummaryForPeriod = computed(() => ({
  productionRevenue: plannedSummary.value.productionRevenue * periodFactor.value,
  materialPurchaseCosts: plannedSummary.value.materialPurchaseCosts * periodFactor.value,
  workerPurchaseCosts: plannedSummary.value.workerPurchaseCosts * periodFactor.value,
  net: plannedSummary.value.net * periodFactor.value,
}))

// Calculate export materials and metrics
const currentExportMetrics = computed(() => {
  const exportIds = calculateExportMaterials(currentReport.value)
  return calculateExportMetrics(currentReport.value, exportIds, periodFactor.value)
})

const plannedExportMetrics = computed(() => {
  const exportIds = calculateExportMaterials(plannedReport.value)
  return calculateExportMetrics(plannedReport.value, exportIds, periodFactor.value)
})

// Calculate price trend for net profit (using planned report)
const netProfitPriceTrend7d = computed(() =>
  calculateNetProfitPriceTrend(plannedReport.value, props.marketOpportunities),
)

const priceTrendColor = (trend: number) => {
  if (!Number.isFinite(trend)) return 'text-slate-400'
  if (trend > 5) return 'text-emerald-400'
  if (trend > 0) return 'text-green-300'
  if (trend < -5) return 'text-red-400'
  if (trend < 0) return 'text-orange-300'
  return 'text-slate-400'
}

const priceTrendIcon = (trend: number) => {
  if (!Number.isFinite(trend)) return ''
  if (trend > 5) return '📈'
  if (trend > 0) return '↗'
  if (trend < -5) return '📉'
  if (trend < 0) return '↘'
  return '→'
}

const showNetProfitTrend = computed(() => {
  return props.marketOpportunities && props.marketOpportunities.length > 0
})

</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 p-3">
    <!-- Net Profit -->
    <div class="bg-slate-700/50 rounded p-2">
      <div class="text-xs text-slate-400 mb-1">{{ translate('netProfit') }}</div>
      <div class="space-y-0.5">
        <div class="flex items-baseline justify-between">
          <span class="text-xs text-slate-500">Current:</span>
          <span class="text-sm font-semibold" :class="currentSummaryForPeriod.net >= 0 ? 'text-emerald-300' : 'text-rose-300'">
            {{ formatPrice(currentSummaryForPeriod.net, 0) }}
          </span>
        </div>
        <div class="flex items-baseline justify-between">
          <span class="text-xs text-slate-500">Planned:</span>
          <span class="text-sm font-semibold" :class="plannedSummaryForPeriod.net >= 0 ? 'text-emerald-300' : 'text-rose-300'">
            {{ formatPrice(plannedSummaryForPeriod.net, 0) }}
          </span>
        </div>
      </div>
      <div v-if="showNetProfitTrend" class="text-xs mt-1" :class="priceTrendColor(netProfitPriceTrend7d)">
        {{ priceTrendIcon(netProfitPriceTrend7d) }} {{ formatNumber(Math.abs(netProfitPriceTrend7d), 1) }}%
      </div>
    </div>

    <!-- Export Net Profit -->
    <div class="bg-slate-700/50 rounded p-2">
      <div class="text-xs text-slate-400 mb-1">{{ translate('exportNetProfit') }}</div>
      <div class="space-y-0.5">
        <div class="flex items-baseline justify-between">
          <span class="text-xs text-slate-500">Current:</span>
          <span class="text-sm font-semibold" :class="currentExportMetrics.exportNetProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'">
            {{ formatPrice(currentExportMetrics.exportNetProfit, 0) }}
          </span>
        </div>
        <div class="flex items-baseline justify-between">
          <span class="text-xs text-slate-500">Planned:</span>
          <span class="text-sm font-semibold" :class="plannedExportMetrics.exportNetProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'">
            {{ formatPrice(plannedExportMetrics.exportNetProfit, 0) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Worker Consumables -->
    <div class="bg-slate-700/50 rounded p-2">
      <div class="text-xs text-slate-400 mb-1">{{ translate('workerPurchaseCosts') }}</div>
      <div class="space-y-0.5">
        <div class="flex items-baseline justify-between">
          <span class="text-xs text-slate-500">Current:</span>
          <span class="text-sm font-semibold text-rose-300">
            {{ formatPrice(currentSummaryForPeriod.workerPurchaseCosts, 0) }}
          </span>
        </div>
        <div class="flex items-baseline justify-between">
          <span class="text-xs text-slate-500">Planned:</span>
          <span class="text-sm font-semibold text-rose-300">
            {{ formatPrice(plannedSummaryForPeriod.workerPurchaseCosts, 0) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Material Purchases -->
    <div class="bg-slate-700/50 rounded p-2">
      <div class="text-xs text-slate-400 mb-1">{{ translate('materialPurchaseCosts') }}</div>
      <div class="space-y-0.5">
        <div class="flex items-baseline justify-between">
          <span class="text-xs text-slate-500">Current:</span>
          <span class="text-sm font-semibold text-rose-300">
            {{ formatPrice(currentSummaryForPeriod.materialPurchaseCosts, 0) }}
          </span>
        </div>
        <div class="flex items-baseline justify-between">
          <span class="text-xs text-slate-500">Planned:</span>
          <span class="text-sm font-semibold text-rose-300">
            {{ formatPrice(plannedSummaryForPeriod.materialPurchaseCosts, 0) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Production Revenue -->
    <div class="bg-slate-700/50 rounded p-2">
      <div class="text-xs text-slate-400 mb-1">{{ translate('productionRevenue') }}</div>
      <div class="space-y-0.5">
        <div class="flex items-baseline justify-between">
          <span class="text-xs text-slate-500">Current:</span>
          <span class="text-sm font-semibold text-emerald-300">
            {{ formatPrice(currentSummaryForPeriod.productionRevenue, 0) }}
          </span>
        </div>
        <div class="flex items-baseline justify-between">
          <span class="text-xs text-slate-500">Planned:</span>
          <span class="text-sm font-semibold text-emerald-300">
            {{ formatPrice(plannedSummaryForPeriod.productionRevenue, 0) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
