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

// Planned production report (using planned technology levels)
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

// Calculate export materials and metrics
const exportMetrics = computed(() => {
  const exportIds = calculateExportMaterials(report.value)
  return calculateExportMetrics(report.value, exportIds, periodFactor.value)
})

// Calculate price trend for net profit
const netProfitPriceTrend7d = computed(() =>
  calculateNetProfitPriceTrend(report.value, props.marketOpportunities),
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
  <div class="rounded p-2 space-y-2">
    <div class="text-lg text-slate-300 flex flex-wrap gap-4">
      <div>
        {{ translate('netProfit') }}:
        <span :class="summaryForPeriod.net >= 0 ? 'text-emerald-300' : 'text-rose-300'">
          {{ formatPrice(summaryForPeriod.net, 2) }}
        </span>
        <span v-if="showNetProfitTrend" class="text-sm ml-1" :class="priceTrendColor(netProfitPriceTrend7d)">
          {{ priceTrendIcon(netProfitPriceTrend7d) }} {{ formatNumber(Math.abs(netProfitPriceTrend7d), 1) }}%
        </span>
      </div>
      <div>
        {{ translate('exportNetProfit') }}:
        <span :class="exportMetrics.exportNetProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'">
          {{ formatPrice(exportMetrics.exportNetProfit, 2) }}
        </span>
      </div>
      <div>
        {{ translate('workerPurchaseCosts') }}:
        <span class="text-rose-300">{{ formatPrice(summaryForPeriod.workerPurchaseCosts, 2) }}</span>
      </div>
      <div>
        {{ translate('materialPurchaseCosts') }}:
        <span class="text-rose-300">{{ formatPrice(summaryForPeriod.materialPurchaseCosts, 2) }}</span>
      </div>
      <div>
        {{ translate('productionRevenue') }}:
        <span class="text-emerald-300">{{ formatPrice(summaryForPeriod.productionRevenue, 2) }}</span>
      </div>
    </div>
  </div>
</template>
