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

const currentWorkforce = computed(() => props.reportRowCurrent?.workforce ?? [])
const currentWorkforceFactor = computed(() => props.reportRowCurrent?.workforceFactor ?? 1)
const currentAbundanceFactor = computed(() => props.reportRowCurrent?.abundanceFactor ?? 1)
const currentProductivityFactor = computed(() => props.reportRowCurrent?.productivityFactor ?? 1)
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
    class="rounded border p-4 space-y-3 h-full transition-all"
    :class="(props.count ?? 1) === 0 ? 'border-slate-600 bg-slate-900/50 opacity-60' : 'border-slate-700 bg-slate-900'"
  >
    <!-- Header: Recipe name, building, technology level -->
    <div class="flex items-start gap-3">
      <span class="recipe-dnd-handle cursor-move px-2 py-1 border border-slate-700 rounded select-none">↕</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="font-semibold truncate inline-flex items-center gap-1">
              <MaterialIcon :name="recipe.output.name" variant="md" />
              <span class="truncate">{{ recipe.output.name }}</span>
              <span v-if="(props.count ?? 1) === 0" class="text-xs text-amber-400 font-normal">({{ translate('disabled') }})</span>
            </div>
            <div class="text-xs text-slate-400">{{ buildingName }}</div>
          </div>
          <!-- Controls for recipe count -->
          <div class="flex items-center gap-2">
            <div class="flex items-center border border-slate-700 rounded px-2 py-1 text-sm bg-slate-800 gap-1">
              <button
                :class="(props.count ?? 1) <= 0 ? 'px-1 py-0.5 text-slate-400 opacity-50 cursor-not-allowed rounded transition' : 'px-1 py-0.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition'"
                title="Decrease quantity"
                aria-label="Decrease recipe quantity"
                :disabled="(props.count ?? 1) <= 0"
                :aria-disabled="(props.count ?? 1) <= 0"
                @click.prevent="emit('updateCount', Math.max(0, (props.count ?? 1) - 1))"
              >
                −
              </button>
              <input
                type="number"
                class="w-10 bg-transparent text-center border-0 focus:outline-none focus:ring-0 text-slate-300"
                :value="props.count ?? 1"
                min="0"
                @input="(e) => emit('updateCount', Math.max(0, Math.floor(Number((e.target as HTMLInputElement).value) || 0)))"
              />
              <button
                class="px-1 py-0.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition"
                title="Increase quantity"
                aria-label="Increase recipe quantity"
                @click.prevent="emit('updateCount', (props.count ?? 1) + 1)"
              >
                +
              </button>
            </div>
            <span class="text-xs text-slate-500 whitespace-nowrap">
              {{( props.count ?? 1 )}}× in queue
            </span>
            <button class="px-2 py-1 border border-slate-700 rounded hover:bg-slate-700 transition" @click.prevent="emit('remove')">
              {{ translate('delete') }}
            </button>
          </div>
        </div>

        <!-- Current vs Planned sections -->
        <div class="mt-3 grid grid-cols-2 gap-4">
          <!-- CURRENT PRODUCTION (readonly) -->
          <div class="border-l border-slate-700 pl-3">
            <div class="text-xs font-semibold text-slate-400 mb-2">{{ translate('current') }}</div>
            
            <!-- Current Tech Level -->
            <div class="text-xs mb-2" :class="currentHasTechnology ? 'text-slate-500' : 'text-amber-300'">
              <template v-if="props.technologyName">
                {{ props.technologyName }} {{ translate('technologyLevel') }}: {{ currentTechnologyLevel }} / {{ requiredTech }}
              </template>
              <template v-else>
                {{ translate('technologyLevel') }}: {{ currentTechnologyLevel }} / Req. {{ requiredTech }}
              </template>
            </div>

            <!-- Current Factors -->
            <div class="text-xs text-slate-500 mb-2">
              {{ translate('productivityFactor') }}: {{ formatShare(currentProductivityFactor * 100) }} ·
              {{ translate(props.reportRowCurrent?.requiresFertility ? 'fertilityFactor' : 'abundanceFactor') }}: {{ formatShare(currentAbundanceFactor * 100) }}
            </div>

            <!-- Current Queue Share and Runs -->
            <div class="text-xs text-slate-400 mb-2">
              {{ translate('queueTimeShare') }}: {{ formatShare((props.reportRowCurrent?.queueShare ?? 1) * 100) }}
              <br />
              {{ translate('runsPerHours', { hours: displayHours }) }}: {{ formatNumber(currentRunsPerModulePerDay * periodFactor) }}
            </div>

            <!-- Current Output -->
            <div class="text-sm mb-2">
              {{ translate('outputPerHours', { hours: displayHours }) }}:
              <span class="text-slate-300">{{ formatNumber(currentOutputPerPeriod) }}</span>
              ×
              <span class="inline-flex items-center gap-1">
                <MaterialIcon :name="recipe.output.name" variant="sm" />
                {{ recipe.output.name }}
              </span>
            </div>

            <!-- Current Inputs -->
            <div class="text-sm">
              {{ translate('inputsPerHours', { hours: displayHours }) }}:
              <ul class="ml-0 pl-0 text-slate-400 text-xs">
                <li v-for="input in currentInputsPerPeriod" :key="input.materialId" class="flex items-center gap-1">
                  <span class="min-w-[56px] text-right">{{ formatNumber(input.amount) }} ×</span>
                  <MaterialIcon :name="materialName(input.materialId)" variant="sm" />
                  <span class="truncate">{{ materialName(input.materialId) }}</span>
                </li>
                <li v-if="!currentInputsPerPeriod.length" class="text-slate-600 list-none">—</li>
              </ul>
            </div>

            <!-- Current Workforce -->
            <div v-if="currentWorkforce.length" class="text-xs mt-2">
              {{ translate('workforceDemand') }}:
              <ul class="ml-3 list-disc text-slate-400 text-xs">
                <li
                  v-for="wf in currentWorkforce"
                  :key="wf.tier"
                  :class="wf.assigned + 1e-3 < wf.required ? 'text-amber-300' : ''"
                >
                  {{ tierLabel(wf.tier) }}: {{ formatNumber(wf.assigned, 0) }} / {{ formatNumber(wf.required, 0) }}
                </li>
              </ul>
            </div>

            <!-- Current Blocked Status -->
            <div v-if="currentBlockedReason" class="mt-2 text-xs text-amber-300">
              <template v-if="currentBlockedByAbundance">
                {{ translate('abundanceZeroWarning') }}
              </template>
              <template v-else-if="currentBlockedByFertility">
                {{ translate('fertilityZeroWarning') }}
              </template>
              <template v-else-if="currentBlockedByTechnology">
                {{ translate('technologyBlockedWarning') }}
              </template>
            </div>
            <div v-else-if="!currentHasTechnology" class="mt-2 text-xs text-amber-300">
              {{ translate('technologyRequirement') }} {{ requiredTech }}
            </div>
            <div v-else-if="currentWorkforceFactor < 0.999" class="mt-2 text-xs text-amber-300">
              {{ translate('workforcePenalty') }}
            </div>
          </div>

          <!-- PLANNED PRODUCTION (editable) -->
          <div class="border-l border-slate-700 pl-3">
            <div class="text-xs font-semibold text-slate-400 mb-2">{{ translate('planned') }}</div>
            
            <!-- Planned Tech Level -->
            <div class="text-xs mb-2" :class="hasTechnology ? 'text-slate-500' : 'text-amber-300'">
              <template v-if="props.technologyName">
                {{ props.technologyName }} {{ translate('technologyLevel') }}: {{ technologyLevel }} / {{ requiredTech }}
              </template>
              <template v-else>
                {{ translate('technologyLevel') }}: {{ technologyLevel }} / Req. {{ requiredTech }}
              </template>
            </div>

            <!-- Planned Factors -->
            <div class="text-xs text-slate-500 mb-2">
              {{ translate('productivityFactor') }}: {{ formatShare(productivityFactor * 100) }} ·
              {{ translate(props.reportRow?.requiresFertility ? 'fertilityFactor' : 'abundanceFactor') }}: {{ formatShare(abundanceFactor * 100) }}
            </div>

            <!-- Planned Queue Share and Runs -->
            <div class="text-xs text-slate-400 mb-2">
              {{ translate('queueTimeShare') }}: {{ formatShare(queueShare * 100) }}
              <br />
              {{ translate('runsPerHours', { hours: displayHours }) }}: {{ formatNumber(runsPerModulePerPeriod) }}
            </div>

            <!-- Planned Output -->
            <div class="text-sm mb-2">
              {{ translate('outputPerHours', { hours: displayHours }) }}:
              <span class="text-emerald-300">{{ formatNumber(outputPerPeriod) }}</span>
              ×
              <span class="inline-flex items-center gap-1">
                <MaterialIcon :name="recipe.output.name" variant="sm" />
                {{ recipe.output.name }}
              </span>
            </div>

            <!-- Planned Inputs -->
            <div class="text-sm">
              {{ translate('inputsPerHours', { hours: displayHours }) }}:
              <ul class="ml-0 pl-0 text-slate-300 text-xs">
                <li v-for="input in inputsPerPeriod" :key="input.materialId" class="flex items-center gap-1">
                  <span class="min-w-[56px] text-right">{{ formatNumber(input.amount) }} ×</span>
                  <MaterialIcon :name="materialName(input.materialId)" variant="sm" />
                  <span class="truncate">{{ materialName(input.materialId) }}</span>
                </li>
                <li v-if="!inputsPerPeriod.length" class="text-slate-500 list-none">—</li>
              </ul>
            </div>

            <!-- Planned Workforce -->
            <div v-if="workforce.length" class="text-xs mt-2">
              {{ translate('workforceDemand') }}:
              <ul class="ml-3 list-disc text-slate-300 text-xs">
                <li
                  v-for="wf in workforce"
                  :key="wf.tier"
                  :class="wf.assigned + 1e-3 < wf.required ? 'text-amber-300' : ''"
                >
                  {{ tierLabel(wf.tier) }}: {{ formatNumber(wf.assigned, 0) }} / {{ formatNumber(wf.required, 0) }}
                </li>
              </ul>
            </div>

            <!-- Planned Blocked Status -->
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
    </div>
  </div>
</template>
