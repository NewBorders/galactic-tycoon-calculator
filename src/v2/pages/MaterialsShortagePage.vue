<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerBases } from '@/v2/services/playerBases'
import { useGlobalSummary } from '@/v2/composables/useGlobalSummary'
import { useMaterialPricing } from '@/v2/services/gamedata/prices'
import { usePlayerTechnology } from '@/v2/services/playerTechnology'
import { useWorldData } from '@/v2/services/worldData'
import { useMarketAnalysis } from '@/v2/composables/useMarketAnalysis'
import { getExportThresholdRef } from '@/v2/services/config/exportThreshold'
import { computeBaseReport } from '@/v2/services/production/engine'
import { analyzeStockSituation } from '@/v2/services/stockAnalysis'
import { useTimeframe } from '@/v2/services/timeframe'
import type { GameData, GdIndex } from '@/v2/services/gamedata/types'
import StockWarnings from '@/v2/components/StockWarnings.vue'

const props = defineProps<{
  gameData: GameData
  index: GdIndex
}>()

// Use shared timeframe
const { timeframeHours } = useTimeframe()

const { state: basesState } = usePlayerBases(props.gameData)
const bases = computed(() => basesState.value.bases)

const { current: worldCurrent } = useWorldData()
const warehouseStocks = computed(() => worldCurrent.value.warehouseStocks)

const { priceResolver } = useMaterialPricing(props.gameData)
const { state: technologyState } = usePlayerTechnology()
const exportThreshold = getExportThresholdRef()

const { opportunities: marketOpportunities } = useMarketAnalysis()

// Calculate global workforce burden across all bases for expansion overhead
const globalWorkforceBurden = computed(() => {
  const technologyLevelsOption: Record<number, number> = {}
  Object.entries(technologyLevels.value ?? {}).forEach(([key, value]) => {
    const spec = Number(key)
    const level = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(spec) || Number.isNaN(level)) return
    technologyLevelsOption[spec] = Math.max(0, Math.floor(level))
  })

  let totalWorkforce = 0
  bases.value.forEach((base) => {
    const assignment = {
      planetId: base.planetId,
      buildings: (base.buildings ?? []).map((b: { buildingId: number; level: number }) => ({
        buildingId: b.buildingId,
        level: b.level,
      })),
      recipes: (base.recipes ?? []).map((r: { id: string; recipeId: number; count?: number }) => ({
        recipeId: r.recipeId,
        count: typeof r.count === 'number' && Number.isFinite(r.count) ? Math.max(1, Math.floor(r.count)) : 1,
      })),
    }
    const activeOptionalConsumables = new Set(
      (base.optionalConsumables ?? []).filter((id): id is number => typeof id === 'number'),
    )

    const report = computeBaseReport(props.gameData, {
      assignment,
      horizonDays: 1,
      options: {
        activeOptionalConsumables,
        technologyLevels: technologyLevelsOption,
        startingBonus: startingBonus.value,
      },
    })

    // Sum up workforce from all tiers
    report.workforceSummary.forEach((wf: { required: number }) => {
      totalWorkforce += wf.required
    })
  })
  return totalWorkforce
})

const technologyLevels = computed(() => technologyState.value.levels)
const startingBonus = computed(() => technologyState.value.startingBonus)

const summary = useGlobalSummary(
  bases,
  computed(() => props.gameData),
  computed(() => props.index),
  priceResolver,
  technologyLevels,
  startingBonus,
  computed(() => timeframeHours.value),
  globalWorkforceBurden,
  exportThreshold,
  warehouseStocks,
  marketOpportunities,
)

// Analyze stock situation for warnings
const stockAnalysis = computed(() => {
  return analyzeStockSituation(
    summary.baseSummaries.value,
    props.gameData,
    props.index,
    {
      timeframeDays: timeframeHours.value / 24,
      priceResolver: priceResolver.value,
    },
  )
})

</script>

<template>
  <div class="space-y-6 pb-16">
    <!-- Timeframe Control -->
    <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div class="flex items-center gap-4">
        <label class="text-slate-300 text-sm font-medium">
          Summary window:
        </label>
        <input
          v-model.number="timeframeHours"
          type="number"
          min="1"
          max="336"
          class="bg-slate-700 text-slate-100 px-3 py-1 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 w-20"
        />
        <span class="text-slate-400 text-sm">hours</span>
      </div>
    </div>

    <!-- Global Stock Warnings -->
    <StockWarnings
      :analysis="stockAnalysis"
      :index="props.index"
      :timeframe-hours="timeframeHours"
    />
  </div>
</template>
