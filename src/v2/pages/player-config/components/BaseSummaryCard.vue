<script setup lang="ts">
import { computed } from 'vue'
import { formatPrice, formatNumber } from '@/v2/utils/formatNumber'
import type { GameData, GdIndex } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import { computeBaseReport } from '@/v2/services/production/engine'
import { translate } from '@/v2/localisation'
import { getExportThresholdRatio } from '@/v2/services/config/exportThreshold'
import type { MarketOpportunity } from '@/v2/services/marketAnalysis/types'

const props = defineProps<{
  base: PlayerBase
  gameData: GameData
  index: GdIndex
  priceResolver: (materialId: number) => number
  technologyLevels: Partial<Record<number, number>>
  startingBonus: number
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

const assignment = computed(() => ({
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

const report = computed(() =>
  computeBaseReport(props.gameData, {
    assignment: assignment.value,
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

const summary = computed(() => report.value.summary)

const periodFactor = computed(() => {
  const hours = Number(props.timeframeHours)
  if (!Number.isFinite(hours)) return 1
  const clamped = Math.min(336, Math.max(1, Math.round(hours)))
  return clamped / 24
})

const summaryForPeriod = computed(() => ({
  productionRevenue: summary.value.productionRevenue * periodFactor.value,
  materialPurchaseCosts: summary.value.materialPurchaseCosts * periodFactor.value,
  workerPurchaseCosts: summary.value.workerPurchaseCosts * periodFactor.value,
  net: summary.value.net * periodFactor.value,
}))

// Calculate export materials using same logic as useGlobalSummary
const exportMaterialIds = computed(() => {
  const threshold = getExportThresholdRatio()
  const exportIds = new Set<number>()

  // Build production and consumption maps
  const productionMap = new Map<number, number>()
  const consumptionMap = new Map<number, number>()

  // Get production from recipe outputs
  report.value.recipes.forEach((recipe) => {
    const current = productionMap.get(recipe.outputMaterialId) || 0
    productionMap.set(recipe.outputMaterialId, current + recipe.outputPerDay)
  })

  // Get consumption from recipe inputs
  report.value.recipes.forEach((recipe) => {
    recipe.inputsPerDay.forEach((input) => {
      const current = consumptionMap.get(input.materialId) || 0
      consumptionMap.set(input.materialId, current + input.amount)
    })
  })

  // Add worker consumption
  report.value.workers.forEach((worker) => {
    const current = consumptionMap.get(worker.materialId) || 0
    consumptionMap.set(worker.materialId, current + worker.consumptionPerDay)
  })

  // Determine export materials
  productionMap.forEach((production, materialId) => {
    const consumption = consumptionMap.get(materialId) || 0
    if (production > 0) {
      const localConsumptionRatio = consumption / production
      // Material is exported if less than threshold is consumed locally
      if (localConsumptionRatio < (1 - threshold)) {
        exportIds.add(materialId)
      }
    }
  })

  return exportIds
})

// Calculate export revenue (only from export materials)
const exportRevenue = computed(() => {
  let revenue = 0
  report.value.materials.forEach((mat) => {
    if (exportMaterialIds.value.has(mat.materialId) && mat.balancePerDay > 0) {
      revenue += mat.valuePerDay
    }
  })
  return revenue * periodFactor.value
})

// Export net profit = export revenue - ALL costs
const exportNetProfit = computed(() => {
  const allCosts = summaryForPeriod.value.materialPurchaseCosts + summaryForPeriod.value.workerPurchaseCosts
  return exportRevenue.value - allCosts
})

// Calculate weighted average 7d price trend for export materials
const exportPriceTrend7d = computed(() => {
  if (!props.marketOpportunities || exportMaterialIds.value.size === 0) return 0

  const opportunityMap = new Map(props.marketOpportunities.map(o => [o.materialId, o]))
  let totalWeight = 0
  let weightedTrendSum = 0

  report.value.materials.forEach((mat) => {
    if (exportMaterialIds.value.has(mat.materialId) && mat.balancePerDay > 0) {
      const opportunity = opportunityMap.get(mat.materialId)
      if (opportunity) {
        const weight = mat.valuePerDay // weight by export value
        totalWeight += weight
        weightedTrendSum += opportunity.priceTrend.changePercent7d * weight
      }
    }
  })

  return totalWeight > 0 ? weightedTrendSum / totalWeight : 0
})

const netProfitPriceTrend7d = computed(() => {
  if (!props.marketOpportunities) return 0

  const opportunityMap = new Map(props.marketOpportunities.map(o => [o.materialId, o]))
  let totalWeight = 0
  let weightedTrendSum = 0

  // Weight by absolute value (both production and consumption matter)
  report.value.materials.forEach((mat) => {
    const opportunity = opportunityMap.get(mat.materialId)
    if (opportunity) {
      const weight = Math.abs(mat.valuePerDay)
      totalWeight += weight
      weightedTrendSum += opportunity.priceTrend.changePercent7d * weight
    }
  })

  return totalWeight > 0 ? weightedTrendSum / totalWeight : 0
})

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
  const hasData = props.marketOpportunities && props.marketOpportunities.length > 0
  console.log('[BaseSummaryCard] showNetProfitTrend:', hasData, 'marketOpportunities:', props.marketOpportunities?.length, 'trend:', netProfitPriceTrend7d.value)
  return hasData
})

const showExportProfitTrend = computed(() => {
  const hasData = props.marketOpportunities && props.marketOpportunities.length > 0 && exportMaterialIds.value.size > 0
  console.log('[BaseSummaryCard] showExportProfitTrend:', hasData, 'exportMaterialIds:', exportMaterialIds.value.size, 'trend:', exportPriceTrend7d.value)
  return hasData
})

</script>

<template>
  <div class="rounded p-2 space-y-2">
    <div class="text-lg text-slate-300 flex flex-wrap gap-4">
      <div>
        {{ translate('netProfit') }}:
        <span :class="summaryForPeriod.net >= 0 ? 'text-emerald-300' : 'text-rose-300'">
          {{ formatPrice(summaryForPeriod.net,2) }}
        </span>
        <span v-if="showNetProfitTrend" class="text-sm ml-1" :class="priceTrendColor(netProfitPriceTrend7d)">
          {{ priceTrendIcon(netProfitPriceTrend7d) }} {{ formatNumber(Math.abs(netProfitPriceTrend7d), 1) }}%
        </span>
      </div>
      <div>
        {{ translate('exportNetProfit') }}:
        <span :class="exportNetProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'">
          {{ formatPrice(exportNetProfit,2) }}
        </span>
        <span v-if="showExportProfitTrend" class="text-sm ml-1" :class="priceTrendColor(exportPriceTrend7d)">
          {{ priceTrendIcon(exportPriceTrend7d) }} {{ formatNumber(Math.abs(exportPriceTrend7d), 1) }}%
        </span>
      </div>
      <div>
        {{ translate('workerPurchaseCosts') }}:
        <span class="text-rose-300">{{ formatPrice(summaryForPeriod.workerPurchaseCosts,2) }}</span>
      </div>
      <div>
        {{ translate('materialPurchaseCosts') }}:
        <span class="text-rose-300">{{ formatPrice(summaryForPeriod.materialPurchaseCosts,2) }}</span>
      </div>
      <div>
        {{ translate('productionRevenue') }}:
        <span class="text-emerald-300">{{ formatPrice(summaryForPeriod.productionRevenue,2) }}</span>
      </div>
    </div>
  </div>
</template>
