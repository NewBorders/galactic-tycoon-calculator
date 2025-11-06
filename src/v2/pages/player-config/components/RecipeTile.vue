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
  maxLines: number
  materialLookup: Map<number, { name: string }>
}>()

const emit = defineEmits<{ updateLines: [lines: number]; remove: [] }>()

const minutesPerDay = 60 * 24

const effectiveLines = computed(() => props.reportRow?.effectiveLines ?? props.selection.lines)

const cyclesPerDay = computed(() => {
  if (props.reportRow) {
    return props.reportRow.cyclesPerDayPerLine * props.reportRow.effectiveLines
  }
  if (props.recipe.timeMinutes <= 0) return 0
  return (minutesPerDay / props.recipe.timeMinutes) * props.selection.lines
})

const outputPerDay = computed(() => cyclesPerDay.value * props.recipe.output.amount)

const inputsPerDay = computed(() => {
  if (props.reportRow) return props.reportRow.inputsPerDay
  return props.recipe.inputs.map((inp) => ({ materialId: inp.id, amount: inp.amount * cyclesPerDay.value }))
})

const overCapacity = computed(() => props.reportRow?.overCapacity ?? false)

function materialName(id: number) {
  return props.materialLookup.get(id)?.name ?? `#${id}`
}

function onLinesInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = Number(target.value)
  if (Number.isNaN(value)) return
  const normalized = Math.floor(value)
  const clamped = Math.max(0, Math.min(normalized, props.maxLines ?? normalized))
  emit('updateLines', clamped)
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 })
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
            {{ translate('lines') }}
            <input
              type="number"
              min="0"
              :max="Math.max(0, maxLines)"
              class="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
              :value="selection.lines"
              @input="onLinesInput"
            />
          </label>
          <div class="text-xs text-slate-400">
            {{ translate('maxLines') }}: {{ maxLines }}
          </div>
          <div class="text-xs text-slate-400">
            {{ translate('requestedLines') }}: {{ selection.lines }}
          </div>
          <div class="text-xs text-slate-400">
            {{ translate('effectiveLines') }}: {{ effectiveLines }}
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
        </div>
        <div v-if="overCapacity" class="mt-2 text-xs text-amber-300">
          {{ translate('overCapacity') }}
        </div>
      </div>
    </div>
  </div>
</template>
