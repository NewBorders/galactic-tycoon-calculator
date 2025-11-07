<script setup lang="ts">
import { computed } from 'vue'
import type { Recipe } from '@/v2/services/gamedata/types'
import type { RecipeProductionRow } from '@/v2/services/production/types'
import { translate } from '@/v2/localisation/localisation'

const props = defineProps<{
  recipe: Recipe
  reportRow?: RecipeProductionRow
  buildingName: string
  units: number
  materialLookup: Map<number, { name: string }>
}>()

const emit = defineEmits<{ remove: [] }>()

const minutesPerDay = 60 * 24

const activeUnits = computed(() => props.reportRow?.buildingUnits ?? props.units)
const queueShare = computed(() => props.reportRow?.queueShare ?? 1)
const baseCycleMinutes = computed(() => props.reportRow?.timeMinutes ?? props.recipe.timeMinutes)
const adjustedCycleMinutes = computed(
  () => props.reportRow?.adjustedTimeMinutes ?? baseCycleMinutes.value,
)
const actualCycleMinutes = computed(
  () => props.reportRow?.actualTimeMinutes ?? adjustedCycleMinutes.value,
)
const dailyRunsPerModule = computed(() =>
  props.reportRow?.cyclesPerDayPerUnit ??
  (props.recipe.timeMinutes > 0 ? minutesPerDay / props.recipe.timeMinutes : 0),
)
const runsPerDay = computed(() => props.reportRow?.runsPerDay ?? dailyRunsPerModule.value * activeUnits.value)

const outputPerDay = computed(() => {
  if (props.reportRow) return props.reportRow.outputPerDay
  return runsPerDay.value * props.recipe.output.amount
})

const inputsPerDay = computed(() => {
  if (props.reportRow) return props.reportRow.inputsPerDay
  return props.recipe.inputs.map((inp) => ({
    materialId: inp.id,
    amount: inp.amount * runsPerDay.value,
  }))
})

const workforce = computed(() => props.reportRow?.workforce ?? [])
const workforceFactor = computed(() => props.reportRow?.workforceFactor ?? 1)
const abundanceFactor = computed(() => props.reportRow?.abundanceFactor ?? 1)
const productivityFactor = computed(() => props.reportRow?.productivityFactor ?? 1)
const blockedByAbundance = computed(() => props.reportRow?.blockedByAbundance ?? false)

function materialName(id: number) {
  return props.materialLookup.get(id)?.name ?? `#${id}`
}

function formatNumber(value: number, fractionDigits = 2) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  })
}

function formatShare(value: number) {
  return `${formatNumber(value, 1)}%`
}

function formatMinutes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '—'
  return `${formatNumber(value, 1)} ${translate('minutes')}`
}

function tierLabel(tier: number) {
  switch (tier) {
    case 1:
      return 'T1'
    case 2:
      return 'T2'
    case 3:
      return 'T3'
    case 4:
      return 'T4'
    default:
      return `T${tier}`
  }
}
</script>

<template>
  <div class="rounded border border-slate-700 bg-slate-900 p-4 space-y-3">
    <div class="flex items-start gap-3">
      <span class="recipe-dnd-handle cursor-move px-2 py-1 border border-slate-700 rounded select-none">↕</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <div class="font-semibold truncate">{{ recipe.output.name }}</div>
            <div class="text-xs text-slate-400">{{ buildingName }}</div>
            <div class="text-xs text-slate-500">
              {{ translate('baseCycleTime') }}: {{ formatMinutes(baseCycleMinutes) }} •
              {{ translate('actualCycleTime') }}: {{ formatMinutes(actualCycleMinutes) }}
            </div>
          </div>
          <button class="px-2 py-1 border border-slate-700 rounded hover:bg-slate-700" @click.prevent="emit('remove')">
            {{ translate('delete') }}
          </button>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <div>
            {{ translate('activeModules') }}: {{ formatNumber(activeUnits, 0) }}
          </div>
          <div>
            {{ translate('queueTimeShare') }}: {{ formatShare(queueShare * 100) }}
          </div>
          <div>{{ translate('dailyRunsPerModule') }}: {{ formatNumber(dailyRunsPerModule) }}</div>
        </div>

        <div class="mt-3 space-y-2 text-sm">
          <div>
            {{ translate('outputPerDay') }}:
            <span class="text-emerald-300">{{ formatNumber(outputPerDay) }}</span>
            × {{ recipe.output.name }}
          </div>
          <div>
            {{ translate('inputsPerDay') }}:
            <ul class="ml-4 list-disc text-slate-300">
              <li v-for="input in inputsPerDay" :key="input.materialId">
                {{ formatNumber(input.amount) }} × {{ materialName(input.materialId) }}
              </li>
              <li v-if="!inputsPerDay.length" class="text-slate-500">—</li>
            </ul>
          </div>
          <div v-if="workforce.length">
            {{ translate('workforceDemand') }}:
            <ul class="ml-4 list-disc text-slate-300">
              <li
                v-for="wf in workforce"
                :key="wf.tier"
                :class="wf.assigned + 1e-3 < wf.required ? 'text-amber-300' : ''"
              >
                {{ tierLabel(wf.tier) }}:
                {{ formatNumber(wf.assigned, 1) }} / {{ formatNumber(wf.required, 1) }}
              </li>
            </ul>
          </div>
          <div class="text-xs text-slate-500">
            {{ translate('productivityFactor') }}: {{ formatShare(productivityFactor * 100) }} ·
            {{ translate('abundanceFactor') }}: {{ formatShare(abundanceFactor * 100) }}
          </div>
        </div>
        <div v-if="blockedByAbundance" class="mt-2 text-xs text-amber-300">
          {{ translate('abundanceZeroWarning') }}
        </div>
        <div v-else-if="workforceFactor < 0.999" class="mt-2 text-xs text-amber-300">
          {{ translate('workforcePenalty') }}
        </div>
      </div>
    </div>
  </div>
</template>
