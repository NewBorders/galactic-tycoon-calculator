<script setup lang="ts">
import { ref, toRef, computed } from 'vue'
import type { GameData, GdIndex } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import { useGlobalSummary } from '@/v2/composables/useGlobalSummary'
import { formatPrice, formatNumber } from '@/v2/utils/formatNumber'
import { translate } from '@/v2/localisation'
import MaterialIcon from '@/v2/components/MaterialIcon.vue'
import { getWorkerConsumableMaterialIds } from '@/v2/utils/workerConsumables'
import { formatWeight, getMaterialWeight } from '@/v2/utils/materialHelpers'

const props = defineProps<{
  bases: PlayerBase[]
  gameData: GameData
  index: GdIndex
  priceResolver: (materialId: number) => number
  technologyLevels: Partial<Record<number, number>>
  startingBonus: number
  timeframeHours: number
  globalWorkforceBurden: number
  exportThreshold: number
}>()

const emit = defineEmits<{
  'update:exportThreshold': [value: number]
}>()

const isOpen = ref(true)
const expandedBases = ref<Set<string>>(new Set())
const expandedMaterials = ref(false)
const showPerBaseBreakdown = ref(false)

// Get worker consumable material IDs from game data (single source of truth)
const workerConsumableIds = computed(() => getWorkerConsumableMaterialIds(props.gameData))

const { baseSummaries, totalNetProfit, totalExportNetProfit, totalWorkforceDeficitCost, totalConsumptionOverheadCost, globalMaterials } =
  useGlobalSummary(
    toRef(() => props.bases),
    toRef(() => props.gameData),
    toRef(() => props.index),
    toRef(() => props.priceResolver),
    toRef(() => props.technologyLevels),
    toRef(() => props.startingBonus),
    toRef(() => props.timeframeHours),
    toRef(() => props.globalWorkforceBurden),
    toRef(() => props.exportThreshold),
  )

function toggleBase(baseId: string) {
  if (expandedBases.value.has(baseId)) {
    expandedBases.value.delete(baseId)
  } else {
    expandedBases.value.add(baseId)
  }
}

function getMaterialName(materialId: number): string {
  const material = props.gameData.materials.find((m) => m.id === materialId)
  return material?.name ?? `Material ${materialId}`
}

const regularMaterials = computed(() => {
  return globalMaterials.value.filter(m => !workerConsumableIds.value.has(m.materialId))
})

const workerConsumableMaterials = computed(() => {
  return globalMaterials.value.filter(m => workerConsumableIds.value.has(m.materialId))
})

function getPlanetName(planetId: number): string {
  const planet = props.gameData.planets.find((p) => p.id === planetId)
  return planet?.name ?? `Planet ${planetId}`
}

function formatDays(days: number): string {
  if (days < 1) {
    const hours = Math.floor(days * 24)
    return `${hours}h`
  }
  return `${Math.floor(days)}d`
}

// Calculate total weight and value for export materials per base
function getExportTotals(exportMaterials: typeof baseSummaries.value[0]['exportMaterials']) {
  let totalWeight = 0
  let totalValue = 0

  exportMaterials.forEach((material) => {
    totalWeight += material.exportPerDay * getMaterialWeight(props.gameData, material.materialId)
    totalValue += material.valuePerDay
  })

  return { totalWeight, totalValue }
}

// Calculate total weight for running out materials per base
function getRunningOutTotalWeight(materialsRunningOut: typeof baseSummaries.value[0]['materialsRunningOut']) {
  let totalWeight = 0

  materialsRunningOut.forEach((material) => {
    const toBuy = Math.max(0, (material.consumptionPerDay * props.timeframeHours / 24) - material.currentStock)
    totalWeight += toBuy * getMaterialWeight(props.gameData, material.materialId)
  })

  return totalWeight
}
</script>

<template>
  <details class="border border-amber-600 rounded bg-gradient-to-br from-slate-800 to-slate-900 mb-4" :open="isOpen" @toggle="isOpen = ($event.target as HTMLDetailsElement).open">
    <summary class="px-4 py-3 cursor-pointer font-semibold text-amber-300 flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <span>{{ translate('globalSummary') }}</span>
    </summary>

    <div class="px-4 py-3 space-y-4">
      <!-- Key Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-slate-700/50 rounded p-3">
          <div class="text-sm text-slate-400">{{ translate('totalNetProfit') }}</div>
          <div class="text-2xl font-bold" :class="totalNetProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'">
            {{ formatPrice(totalNetProfit, 2) }}
          </div>
        </div>

        <div class="bg-slate-700/50 rounded p-3">
          <div class="text-sm text-slate-400">{{ translate('exportNetProfit') }}</div>
          <div class="text-2xl font-bold" :class="totalExportNetProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'">
            {{ formatPrice(totalExportNetProfit, 2) }}
          </div>
          <div class="text-xs text-slate-500 mt-1">{{ translate('exportNetProfitHint') }}</div>
        </div>

        <div class="bg-slate-700/50 rounded p-3">
          <div class="text-sm text-slate-400">{{ translate('workforceDeficitCost') }}</div>
          <div class="text-2xl font-bold text-rose-300">
            {{ formatPrice(totalWorkforceDeficitCost, 2) }}
          </div>
          <div class="text-xs text-slate-500 mt-1">{{ translate('workforceDeficitHint') }}</div>
        </div>

        <div class="bg-slate-700/50 rounded p-3">
          <div class="text-sm text-slate-400">{{ translate('consumptionOverheadCost') }}</div>
          <div class="text-2xl font-bold text-amber-300">
            {{ formatPrice(totalConsumptionOverheadCost, 2) }}
          </div>
          <div class="text-xs text-slate-500 mt-1">{{ translate('consumptionOverheadHint') }}</div>
        </div>
      </div>

      <!-- Per-Base Summary -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-300">{{ translate('perBaseSummary') }}</h3>
          <div class="flex items-center gap-2 text-sm">
            <label class="flex items-center gap-2">
              <span class="text-slate-400">{{ translate('exportThresholdLabel') }}:</span>
              <input
                :value="exportThreshold"
                @input="emit('update:exportThreshold', Number(($event.target as HTMLInputElement).value))"
                type="range"
                min="0"
                max="100"
                step="5"
                class="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                :title="translate('exportThresholdHint')"
              />
              <span class="text-xs font-semibold text-purple-400 w-8 text-right">{{ exportThreshold }}%</span>
            </label>
          </div>
        </div>
        <div class="space-y-2">
          <div
            v-for="baseSummary in baseSummaries"
            :key="baseSummary.baseId"
            class="border border-slate-600 rounded bg-slate-800/50"
          >
            <div
              class="px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-slate-700/30"
              @click="toggleBase(baseSummary.baseId)"
            >
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 transition-transform flex-shrink-0"
                  :class="{ 'rotate-90': expandedBases.has(baseSummary.baseId) }"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                <span class="font-medium truncate">{{ baseSummary.baseName }}</span>
                <span class="text-sm text-slate-500 truncate">{{ getPlanetName(baseSummary.planetId) }}</span>
                <!-- Warning icon if materials running out -->
                <svg
                  v-if="baseSummary.materialsRunningOut.length > 0"
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-rose-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  title="Materials running out"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="flex items-center gap-4 flex-shrink-0">
                <div v-if="baseSummary.workforceDeficit > 0" class="text-right">
                  <div class="text-sm text-slate-400">{{ translate('housingShortfall') }}</div>
                  <div class="font-bold text-orange-300">
                    {{ formatNumber(baseSummary.workforceDeficit, 0) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Expanded Base Details -->
            <div v-if="expandedBases.has(baseSummary.baseId)" class="px-3 py-2 border-t border-slate-600">
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Export Materials (Left Column) -->
                <div>
                  <div class="text-sm font-semibold text-emerald-300 mb-2">{{ translate('exportMaterials') }}:</div>
                  <div v-if="baseSummary.exportMaterials.length > 0" class="space-y-1">
                    <!-- Header -->
                    <div class="flex items-center gap-2 text-xs text-slate-400 border-b border-slate-600 pb-1">
                      <div class="w-4"></div>
                      <span class="flex-1">Material</span>
                      <span class="text-right w-20">Balance</span>
                      <span class="text-right w-20">Value</span>
                      <span class="text-right w-20">Weight</span>
                      <span class="text-right w-14">Export %</span>
                    </div>
                    <!-- Total Summary Row -->
                    <div class="flex items-center gap-2 text-sm font-semibold bg-slate-700/50 rounded px-1 py-1">
                      <div class="w-4"></div>
                      <span class="flex-1 text-amber-300">Total</span>
                      <span class="text-right w-20"></span>
                      <span class="text-amber-300 text-xs text-right w-20">
                        {{ formatPrice(getExportTotals(baseSummary.exportMaterials).totalValue, 0) }}
                      </span>
                      <span class="text-amber-300 text-xs text-right w-20">
                        {{ formatNumber(getExportTotals(baseSummary.exportMaterials).totalWeight, 1) }}t
                      </span>
                      <span class="text-right w-14"></span>
                    </div>
                    <div
                      v-for="material in baseSummary.exportMaterials"
                      :key="material.materialId"
                      class="flex items-center gap-2 text-sm"
                    >
                      <MaterialIcon :name="getMaterialName(material.materialId)" :size="16" />
                      <span class="text-slate-300 flex-1 truncate">{{ getMaterialName(material.materialId) }}</span>
                      <span class="text-emerald-400 font-medium text-right w-20">
                        +{{ formatNumber(material.exportPerDay, 1) }}
                      </span>
                      <span class="text-slate-400 text-xs text-right w-20">
                        {{ formatPrice(material.valuePerDay, 0) }}
                      </span>
                      <span class="text-slate-500 text-xs text-right w-20">
                        {{ formatWeight(gameData, material.exportPerDay, material.materialId) }}
                      </span>
                      <span class="text-slate-500 text-xs text-right w-14">
                        {{ formatNumber(material.exportRatio, 0) }}%
                      </span>
                    </div>
                  </div>
                  <div v-else class="text-sm text-slate-500 italic">
                    {{ translate('noExportMaterials') }}
                  </div>
                </div>

                <!-- Materials Running Out (Right Column) -->
                <div>
                  <div class="text-sm font-semibold text-rose-300 mb-2">{{ translate('materialsRunningOut') }}:</div>
                  <div v-if="baseSummary.materialsRunningOut.length > 0" class="space-y-1">
                    <!-- Header -->
                    <div class="flex items-center gap-2 text-xs text-slate-400 border-b border-slate-600 pb-1">
                      <div class="w-4"></div>
                      <span class="flex-1">Material</span>
                      <span class="text-right w-20">Time Left</span>
                      <span class="text-right w-20">Stock</span>
                      <span class="text-right w-24">To Buy</span>
                    </div>
                    <!-- Total Summary Row -->
                    <div class="flex items-center gap-2 text-sm font-semibold bg-slate-700/50 rounded px-1 py-1">
                      <div class="w-4"></div>
                      <span class="flex-1 text-amber-300">Total Weight</span>
                      <span class="text-right w-20"></span>
                      <span class="text-right w-20"></span>
                      <span class="text-amber-300 text-xs text-right w-24">
                        {{ formatNumber(getRunningOutTotalWeight(baseSummary.materialsRunningOut), 1) }}t
                      </span>
                    </div>
                    <div
                      v-for="material in baseSummary.materialsRunningOut"
                      :key="material.materialId"
                      class="flex items-center gap-2 text-sm"
                    >
                      <MaterialIcon :name="getMaterialName(material.materialId)" :size="16" />
                      <span class="text-slate-300 flex-1 truncate">{{ getMaterialName(material.materialId) }}</span>
                      <span class="text-rose-400 font-medium text-right w-20">
                        {{ formatDays(material.daysUntilEmpty) }}
                      </span>
                      <span class="text-slate-500 text-xs text-right w-20">
                        {{ formatNumber(material.currentStock, 0) }}
                      </span>
                      <span class="text-slate-400 text-xs text-right w-24">
                        {{ (() => {
                          const toBuy = Math.max(0, (material.consumptionPerDay * timeframeHours / 24) - material.currentStock)
                          return `${formatNumber(toBuy, 0)} / ${formatWeight(gameData, toBuy, material.materialId)}`
                        })() }}
                      </span>
                    </div>
                  </div>
                  <div v-else class="text-sm text-slate-500 italic">
                    {{ translate('noMaterialsRunningOut') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Global Material Production/Consumption -->
      <div class="space-y-2">
        <div
          class="flex items-center justify-between cursor-pointer hover:bg-slate-700/30 rounded px-2 py-1"
          @click="expandedMaterials = !expandedMaterials"
        >
          <h3 class="text-lg font-semibold text-slate-300 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 transition-transform"
              :class="{ 'rotate-90': expandedMaterials }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            {{ translate('globalMaterialSummary') }}
          </h3>
          <span class="text-sm text-slate-500">{{ globalMaterials.length }} {{ translate('materials') }}</span>
        </div>

        <div v-if="expandedMaterials" class="space-y-2">
          <!-- Toggle for per-base breakdown -->
          <div class="flex items-center gap-2 text-sm">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="showPerBaseBreakdown" class="rounded" />
              <span class="text-slate-400">{{ translate('showPerBaseBreakdown') }}</span>
            </label>
          </div>

          <!-- Materials Tables: Two column layout -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Regular Materials (Left) -->
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="text-xs text-slate-400 border-b border-slate-700">
                  <tr>
                    <th class="text-left py-2 px-2">{{ translate('material') }}</th>
                    <th class="text-right py-2 px-2">{{ translate('production') }}</th>
                    <th class="text-right py-2 px-2">{{ translate('consumption') }}</th>
                    <th class="text-right py-2 px-2">{{ translate('balance') }} / {{ translate('value') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="material in regularMaterials" :key="material.materialId">
                    <!-- Main material row -->
                    <tr class="border-b border-slate-800 hover:bg-slate-800/50">
                      <td class="py-1 px-2">
                        <div class="flex items-center gap-2">
                          <MaterialIcon :name="getMaterialName(material.materialId)" :size="16" />
                          <span class="text-slate-300 truncate max-w-xs">{{ getMaterialName(material.materialId) }}</span>
                        </div>
                      </td>
                      <td class="text-right py-1 px-2">
                        <div class="text-emerald-400">{{ formatNumber(material.totalProduction, 1) }}</div>
                        <div class="text-xs text-slate-500">{{ formatPrice(material.perBaseBreakdown.reduce((sum: number, b) => sum + b.productionValue, 0), 0) }}</div>
                      </td>
                      <td class="text-right py-1 px-2">
                        <div class="text-rose-400">{{ formatNumber(material.totalConsumption, 1) }}</div>
                        <div class="text-xs text-slate-500">{{ formatPrice(material.perBaseBreakdown.reduce((sum: number, b) => sum + b.consumptionValue, 0), 0) }}</div>
                      </td>
                      <td class="text-right py-1 px-2">
                        <div class="font-medium" :class="material.netBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                          {{ material.netBalance >= 0 ? '+' : '' }}{{ formatNumber(material.netBalance, 1) }} / {{ formatPrice(material.totalValue, 0) }}
                        </div>
                      </td>
                    </tr>

                    <!-- Per-base breakdown rows (if enabled) -->
                    <template v-if="showPerBaseBreakdown">
                      <tr
                        v-for="base in material.perBaseBreakdown"
                        :key="`${material.materialId}-${base.baseId}`"
                        class="text-xs text-slate-500 bg-slate-800/30"
                      >
                        <td class="py-0.5 px-2 pl-8">
                          <span class="truncate max-w-xs">{{ base.baseName }}</span>
                        </td>
                        <td class="text-right py-0.5 px-2">
                          <span v-if="base.production > 0" class="text-emerald-400">{{ formatNumber(base.production, 1) }}</span>
                          <span v-else>—</span>
                        </td>
                        <td class="text-right py-0.5 px-2">
                          <span v-if="base.consumption > 0" class="text-rose-400">{{ formatNumber(base.consumption, 1) }}</span>
                          <span v-else>—</span>
                        </td>
                        <td class="text-right py-0.5 px-2">
                          <span v-if="base.production > 0 || base.consumption > 0">
                            {{ formatNumber(base.production - base.consumption, 1) }} / {{ formatPrice(base.productionValue - base.consumptionValue, 0) }}
                          </span>
                          <span v-else>—</span>
                        </td>
                      </tr>
                    </template>
                  </template>
                </tbody>
              </table>
            </div>

            <!-- Worker Consumables (Right) -->
            <div class="overflow-x-auto">
              <div class="text-sm font-semibold text-slate-300 mb-2">{{ translate('workerConsumption') }}</div>
              <table class="w-full text-sm">
                <thead class="text-xs text-slate-400 border-b border-slate-700">
                  <tr>
                    <th class="text-left py-2 px-2">{{ translate('material') }}</th>
                    <th class="text-right py-2 px-2">{{ translate('production') }}</th>
                    <th class="text-right py-2 px-2">{{ translate('consumption') }}</th>
                    <th class="text-right py-2 px-2">{{ translate('balance') }} / {{ translate('value') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="material in workerConsumableMaterials" :key="material.materialId">
                    <!-- Main material row -->
                    <tr class="border-b border-slate-800 hover:bg-slate-800/50">
                      <td class="py-1 px-2">
                        <div class="flex items-center gap-2">
                          <MaterialIcon :name="getMaterialName(material.materialId)" :size="16" />
                          <span class="text-slate-300 truncate max-w-xs">{{ getMaterialName(material.materialId) }}</span>
                        </div>
                      </td>
                      <td class="text-right py-1 px-2">
                        <div class="text-emerald-400">{{ formatNumber(material.totalProduction, 1) }}</div>
                        <div class="text-xs text-slate-500">{{ formatPrice(material.perBaseBreakdown.reduce((sum: number, b) => sum + b.productionValue, 0), 0) }}</div>
                      </td>
                      <td class="text-right py-1 px-2">
                        <div class="text-rose-400">{{ formatNumber(material.totalConsumption, 1) }}</div>
                        <div class="text-xs text-slate-500">{{ formatPrice(material.perBaseBreakdown.reduce((sum: number, b) => sum + b.consumptionValue, 0), 0) }}</div>
                      </td>
                      <td class="text-right py-1 px-2">
                        <div class="font-medium" :class="material.netBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                          {{ material.netBalance >= 0 ? '+' : '' }}{{ formatNumber(material.netBalance, 1) }} / {{ formatPrice(material.totalValue, 0) }}
                        </div>
                      </td>
                    </tr>

                    <!-- Per-base breakdown rows (if enabled) -->
                    <template v-if="showPerBaseBreakdown">
                      <tr
                        v-for="base in material.perBaseBreakdown"
                        :key="`${material.materialId}-${base.baseId}`"
                        class="text-xs text-slate-500 bg-slate-800/30"
                      >
                        <td class="py-0.5 px-2 pl-8">
                          <span class="truncate max-w-xs">{{ base.baseName }}</span>
                        </td>
                        <td class="text-right py-0.5 px-2">
                          <span v-if="base.production > 0" class="text-emerald-400">{{ formatNumber(base.production, 1) }}</span>
                          <span v-else>—</span>
                        </td>
                        <td class="text-right py-0.5 px-2">
                          <span v-if="base.consumption > 0" class="text-rose-400">{{ formatNumber(base.consumption, 1) }}</span>
                          <span v-else>—</span>
                        </td>
                        <td class="text-right py-0.5 px-2">
                          <span v-if="base.production > 0 || base.consumption > 0">
                            {{ formatNumber(base.production - base.consumption, 1) }} / {{ formatPrice(base.productionValue - base.consumptionValue, 0) }}
                          </span>
                          <span v-else>—</span>
                        </td>
                      </tr>
                    </template>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </details>
</template>
