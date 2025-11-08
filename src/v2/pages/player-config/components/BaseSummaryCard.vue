<script setup lang="ts">
import { computed } from 'vue'
import type { GameData, GdIndex } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import { computeBaseReport } from '@/v2/services/production/engine'
import { translate } from '@/v2/localisation/localisation'

const props = defineProps<{
  base: PlayerBase
  gameData: GameData
  index: GdIndex
  priceResolver: (materialId: number) => number
  technologyLevels: Partial<Record<number, number>>
  startingBonus: number
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
    },
  }),
)

const summary = computed(() => report.value.summary)

function formatNumber(value: number, fractionDigits = 2) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })
}
</script>

<template>
  <div class="rounded p-2 space-y-2">
    <div class="text-lg text-slate-300 flex flex-wrap gap-4">
      <div>
        {{ translate('netResult') }}:
        <span :class="summary.net >= 0 ? 'text-emerald-300' : 'text-rose-300'">{{ formatNumber(summary.net) }}</span>
      </div>
      <div>
        {{ translate('workerPurchaseCosts') }}:
        <span class="text-rose-300">{{ formatNumber(summary.workerPurchaseCosts) }}</span>
      </div>
      <div>
        {{ translate('materialPurchaseCosts') }}:
        <span class="text-rose-300">{{ formatNumber(summary.materialPurchaseCosts) }}</span>
      </div>
      <div>
        {{ translate('productionRevenue') }}:
        <span class="text-emerald-300">{{ formatNumber(summary.productionRevenue) }}</span>
      </div>
    </div>
  </div>
</template>
