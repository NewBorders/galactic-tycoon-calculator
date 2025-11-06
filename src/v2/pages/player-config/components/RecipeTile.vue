<script setup lang="ts">
import { computed } from 'vue'
import type { Recipe } from '@/v2/services/gamedata/types'
import type { PlayerRecipe } from '@/v2/services/playerBases'
import type { RecipeProductionRow } from '@/v2/services/production/types'
import { translate } from '@/v2/localisation/localisation'

const props = defineProps<{
  recipe: Recipe
  selection: PlayerRecipe
  reportRow?: RecipeProductionRow
  buildingName: string
  capacityShare: number
  materialLookup: Map<number, { name: string }>
}>()

const emit = defineEmits<{ updateShare: [share: number]; remove: [] }>()

const minutesPerDay = 60 * 24

const requestedShare = computed(() => props.reportRow?.requestedShare ?? props.selection.share)
const effectiveShare = computed(() => props.reportRow?.effectiveShare ?? props.selection.share)
const capacityShare = computed(() => props.reportRow?.capacityShare ?? props.capacityShare ?? 0)

const perUnitCycles = computed(() =>
  props.recipe.timeMinutes > 0 ? minutesPerDay / props.recipe.timeMinutes : 0,
)

const fallbackCycles = computed(
  () => perUnitCycles.value * (effectiveShare.value / 100),
)

const outputPerDay = computed(() => {
  if (props.reportRow) return props.reportRow.outputPerDay
  return fallbackCycles.value * props.recipe.output.amount
})

const inputsPerDay = computed(() => {
  if (props.reportRow) return props.reportRow.inputsPerDay
  return props.recipe.inputs.map((inp) => ({
    materialId: inp.id,
    amount: inp.amount * fallbackCycles.value,
  }))
})

const workforce = computed(() => props.reportRow?.workforce ?? [])
const overCapacity = computed(() => props.reportRow?.overCapacity ?? false)
const abundanceFactor = computed(() => props.reportRow?.abundanceFactor ?? 1)
const productivityFactor = computed(() => props.reportRow?.productivityFactor ?? 1)

function materialName(id: number) {
  return props.materialLookup.get(id)?.name ?? `#${id}`
}

function onShareInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = Number(target.value)
  if (Number.isNaN(value)) return
  const normalized = Math.max(0, value)
  const max = capacityShare.value > 0 ? capacityShare.value : normalized
  const clamped = Math.min(normalized, max)
  emit('updateShare', clamped)
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
            <div class="text-xs text-slate-400">
              {{ buildingName }} • {{ translate('cycleTime') }}: {{ recipe.timeMinutes }}
              {{ translate('minutes') }}
            </div>
          </div>
          <button class="px-2 py-1 border border-slate-700 rounded hover:bg-slate-700" @click.prevent="emit('remove')">
            {{ translate('delete') }}
          </button>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <label class="flex items-center gap-2 text-xs text-slate-300">
            {{ translate('shareLabel') }}
            <input
              type="number"
              min="0"
              :max="Math.max(0, capacityShare)"
              step="1"
              class="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
              :value="selection.share"
              @input="onShareInput"
            />
          </label>
          <div class="text-xs text-slate-400">
            {{ translate('availableCapacity') }}: {{ formatShare(capacityShare) }}
          </div>
          <div class="text-xs text-slate-400">
            {{ translate('requestedShare') }}: {{ formatShare(requestedShare) }}
          </div>
          <div class="text-xs text-slate-400">
            {{ translate('effectiveShare') }}: {{ formatShare(effectiveShare) }}
          </div>
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
        <div v-if="abundanceFactor === 0" class="mt-2 text-xs text-amber-300">
          {{ translate('abundanceZeroWarning') }}
        </div>
        <div v-if="overCapacity" class="mt-2 text-xs text-amber-300">
          {{ translate('overCapacityShare') }}
        </div>
      </div>
    </div>
  </div>
</template>
