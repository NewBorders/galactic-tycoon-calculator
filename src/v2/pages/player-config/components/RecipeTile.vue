<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '@/v2/utils/formatNumber'
import type { Recipe } from '@/v2/services/gamedata/types'
import type { RecipeProductionRow } from '@/v2/services/production/types'
import { translate } from '@/v2/localisation'
import MaterialIcon from '@/v2/components/MaterialIcon.vue'

const props = defineProps<{
  recipe: Recipe
  reportRowCurrent?: RecipeProductionRow
  reportRow?: RecipeProductionRow
  buildingName: string
  units: number
  count?: number
  currentCount?: number
  materialLookup: Map<number, { name: string }>
  technologyLevel: number
  currentTechnologyLevel: number
  requiredTech: number
  technologyName?: string
  timeframeHours: number
}>()

const emit = defineEmits<{
  remove: []
  updateCount: [count: number]
}>()

const minutesPerDay = 60 * 24

const displayHours = computed(() => {
  const hours = Number(props.timeframeHours)
  if (!Number.isFinite(hours)) return 24
  return Math.min(336, Math.max(1, Math.round(hours)))
})

const periodFactor = computed(() => displayHours.value / 24)

// When count is 0, treat as if recipe is disabled (0 active units)
const effectiveCount = computed(() => (typeof props.count === 'number' ? props.count : 1))
const isDisabled = computed(() => effectiveCount.value === 0)

// ===== PLANNED PRODUCTION (from props.reportRow) =====
// When disabled (count=0), ignore reportRow and calculate from scratch
const activeUnits = computed(() => {
  if (isDisabled.value) return 0
  return props.reportRow?.buildingUnits ?? props.units
})
const queueShare = computed(() => isDisabled.value ? 1 : (props.reportRow?.queueShare ?? 1))
const runsPerModulePerDay = computed(() =>
  props.reportRow?.cyclesPerDayPerUnit ??
  (props.recipe.timeMinutes > 0 ? minutesPerDay / props.recipe.timeMinutes : 0),
)
const runsPerDay = computed(() => {
  if (isDisabled.value) return 0
  return props.reportRow?.runsPerDay ?? runsPerModulePerDay.value * activeUnits.value
})

const outputPerDay = computed(() => {
  if (isDisabled.value) return 0
  if (props.reportRow) return props.reportRow.outputPerDay
  return runsPerDay.value * props.recipe.output.amount
})

const inputsPerDay = computed(() => {
  if (isDisabled.value) {
    return props.recipe.inputs.map((inp) => ({
      materialId: inp.id,
      amount: 0,
    }))
  }
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

// ===== CURRENT PRODUCTION (from props.reportRowCurrent) =====
const currentActiveUnits = computed(() => {
  if (isDisabled.value) return 0
  return props.reportRowCurrent?.buildingUnits ?? props.units
})
const currentRunsPerModulePerDay = computed(() =>
  props.reportRowCurrent?.cyclesPerDayPerUnit ??
  (props.recipe.timeMinutes > 0 ? minutesPerDay / props.recipe.timeMinutes : 0),
)
const currentRunsPerDay = computed(() => {
  if (isDisabled.value) return 0
  return props.reportRowCurrent?.runsPerDay ?? currentRunsPerModulePerDay.value * currentActiveUnits.value
})

const currentOutputPerDay = computed(() => {
  if (isDisabled.value) return 0
  if (props.reportRowCurrent) return props.reportRowCurrent.outputPerDay
  return currentRunsPerDay.value * props.recipe.output.amount
})

const currentInputsPerDay = computed(() => {
  if (isDisabled.value) {
    return props.recipe.inputs.map((inp) => ({
      materialId: inp.id,
      amount: 0,
    }))
  }
  if (props.reportRowCurrent) return props.reportRowCurrent.inputsPerDay
  return props.recipe.inputs.map((inp) => ({
    materialId: inp.id,
    amount: inp.amount * currentRunsPerDay.value,
  }))
})

const currentOutputPerPeriod = computed(() => currentOutputPerDay.value * periodFactor.value)

const currentInputsPerPeriod = computed(() =>
  currentInputsPerDay.value.map((inp) => ({
    materialId: inp.materialId,
    amount: inp.amount * periodFactor.value,
  })),
)

const currentWorkforceFactor = computed(() => props.reportRowCurrent?.workforceFactor ?? 1)
const currentBlockedReason = computed(() => props.reportRowCurrent?.blockedReason ?? null)

const blockedByAbundance = computed(() => blockedReason.value?.includes('Abundance') ?? false)
const blockedByFertility = computed(() => blockedReason.value?.includes('Fertility') ?? false)
const blockedByTechnology = computed(() => blockedReason.value?.includes('Technology') ?? false)

const currentBlockedByAbundance = computed(() => currentBlockedReason.value?.includes('Abundance') ?? false)
const currentBlockedByFertility = computed(() => currentBlockedReason.value?.includes('Fertility') ?? false)
const currentBlockedByTechnology = computed(() => currentBlockedReason.value?.includes('Technology') ?? false)

const hasTechnology = computed(() => props.technologyLevel >= props.requiredTech)
const currentHasTechnology = computed(() => props.currentTechnologyLevel >= props.requiredTech)

function materialName(id: number) {
  return props.materialLookup.get(id)?.name ?? `#${id}`
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
  <div
    class="rounded border p-2 space-y-3 h-full transition-all"
    :class="(props.count ?? 1) === 0 ? 'border-slate-600 bg-slate-900/50 opacity-60' : 'border-slate-700 bg-slate-900'"
  >
    <!-- Header: Recipe + building on left, current/planned counts on right -->
    <div class="flex items-start justify-between gap-2">
      <!-- Left: drag handle + recipe + building -->
      <div class="flex items-start gap-1 min-w-0 flex-1">
        <span class="recipe-dnd-handle cursor-move px-1.5 py-1 border border-slate-700 rounded select-none flex-shrink-0">↕</span>
        <div class="min-w-0 flex-1">
          <div class="font-semibold truncate inline-flex items-center gap-1">
            <MaterialIcon :name="recipe.output.name" variant="md" />
            <span class="truncate">{{ recipe.output.name }}</span>
            <span v-if="(props.count ?? 1) === 0" class="text-xs text-amber-400 font-normal">({{ translate('disabled') }})</span>
          </div>
          <div class="text-xs text-slate-400">{{ buildingName }}</div>
        </div>
      </div>

      <!-- Middle: Current count -->
      <div class="text-xs text-slate-400 flex-shrink-0 text-center">
        <div>{{ translate('current') }}</div>
        <div class="font-semibold text-slate-300">
          <template v-if="typeof props.currentCount === 'number'">{{ props.currentCount }}×</template>
          <template v-else>—</template>
        </div>
      </div>

      <!-- Right: Planned count controls -->
      <div class="flex items-start gap-0.5 flex-shrink-0">
        <div class="text-xs text-slate-400 text-center">
          <div>{{ translate('planned') }}</div>
          <div class="flex items-center border border-slate-700 rounded px-1 py-0.5 bg-slate-800 gap-0.5">
            <button
              :class="(props.count ?? 1) <= 0 ? 'px-0.5 text-slate-400 opacity-50 cursor-not-allowed text-xs' : 'px-0.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition text-xs'"
              title="Decrease quantity"
              :disabled="(props.count ?? 1) <= 0"
              @click.prevent="emit('updateCount', Math.max(0, (props.count ?? 1) - 1))"
            >
              −
            </button>
            <input
              type="number"
              class="w-6 bg-transparent text-center border-0 focus:outline-none focus:ring-0 text-slate-300 text-sm"
              :value="props.count ?? 1"
              min="0"
              @input="(e) => emit('updateCount', Math.max(0, Math.floor(Number((e.target as HTMLInputElement).value) || 0)))"
            />
            <button
              class="px-0.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition text-xs"
              title="Increase quantity"
              @click.prevent="emit('updateCount', (props.count ?? 1) + 1)"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <!-- Far right: Delete button -->
      <button class="px-2 py-1 border border-slate-700 rounded hover:bg-slate-700 transition text-sm flex-shrink-0" @click.prevent="emit('remove')">
        {{ translate('delete') }}
      </button>
    </div>

    <!-- Shared information (productivity and abundance in one line) -->
    <div class="mt-2 text-xs text-slate-500">
      {{ translate('productivityFactor') }}:
      <span class="text-slate-300">{{ formatShare(productivityFactor * 100) }}</span>
      <span class="mx-1">·</span>
      {{ translate(props.reportRow?.requiresFertility ? 'fertilityFactor' : 'abundanceFactor') }}:
      <span class="text-slate-300">{{ formatShare(abundanceFactor * 100) }}</span>
    </div>

    <!-- Workforce demand (if applicable) - responsive grid without markers -->
    <div v-if="workforce.length" class="mt-1 text-xs text-slate-500">
      <div class="font-semibold mb-1">{{ translate('workforceDemand') }}</div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-1 text-slate-400">
        <div
          v-for="wf in workforce"
          :key="wf.tier"
          :class="wf.assigned + 1e-3 < wf.required ? 'text-amber-300' : ''"
        >
          <span class="font-semibold">{{ tierLabel(wf.tier) }}</span>: {{ formatNumber(wf.assigned, 0) }}/{{ formatNumber(wf.required, 0) }}
        </div>
      </div>
    </div>

    <!-- Current vs Planned Table -->
    <div class="mt-3 overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b border-slate-700">
            <th class="text-left px-2 py-1 text-xs font-semibold text-slate-400">per {{ displayHours }}h</th>
            <th class="text-center px-2 py-1 text-xs font-semibold text-slate-400">{{ translate('current') }}</th>
            <th class="text-center px-2 py-1 text-xs font-semibold text-slate-400">{{ translate('planned') }}</th>
          </tr>
        </thead>
        <tbody class="text-xs">
          <!-- Technology Level -->
          <tr class="border-b border-slate-700/50">
            <td class="px-2 py-2 text-slate-400">
              <span v-if="props.technologyName">{{ props.technologyName }}</span>
              <span v-else>{{ translate('technologyLevel') }}</span>
            </td>
            <td class="px-2 py-2 text-center" :class="currentHasTechnology ? 'text-slate-300' : 'text-amber-300'">
              {{ currentTechnologyLevel }} / {{ requiredTech }}
            </td>
            <td class="px-2 py-2 text-center" :class="hasTechnology ? 'text-slate-300' : 'text-amber-300'">
              {{ technologyLevel }} / {{ requiredTech }}
            </td>
          </tr>

          <!-- Queue Share -->
          <tr class="border-b border-slate-700/50">
            <td class="px-2 py-2 text-slate-400">{{ translate('queueTimeShare') }}</td>
            <td class="px-2 py-2 text-center text-slate-300">
              {{ formatShare((props.reportRowCurrent?.queueShare ?? 1) * 100) }}
            </td>
            <td class="px-2 py-2 text-center text-slate-300">
              {{ formatShare(queueShare * 100) }}
            </td>
          </tr>

          <!-- Runs per Period -->
          <tr class="border-b border-slate-700/50">
            <td class="px-2 py-2 text-slate-400">{{ translate('dailyRunsPerModule') }}</td>
            <td class="px-2 py-2 text-center text-slate-300">
              {{ formatNumber(currentRunsPerModulePerDay * periodFactor) }}
            </td>
            <td class="px-2 py-2 text-center text-slate-300">
              {{ formatNumber(runsPerModulePerPeriod) }}
            </td>
          </tr>

          <!-- Output per Period -->
          <tr class="border-b border-slate-700/50">
            <td class="px-2 py-2 text-slate-400">{{ translate('outputPerDay') }}</td>
            <td class="px-2 py-2 text-center">
              <div class="inline-flex items-center gap-1">
                <span class="text-slate-300">{{ formatNumber(currentOutputPerPeriod) }}</span>
                <span>×</span>
                <MaterialIcon :name="recipe.output.name" variant="sm" />
                <span class="text-slate-300">{{ recipe.output.name }}</span>
              </div>
            </td>
            <td class="px-2 py-2 text-center">
              <div class="inline-flex items-center gap-1">
                <span class="text-emerald-300">{{ formatNumber(outputPerPeriod) }}</span>
                <span>×</span>
                <MaterialIcon :name="recipe.output.name" variant="sm" />
                <span class="text-emerald-300">{{ recipe.output.name }}</span>
              </div>
            </td>
          </tr>

          <!-- Inputs per Period -->
          <tr>
            <td class="px-2 py-2 text-slate-400 align-top">{{ translate('inputsPerDay') }}</td>
            <td class="px-2 py-2 align-top">
              <ul class="space-y-1">
                <li v-for="input in currentInputsPerPeriod" :key="input.materialId" class="flex items-center justify-center gap-1">
                  <span class="text-slate-400">{{ formatNumber(input.amount) }} ×</span>
                  <MaterialIcon :name="materialName(input.materialId)" variant="sm" />
                  <span class="text-slate-400 truncate">{{ materialName(input.materialId) }}</span>
                </li>
                <li v-if="!currentInputsPerPeriod.length" class="text-slate-600 text-center">—</li>
              </ul>
            </td>
            <td class="px-2 py-2 align-top">
              <ul class="space-y-1">
                <li v-for="input in inputsPerPeriod" :key="input.materialId" class="flex items-center justify-center gap-1">
                  <span class="text-slate-300">{{ formatNumber(input.amount) }} ×</span>
                  <MaterialIcon :name="materialName(input.materialId)" variant="sm" />
                  <span class="text-slate-300 truncate">{{ materialName(input.materialId) }}</span>
                </li>
                <li v-if="!inputsPerPeriod.length" class="text-slate-500 text-center">—</li>
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Warnings and Status Messages -->
    <div class="mt-3 space-y-1 text-xs">
      <!-- Current warnings -->
      <div v-if="currentBlockedReason || !currentHasTechnology || currentWorkforceFactor < 0.999" class="text-amber-300">
        <span class="font-semibold">{{ translate('current') }}:</span>
        <template v-if="currentBlockedByAbundance">
          {{ translate('abundanceZeroWarning') }}
        </template>
        <template v-else-if="currentBlockedByFertility">
          {{ translate('fertilityZeroWarning') }}
        </template>
        <template v-else-if="currentBlockedByTechnology">
          {{ translate('technologyBlockedWarning') }}
        </template>
        <template v-else-if="!currentHasTechnology">
          {{ translate('technologyRequirement') }} {{ requiredTech }}
        </template>
        <template v-else-if="currentWorkforceFactor < 0.999">
          {{ translate('workforcePenalty') }}
        </template>
      </div>

      <!-- Planned warnings -->
      <div v-if="blockedReason || !hasTechnology || workforceFactor < 0.999" class="text-amber-300">
        <span class="font-semibold">{{ translate('planned') }}:</span>
        <template v-if="blockedByAbundance">
          {{ translate('abundanceZeroWarning') }}
        </template>
        <template v-else-if="blockedByFertility">
          {{ translate('fertilityZeroWarning') }}
        </template>
        <template v-else-if="blockedByTechnology">
          {{ translate('technologyBlockedWarning') }}
        </template>
        <template v-else-if="!hasTechnology">
          {{ translate('technologyRequirement') }} {{ requiredTech }}
        </template>
        <template v-else-if="workforceFactor < 0.999">
          {{ translate('workforcePenalty') }}
        </template>
      </div>
    </div>
  </div>
</template>
