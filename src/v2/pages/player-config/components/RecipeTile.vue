<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Recipe } from '@/v2/services/gamedata/types'
import type { RecipeProductionRow } from '@/v2/services/production/types'
import { translate } from '@/v2/localisation/localisation'

const props = defineProps<{
  recipe: Recipe
  reportRow?: RecipeProductionRow
  buildingName: string
  units: number
  materialLookup: Map<number, { name: string }>
  technologyLevel: number
  requiredTech: number
  timeframeHours: number
  share: number
}>()

const emit = defineEmits<{ remove: []; updateShare: [number] }>()

const minutesPerDay = 60 * 24

function sanitizeShare(value: unknown, fallback = 0): number {
  if (value == null) return fallback
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) return fallback
  return Math.min(100, Math.max(0, Math.round(numeric)))
}

const shareBuffer = ref(sanitizeShare(props.share, 0))

watch(
  () => props.share,
  (value) => {
    shareBuffer.value = sanitizeShare(value, shareBuffer.value)
  },
)

function commitShare(value: unknown) {
  const sanitized = sanitizeShare(value, shareBuffer.value)
  if (sanitized !== shareBuffer.value) {
    shareBuffer.value = sanitized
  }
  emit('updateShare', sanitized)
}

function onShareRange(event: Event) {
  commitShare((event.target as HTMLInputElement).value)
}

function onShareNumber(event: Event) {
  commitShare((event.target as HTMLInputElement).value)
}

const displayHours = computed(() => {
  const hours = Number(props.timeframeHours)
  if (!Number.isFinite(hours)) return 24
  return Math.min(336, Math.max(1, Math.round(hours)))
})

const periodFactor = computed(() => displayHours.value / 24)

const activeUnits = computed(() => props.reportRow?.buildingUnits ?? props.units)
const queueShare = computed(() => props.reportRow?.queueShare ?? 1)
const baseCycleMinutes = computed(() => props.reportRow?.timeMinutes ?? props.recipe.timeMinutes)
const adjustedCycleMinutes = computed(
  () => props.reportRow?.adjustedTimeMinutes ?? baseCycleMinutes.value,
)
const actualCycleMinutes = computed(
  () => props.reportRow?.actualTimeMinutes ?? adjustedCycleMinutes.value,
)
const runsPerModulePerDay = computed(() =>
  props.reportRow?.cyclesPerDayPerUnit ??
  (props.recipe.timeMinutes > 0 ? minutesPerDay / props.recipe.timeMinutes : 0),
)
const runsPerDay = computed(
  () => props.reportRow?.runsPerDay ?? runsPerModulePerDay.value * activeUnits.value,
)

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

const runsPerModulePerPeriod = computed(() => runsPerModulePerDay.value * periodFactor.value)

const outputPerPeriod = computed(() => outputPerDay.value * periodFactor.value)

const inputsPerPeriod = computed(() =>
  inputsPerDay.value.map((inp) => ({
    materialId: inp.materialId,
    amount: inp.amount * periodFactor.value,
  })),
)

const workforce = computed(() => props.reportRow?.workforce ?? [])
const workforceFactor = computed(() => props.reportRow?.workforceFactor ?? 1)
const abundanceFactor = computed(() => props.reportRow?.abundanceFactor ?? 1)
const productivityFactor = computed(() => props.reportRow?.productivityFactor ?? 1)
const blockedReason = computed(() => props.reportRow?.blockedReason ?? null)
const blockedByAbundance = computed(() => blockedReason.value === 'abundance')
const blockedByFertility = computed(() => blockedReason.value === 'fertility')
const blockedByTechnology = computed(() => blockedReason.value === 'technology')
const technologyLevel = computed(() => props.technologyLevel ?? 0)
const requiredTech = computed(() => props.requiredTech ?? 0)
const hasTechnology = computed(() => technologyLevel.value >= requiredTech.value)

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
  <div class="rounded border border-slate-700 bg-slate-900 p-4 space-y-3 h-full">
    <div class="flex items-start gap-3">
      <span class="recipe-dnd-handle cursor-move px-2 py-1 border border-slate-700 rounded select-none">↕</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <div class="font-semibold truncate">{{ recipe.output.name }}</div>
            <div class="text-xs text-slate-400">{{ buildingName }}</div>
            <div class="text-xs" :class="hasTechnology ? 'text-slate-500' : 'text-amber-300'">
              {{ translate('technologyLevel') }}: {{ technologyLevel }} / {{ requiredTech }}
            </div>
            <div class="text-xs text-slate-500">
              {{ translate('baseCycleTime') }}: {{ formatMinutes(baseCycleMinutes) }} •
              {{ translate('actualCycleTime') }}: {{ formatMinutes(actualCycleMinutes) }}
            </div>
          </div>
          <button class="px-2 py-1 border border-slate-700 rounded hover:bg-slate-700" @click.prevent="emit('remove')">
            {{ translate('delete') }}
          </button>
        </div>

        <div class="mt-3 space-y-2 text-xs text-slate-400">
          <label class="block space-y-2">
            <span class="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
              {{ translate('recipeQueueShare') }}
              <span class="text-slate-200">{{ formatShare(shareBuffer) }}</span>
            </span>
            <div class="flex items-center gap-3">
              <input
                class="flex-1 accent-emerald-500"
                type="range"
                min="0"
                max="100"
                step="1"
                :value="shareBuffer"
                @input="onShareRange"
              />
              <input
                class="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                type="number"
                min="0"
                max="100"
                :value="shareBuffer"
                @input="onShareNumber"
              />
            </div>
            <span class="text-[11px] text-slate-500">{{ translate('recipeQueueShareHint') }}</span>
          </label>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <div>
            {{ translate('queueTimeShare') }}: {{ formatShare(queueShare * 100) }}
          </div>
          <div>
            {{ translate('runsPerHours', { hours: displayHours }) }}:
            {{ formatNumber(runsPerModulePerPeriod) }}
          </div>
        </div>

        <div class="mt-3 space-y-2 text-sm">
          <div>
            {{ translate('outputPerHours', { hours: displayHours }) }}:
            <span class="text-emerald-300">{{ formatNumber(outputPerPeriod) }}</span>
            × {{ recipe.output.name }}
          </div>
          <div>
            {{ translate('inputsPerHours', { hours: displayHours }) }}:
            <ul class="ml-4 list-disc text-slate-300">
              <li v-for="input in inputsPerPeriod" :key="input.materialId">
                {{ formatNumber(input.amount) }} × {{ materialName(input.materialId) }}
              </li>
              <li v-if="!inputsPerPeriod.length" class="text-slate-500">—</li>
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
        <div v-if="blockedReason" class="mt-2 text-xs text-amber-300">
          <template v-if="blockedByAbundance">
            {{ translate('abundanceZeroWarning') }}
          </template>
          <template v-else-if="blockedByFertility">
            {{ translate('fertilityZeroWarning') }}
          </template>
          <template v-else-if="blockedByTechnology">
            {{ translate('technologyBlockedWarning') }}
          </template>
        </div>
        <div v-else-if="!hasTechnology" class="mt-2 text-xs text-amber-300">
          {{ translate('technologyRequirement') }} {{ requiredTech }}
        </div>
        <div v-else-if="workforceFactor < 0.999" class="mt-2 text-xs text-amber-300">
          {{ translate('workforcePenalty') }}
        </div>
      </div>
    </div>
  </div>
</template>
