<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePlayerBases } from '@/v2/services/playerBases'
import { useGlobalSummary } from '@/v2/composables/useGlobalSummary'
import { useMaterialPricing } from '@/v2/services/gamedata/prices'
import { usePlayerTechnology } from '@/v2/services/playerTechnology'
import { useWorldData } from '@/v2/services/worldData'
import { useMarketAnalysis } from '@/v2/composables/useMarketAnalysis'
import { getExportThresholdRef } from '@/v2/services/config/exportThreshold'
import { getMaterialNameById } from '@/v2/services/gamedata/gameDataRepository'
import { computeBaseReport } from '@/v2/services/production/engine'
import { useTimeframe } from '@/v2/services/timeframe'
import type { GameData, GdIndex } from '@/v2/services/gamedata/types'
import MaterialIcon from '@/v2/components/MaterialIcon.vue'
import { getWorkerConsumableMaterialIds, getOptionalWorkerConsumableMaterialIds } from '@/v2/utils/workerConsumables'
import { formatPrice, formatNumber } from '@/v2/utils/formatNumber'

const props = defineProps<{
  gameData: GameData
  index: GdIndex
}>()

// Use shared timeframe
const { timeframeHours } = useTimeframe()

// Recipe details toggle and state
const showRecipeDetails = ref<boolean>(false)
const expandedMaterials = ref<Set<number>>(new Set())
const RECIPE_DETAILS_STORAGE_KEY = 'gt:v2:matsBalance:recipeDetails'
const EXPANDED_MATERIALS_STORAGE_KEY = 'gt:v2:matsBalance:expandedMaterials'

const loadRecipeDetailsState = (): boolean => {
  try {
    const stored = localStorage.getItem(RECIPE_DETAILS_STORAGE_KEY)
    return stored === 'true'
  } catch {
    return false
  }
}

const loadExpandedMaterialsState = (): Set<number> => {
  try {
    const stored = localStorage.getItem(EXPANDED_MATERIALS_STORAGE_KEY)
    if (stored) {
      return new Set(JSON.parse(stored))
    }
  } catch {
    // Ignore errors
  }
  return new Set()
}

showRecipeDetails.value = loadRecipeDetailsState()
expandedMaterials.value = loadExpandedMaterialsState()

watch(showRecipeDetails, (newValue) => {
  try {
    localStorage.setItem(RECIPE_DETAILS_STORAGE_KEY, String(newValue))
  } catch {
    // Ignore localStorage errors
  }
})

watch(expandedMaterials, (newValue) => {
  try {
    localStorage.setItem(EXPANDED_MATERIALS_STORAGE_KEY, JSON.stringify([...newValue]))
  } catch {
    // Ignore localStorage errors
  }
}, { deep: true })

const toggleMaterialExpansion = (materialId: number) => {
  if (expandedMaterials.value.has(materialId)) {
    expandedMaterials.value.delete(materialId)
  } else {
    expandedMaterials.value.add(materialId)
  }
  expandedMaterials.value = new Set(expandedMaterials.value)
}

const expandAllMaterials = () => {
  const allMaterialIds = [...regularMaterials.value, ...workerConsumableMaterials.value].map(m => m.materialId)
  expandedMaterials.value = new Set(allMaterialIds)
}

const collapseAllMaterials = () => {
  expandedMaterials.value = new Set()
}

const { state: basesState } = usePlayerBases(props.gameData)
const bases = computed(() => basesState.value.bases)

const { current: worldCurrent } = useWorldData()
const warehouseStocks = computed(() => worldCurrent.value.warehouseStocks)

const { priceResolver } = useMaterialPricing(props.gameData)
const { state: technologyState } = usePlayerTechnology()
const exportThreshold = getExportThresholdRef()

const { opportunities: marketOpportunities } = useMarketAnalysis()

// Calculate global workforce burden
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

    report.workforceSummary.forEach((wf: { required: number }) => {
      totalWorkforce += wf.required
    })
  })
  return totalWorkforce
})

const technologyLevels = computed(() => technologyState.value.levels)
const startingBonus = computed(() => technologyState.value.startingBonus)

const workerConsumableIds = computed(() => {
  return getWorkerConsumableMaterialIds(props.gameData)
})

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

// Split materials into regular and worker consumables
const regularMaterials = computed(() => {
  const materials = summary.globalMaterials.value.filter(m => !workerConsumableIds.value.has(m.materialId))
  return materials.sort((a, b) => {
    const nameA = getMaterialNameById(a.materialId).toLowerCase()
    const nameB = getMaterialNameById(b.materialId).toLowerCase()
    return nameA.localeCompare(nameB)
  })
})

const workerConsumableMaterials = computed(() => {
  const materials = summary.globalMaterials.value.filter(m => workerConsumableIds.value.has(m.materialId))
  return materials.sort((a, b) => {
    const nameA = getMaterialNameById(a.materialId).toLowerCase()
    const nameB = getMaterialNameById(b.materialId).toLowerCase()
    return nameA.localeCompare(nameB)
  })
})

const optionalWorkerConsumableIds = computed(() => {
  return getOptionalWorkerConsumableMaterialIds(props.gameData)
})

const isOptionalWorkerConsumable = (materialId: number): boolean => {
  return optionalWorkerConsumableIds.value.has(materialId)
}

// Get base-level details for a material
const getMaterialBaseDetails = (materialId: number) => {
  const baseDetails: Array<{
    baseId: string
    baseName: string
    production: number
    consumption: number
    productionValue: number
    consumptionValue: number
  }> = []

  const timeframeFactor = timeframeHours.value / 24

  summary.baseReports.value.forEach(({ base, report }) => {
    const baseName = base.name || `Base ${base.id}`

    let production = 0
    let consumption = 0

    // Sum up production from recipes
    report.recipes.forEach((recipe) => {
      if (recipe.outputMaterialId === materialId) {
        production += recipe.outputPerDay
      }

      // Sum up consumption from recipe inputs
      recipe.inputsPerDay.forEach((input) => {
        if (input.materialId === materialId) {
          consumption += input.amount
        }
      })
    })

    // Add worker consumption
    report.workers.forEach((worker) => {
      if (worker.materialId === materialId) {
        consumption += worker.consumptionPerDay
      }
    })

    if (production > 0 || consumption > 0) {
      const price = priceResolver.value(materialId) ?? 0
      // Apply timeframe factor
      const adjustedProduction = production * timeframeFactor
      const adjustedConsumption = consumption * timeframeFactor

      baseDetails.push({
        baseId: base.id,
        baseName,
        production: adjustedProduction,
        consumption: adjustedConsumption,
        productionValue: adjustedProduction * price,
        consumptionValue: adjustedConsumption * price,
      })
    }
  })

  return baseDetails.length > 0 ? baseDetails : null
}

// Get recipe-level details for a specific base and material
const getMaterialRecipeDetails = (materialId: number, baseId: string) => {
  const details: Array<{
    recipeName: string
    production: number
    consumption: number
    productionValue: number
    consumptionValue: number
  }> = []

  const baseReport = summary.baseReports.value.find(({ base }) => base.id === baseId)
  if (!baseReport) return null

  const { report } = baseReport
  const price = priceResolver.value(materialId) ?? 0
  const timeframeFactor = timeframeHours.value / 24

  // Track recipes we've seen to combine production and consumption
  const recipeMap = new Map<number, { recipeName: string; production: number; consumption: number }>()

  // Check production recipes (outputs)
  report.recipes.forEach((recipe) => {
    if (recipe.outputMaterialId === materialId) {
      const recipeData = props.index.recipeById.get(recipe.recipeId)
      const recipeName = recipeData?.output.name || `Recipe ${recipe.recipeId}`
      const production = recipe.outputPerDay * timeframeFactor

      if (!recipeMap.has(recipe.recipeId)) {
        recipeMap.set(recipe.recipeId, { recipeName, production, consumption: 0 })
      } else {
        recipeMap.get(recipe.recipeId)!.production += production
      }
    }

    // Check consumption recipes (inputs)
    recipe.inputsPerDay.forEach((input) => {
      if (input.materialId === materialId) {
        const recipeData = props.index.recipeById.get(recipe.recipeId)
        const recipeName = recipeData?.output.name || `Recipe ${recipe.recipeId}`
        const consumption = input.amount * timeframeFactor

        if (!recipeMap.has(recipe.recipeId)) {
          recipeMap.set(recipe.recipeId, { recipeName, production: 0, consumption })
        } else {
          recipeMap.get(recipe.recipeId)!.consumption += consumption
        }
      }
    })
  })

  // Add recipes to details
  recipeMap.forEach((data) => {
    details.push({
      recipeName: data.recipeName,
      production: data.production,
      consumption: data.consumption,
      productionValue: data.production * price,
      consumptionValue: data.consumption * price,
    })
  })

  // Check worker consumption
  report.workers.forEach((worker) => {
    if (worker.materialId === materialId) {
      const consumption = worker.consumptionPerDay * timeframeFactor
      details.push({
        recipeName: 'Workers',
        production: 0,
        consumption,
        productionValue: 0,
        consumptionValue: consumption * price,
      })
    }
  })

  return details.length > 0 ? details : null
}
</script>

<template>
  <div class="space-y-6 pb-16">
    <!-- Controls for Recipe Details -->
    <div class="flex flex-wrap gap-3">
      <button
        @click="showRecipeDetails = !showRecipeDetails"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        :class="showRecipeDetails
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
      >
        {{ showRecipeDetails ? 'Hide recipe details' : 'Show recipe details' }}
      </button>

      <template v-if="showRecipeDetails">
        <button
          @click="expandAllMaterials"
          class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
        >
          Expand all
        </button>
        <button
          @click="collapseAllMaterials"
          class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
        >
          Collapse all
        </button>
      </template>

      <!-- Timeframe Control -->
      <div class="flex items-center gap-4 pl-5">
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

    <!-- Materials Tables: Two column layout -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Regular Materials (Left) -->
      <div class="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-700">
          <h2 class="text-lg font-semibold text-slate-100">
            Regular Materials
          </h2>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-750">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Material
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Production
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Consumption
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Balance / Value
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700">
              <template v-for="material in regularMaterials" :key="material.materialId">
                <!-- Main Material Row -->
                <tr
                  class="transition-colors border-b border-slate-700"
                  :class="{
                    'cursor-pointer': showRecipeDetails,
                    'bg-slate-800/80': !expandedMaterials.has(material.materialId),
                    'bg-blue-900/20 hover:bg-blue-900/30': expandedMaterials.has(material.materialId),
                    'hover:bg-slate-750': !expandedMaterials.has(material.materialId)
                  }"
                  @click="showRecipeDetails && toggleMaterialExpansion(material.materialId)"
                >
                  <td class="px-4 py-2">
                    <div class="flex items-center gap-2">
                      <button
                        v-if="showRecipeDetails"
                        class="text-slate-400 hover:text-slate-200 transition-colors"
                        @click.stop="toggleMaterialExpansion(material.materialId)"
                      >
                        <span v-if="expandedMaterials.has(material.materialId)">▼</span>
                        <span v-else>▶</span>
                      </button>
                      <MaterialIcon :name="getMaterialNameById(material.materialId)" :size="20" />
                      <span class="text-slate-200 font-medium">{{ getMaterialNameById(material.materialId) }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-2 text-right">
                    <div class="text-emerald-400">{{ formatNumber(material.totalProduction, 1) }}</div>
                    <div class="text-xs text-slate-500">{{ formatPrice(material.totalProduction * (priceResolver(material.materialId) ?? 0), 0) }}</div>
                  </td>
                  <td class="px-4 py-2 text-right">
                    <div class="text-rose-400">{{ formatNumber(material.totalConsumption, 1) }}</div>
                    <div class="text-xs text-slate-500">{{ formatPrice(material.totalConsumption * (priceResolver(material.materialId) ?? 0), 0) }}</div>
                  </td>
                  <td class="px-4 py-2 text-right">
                    <div
                      class="font-medium"
                      :class="material.netBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'"
                    >
                      {{ material.netBalance >= 0 ? '+' : '' }}{{ formatNumber(material.netBalance, 1) }} / {{ formatPrice(material.netBalance * (priceResolver(material.materialId) ?? 0), 0) }}
                    </div>
                  </td>
                </tr>

                <!-- Base Details Rows (when expanded) -->
                <template v-if="showRecipeDetails && expandedMaterials.has(material.materialId)">
                  <template v-for="baseDetail in getMaterialBaseDetails(material.materialId)" :key="`${material.materialId}-base-${baseDetail.baseId}`">
                    <!-- Base Summary Row -->
                    <tr class="bg-slate-750/70 border-b border-slate-700/50 bg-slate-700/50 transition-colors">
                      <td class="px-4 py-1 pl-10">
                        <span class="text-sm font-medium text-slate-300">{{ baseDetail.baseName }}</span>
                      </td>
                      <td class="px-4 py-1 text-right">
                        <div class="text-sm text-emerald-400">{{ formatNumber(baseDetail.production, 1) }}</div>
                        <div class="text-xs text-slate-500">{{ formatPrice(baseDetail.productionValue, 0) }}</div>
                      </td>
                      <td class="px-4 py-1 text-right">
                        <div class="text-sm text-rose-400">{{ formatNumber(baseDetail.consumption, 1) }}</div>
                        <div class="text-xs text-slate-500">{{ formatPrice(baseDetail.consumptionValue, 0) }}</div>
                      </td>
                      <td class="px-4 py-1 text-right">
                        <div
                          class="text-sm font-medium"
                          :class="(baseDetail.production - baseDetail.consumption) >= 0 ? 'text-emerald-300' : 'text-rose-300'"
                        >
                          {{ formatNumber(baseDetail.production - baseDetail.consumption, 1) }} / {{ formatPrice(baseDetail.productionValue - baseDetail.consumptionValue, 0) }}
                        </div>
                      </td>
                    </tr>

                    <!-- Recipe Details for this Base -->
                    <tr
                      v-for="(recipe, idx) in getMaterialRecipeDetails(material.materialId, baseDetail.baseId)"
                      :key="`${material.materialId}-${baseDetail.baseId}-recipe-${idx}`"
                      class="bg-slate-800/40 hover:bg-slate-800/60 transition-colors text-xs"
                    >
                      <td class="px-4 py-1 pl-12 text-slate-500">
                        {{ recipe.recipeName }}
                      </td>
                      <td class="px-4 py-1 text-right">
                        <div v-if="recipe.production > 0" class="text-emerald-400">{{ formatNumber(recipe.production, 1) }}</div>
                        <div v-else class="text-slate-600">—</div>
                        <div v-if="recipe.productionValue > 0" class="text-slate-500">{{ formatPrice(recipe.productionValue, 0) }}</div>
                      </td>
                      <td class="px-4 py-1 text-right">
                        <div v-if="recipe.consumption > 0" class="text-rose-400">{{ formatNumber(recipe.consumption, 1) }}</div>
                        <div v-else class="text-slate-600">—</div>
                        <div v-if="recipe.consumptionValue > 0" class="text-slate-500">{{ formatPrice(recipe.consumptionValue, 0) }}</div>
                      </td>
                      <td class="px-4 py-1 text-right">
                        <div
                          class="font-medium"
                          :class="(recipe.production - recipe.consumption) >= 0 ? 'text-emerald-300' : 'text-rose-300'"
                        >
                          {{ formatNumber(recipe.production - recipe.consumption, 1) }} / {{ formatPrice(recipe.productionValue - recipe.consumptionValue, 0) }}
                        </div>
                      </td>
                    </tr>
                  </template>
                </template>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Worker Consumables (Right) -->
      <div class="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-700">
          <h2 class="text-lg font-semibold text-slate-100">
            Worker Consumables
          </h2>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-750">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Material
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Production
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Consumption
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Balance / Value
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700">
              <template v-for="material in workerConsumableMaterials" :key="material.materialId">
                <!-- Main Material Row -->
                <tr
                  class="transition-colors border-b border-slate-700"
                  :class="{
                    'cursor-pointer': showRecipeDetails,
                    'bg-slate-800/80': !expandedMaterials.has(material.materialId),
                    'bg-blue-900/20 hover:bg-blue-900/30': expandedMaterials.has(material.materialId),
                    'hover:bg-slate-750': !expandedMaterials.has(material.materialId)
                  }"
                  @click="showRecipeDetails && toggleMaterialExpansion(material.materialId)"
                >
                  <td class="px-4 py-2">
                    <div class="flex items-center gap-2">
                      <button
                        v-if="showRecipeDetails"
                        class="text-slate-400 hover:text-slate-200 transition-colors"
                        @click.stop="toggleMaterialExpansion(material.materialId)"
                      >
                        <span v-if="expandedMaterials.has(material.materialId)">▼</span>
                        <span v-else>▶</span>
                      </button>
                      <MaterialIcon :name="getMaterialNameById(material.materialId)" :size="20" />
                      <span class="text-slate-200 font-medium">
                        {{ getMaterialNameById(material.materialId) }}
                        <span v-if="isOptionalWorkerConsumable(material.materialId)" class="text-slate-500 text-sm ml-1">
                          (optional)
                        </span>
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-2 text-right">
                    <div class="text-emerald-400">{{ formatNumber(material.totalProduction, 1) }}</div>
                    <div class="text-xs text-slate-500">{{ formatPrice(material.totalProduction * (priceResolver(material.materialId) ?? 0), 0) }}</div>
                  </td>
                  <td class="px-4 py-2 text-right">
                    <div class="text-rose-400">{{ formatNumber(material.totalConsumption, 1) }}</div>
                    <div class="text-xs text-slate-500">{{ formatPrice(material.totalConsumption * (priceResolver(material.materialId) ?? 0), 0) }}</div>
                  </td>
                  <td class="px-4 py-2 text-right">
                    <div
                      class="font-medium"
                      :class="material.netBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'"
                    >
                      {{ material.netBalance >= 0 ? '+' : '' }}{{ formatNumber(material.netBalance, 1) }} / {{ formatPrice(material.netBalance * (priceResolver(material.materialId) ?? 0), 0) }}
                    </div>
                  </td>
                </tr>

                <!-- Base Details Rows (when expanded) -->
                <template v-if="showRecipeDetails && expandedMaterials.has(material.materialId)">
                  <template v-for="baseDetail in getMaterialBaseDetails(material.materialId)" :key="`${material.materialId}-base-${baseDetail.baseId}`">
                    <!-- Base Summary Row -->
                    <tr class="bg-slate-750/70 border-b border-slate-700/50 bg-slate-700/50 transition-colors">
                      <td class="px-4 py-1 pl-10">
                        <span class="text-sm font-medium text-slate-300">{{ baseDetail.baseName }}</span>
                      </td>
                      <td class="px-4 py-1 text-right">
                        <div class="text-sm text-emerald-400">{{ formatNumber(baseDetail.production, 1) }}</div>
                        <div class="text-xs text-slate-500">{{ formatPrice(baseDetail.productionValue, 0) }}</div>
                      </td>
                      <td class="px-4 py-1 text-right">
                        <div class="text-sm text-rose-400">{{ formatNumber(baseDetail.consumption, 1) }}</div>
                        <div class="text-xs text-slate-500">{{ formatPrice(baseDetail.consumptionValue, 0) }}</div>
                      </td>
                      <td class="px-4 py-1 text-right">
                        <div
                          class="text-sm font-medium"
                          :class="(baseDetail.production - baseDetail.consumption) >= 0 ? 'text-emerald-300' : 'text-rose-300'"
                        >
                          {{ formatNumber(baseDetail.production - baseDetail.consumption, 1) }} / {{ formatPrice(baseDetail.productionValue - baseDetail.consumptionValue, 0) }}
                        </div>
                      </td>
                    </tr>

                    <!-- Recipe Details for this Base -->
                    <tr
                      v-for="(recipe, idx) in getMaterialRecipeDetails(material.materialId, baseDetail.baseId)"
                      :key="`${material.materialId}-${baseDetail.baseId}-recipe-${idx}`"
                      class="bg-slate-800/40 hover:bg-slate-800/60 transition-colors text-xs"
                    >
                      <td class="px-4 py-1 pl-12 text-slate-500">
                        {{ recipe.recipeName }}
                      </td>
                      <td class="px-4 py-1 text-right">
                        <div v-if="recipe.production > 0" class="text-emerald-400">{{ formatNumber(recipe.production, 1) }}</div>
                        <div v-else class="text-slate-600">—</div>
                        <div v-if="recipe.productionValue > 0" class="text-slate-500">{{ formatPrice(recipe.productionValue, 0) }}</div>
                      </td>
                      <td class="px-4 py-1 text-right">
                        <div v-if="recipe.consumption > 0" class="text-rose-400">{{ formatNumber(recipe.consumption, 1) }}</div>
                        <div v-else class="text-slate-600">—</div>
                        <div v-if="recipe.consumptionValue > 0" class="text-slate-500">{{ formatPrice(recipe.consumptionValue, 0) }}</div>
                      </td>
                      <td class="px-4 py-1 text-right">
                        <div
                          class="font-medium"
                          :class="(recipe.production - recipe.consumption) >= 0 ? 'text-emerald-300' : 'text-rose-300'"
                        >
                          {{ formatNumber(recipe.production - recipe.consumption, 1) }} / {{ formatPrice(recipe.productionValue - recipe.consumptionValue, 0) }}
                        </div>
                      </td>
                    </tr>
                  </template>
                </template>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
