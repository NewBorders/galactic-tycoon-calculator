<template>
  <div class="min-h-screen bg-gray-900 text-gray-100 p-6">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-blue-400">Production Calculator</h1>
          <span class="text-xs text-gray-500">v1.0.6</span>
        </div>
        <div class="flex gap-2">
          <button
            @click="showSettings = !showSettings"
            class="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            <Settings :size="20" />
            {{ showSettings ? 'Hide' : 'Show' }} Settings
          </button>
        </div>
      </div>

      <GeneralConfig
        v-if="showSettings"
        :game-speed="gameSpeed"
        :technology-levels="technologyLevels"
        @update:game-speed="gameSpeed = $event"
        @update:technology-levels="technologyLevels = $event"
      />

      <!-- Accordion: Prices & Stock -->
      <div class="mb-6 bg-gray-800 rounded-lg overflow-hidden">
        <button
          @click="showPrices = !showPrices"
          class="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-700 transition-colors"
        >
          <div class="flex items-center gap-3">
            <Package :size="24" class="text-blue-400" />
            <h2 class="text-xl font-semibold text-blue-400">Prices & Stock</h2>
          </div>
          <svg
            :class="['w-5 h-5 text-gray-400 transition-transform', showPrices ? 'rotate-180' : '']"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        <div v-if="showPrices" class="border-t border-gray-700">
          <PricesConfig
            :show="true"
            :materials="GAME_DATA.materials"
            :worker-consumption="GAME_DATA.workerConsumption"
            :prices="prices"
            :current-prices="currentPrices"
            :avg-prices="avgPrices"
            :use-price-type="usePriceType"
            :stock="stock"
            :locked-prices="lockedPrices"
            @update:prices="prices = $event"
            @update:current-prices="currentPrices = $event"
            @update:avg-prices="avgPrices = $event"
            @update:use-price-type="usePriceType = $event"
            @update:stock="stock = $event"
            @update:locked-prices="lockedPrices = $event"
          />
        </div>
      </div>

      <!-- Accordion: Production Buildings -->
      <div class="mb-6 bg-gray-800 rounded-lg overflow-hidden">
        <button
          @click="showBuildings = !showBuildings"
          class="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-700 transition-colors"
        >
          <div class="flex items-center gap-3">
            <svg
              class="w-6 h-6 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h2 class="text-xl font-semibold text-green-400">Production Buildings</h2>
          </div>
          <svg
            :class="[
              'w-5 h-5 text-gray-400 transition-transform',
              showBuildings ? 'rotate-180' : '',
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        <div v-if="showBuildings" class="border-t border-gray-700">
          <BuildingsList
            :buildings="buildings"
            :game-data="GAME_DATA"
            :technology-levels="technologyLevels"
            :productivity-by-tier="productivityByTier"
            @add-building="addBuilding"
            @remove-building="removeBuilding"
            @add-recipe="addRecipe"
            @remove-recipe="removeRecipe"
            @update-building="updateBuilding"
          />
        </div>
      </div>

      <BuildingTypeModal
        :show="showBuildingTypeModal"
        :buildings="GAME_DATA.buildings"
        @confirm="confirmAddBuilding"
        @cancel="cancelAddBuilding"
      />

      <EconomicSummary
        v-if="buildings.length > 0"
        :total-costs="economicCalculations.totalCosts"
        :total-revenue="economicCalculations.totalRevenue"
        :total-profit="economicCalculations.totalProfit"
        :has-prices="hasPrices"
      />

      <div v-if="buildings.length > 0" class="grid md:grid-cols-2 gap-6">
        <WorkerConsumption
          :worker-consumption="calculations.workerConsumption"
          :total-workers="calculations.totalWorkers"
          :total-workers-by-tier="calculations.totalWorkersByTier"
          :stock="stock"
          :prices="prices"
          :optional-active="optionalConsumables"
          @update:optional-active="optionalConsumables = $event"
        />

        <NetBalance
          :net-balance="calculations.netBalance"
          :materials="GAME_DATA.materials"
          :stock="stock"
          :prices="prices"
        />

        <ConsumptionSummary
          :total-inputs="calculations.totalInputs"
          :materials="GAME_DATA.materials"
          :stock="stock"
          :time-to-empty="timeToEmpty"
        />

        <ProductionSummary
          :total-outputs="calculations.totalOutputs"
          :materials="GAME_DATA.materials"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Settings, Package } from 'lucide-vue-next'
import GeneralConfig from './components/GeneralConfig.vue'
import PricesConfig from './components/PricesConfig.vue'
import BuildingTypeModal from './components/BuildingTypeModal.vue'
import BuildingsList from './components/BuildingsList.vue'
import ConsumptionSummary from './components/ConsumptionSummary.vue'
import ProductionSummary from './components/ProductionSummary.vue'
import WorkerConsumption from './components/WorkerConsumption.vue'
import NetBalance from './components/NetBalance.vue'
import EconomicSummary from './components/EconomicSummary.vue'
import { GAME_DATA } from './data'
import { WORKER_CONFIG } from './config/constants'
import { loadData, saveData } from './utils/storage/localStorageManager'
import { useCalculations } from './composables/useCalculations'
import type { BuildingInstance, SavedData, IndustryType } from './types'

const buildings = ref<BuildingInstance[]>([])
const prices = ref<Record<string, number>>({})
const currentPrices = ref<Record<string, number>>({})
const avgPrices = ref<Record<string, number>>({})
const usePriceType = ref<'current' | 'avg'>('current')
const stock = ref<Record<string, number>>({})
const lockedPrices = ref<Record<string, boolean>>({})
const showPrices = ref(false)
const showBuildings = ref(true) // Abierto por defecto
const showSettings = ref(false)
const showBuildingTypeModal = ref(false)
const productivityByTier = computed<[number, number, number, number]>(() => {
  // Calcular productividad para cada tier basado en sus consumibles opcionales activos
  const tier1Active = [...WORKER_CONFIG.TIER1_OPTIONAL].filter(
    (r) => optionalConsumables.value[r],
  ).length
  const tier2Active = [...WORKER_CONFIG.TIER2_OPTIONAL].filter(
    (r) => optionalConsumables.value[r],
  ).length
  const tier3Active = [...WORKER_CONFIG.TIER3_OPTIONAL].filter(
    (r) => optionalConsumables.value[r],
  ).length
  const tier4Active = [...WORKER_CONFIG.TIER4_OPTIONAL].filter(
    (r) => optionalConsumables.value[r],
  ).length

  return [
    WORKER_CONFIG.BASE_PRODUCTIVITY + tier1Active * WORKER_CONFIG.PRODUCTIVITY_BONUS_PER_OPTIONAL,
    WORKER_CONFIG.BASE_PRODUCTIVITY + tier2Active * WORKER_CONFIG.PRODUCTIVITY_BONUS_PER_OPTIONAL,
    WORKER_CONFIG.BASE_PRODUCTIVITY + tier3Active * WORKER_CONFIG.PRODUCTIVITY_BONUS_PER_OPTIONAL,
    WORKER_CONFIG.BASE_PRODUCTIVITY + tier4Active * WORKER_CONFIG.PRODUCTIVITY_BONUS_PER_OPTIONAL,
  ]
})
const gameSpeed = ref(4)
const optionalConsumables = ref<Record<string, boolean>>({
  [WORKER_CONFIG.OPTIONAL_CONSUMABLES[0]]: false,
  [WORKER_CONFIG.OPTIONAL_CONSUMABLES[1]]: false,
  [WORKER_CONFIG.OPTIONAL_CONSUMABLES[2]]: false,
})
const technologyLevels = ref<Record<IndustryType, number>>({
  Agriculture: 0,
  Chemistry: 0,
  Construction: 0,
  Electronics: 0,
  'Food Production': 0,
  Manufacturing: 0,
  Metallurgy: 0,
  'Resource Extraction': 0,
  Residential: 0,
  Science: 0,
})

// Calculations
const { calculations } = useCalculations(
  buildings,
  GAME_DATA,
  productivityByTier,
  gameSpeed,
  technologyLevels,
)

const timeToEmpty = computed(() => {
  const times: Record<string, number> = {}
  Object.entries(calculations.value.netBalance).forEach(([material, dailyBalance]) => {
    const currentStock = stock.value[material] || 0
    if (dailyBalance < 0 && currentStock > 0) {
      times[material] = currentStock / Math.abs(dailyBalance)
    }
  })
  return times
})

const economicCalculations = computed(() => {
  let totalCosts = 0

  // 1. Cost of ACTIVE worker consumables (essentials + optionals that are active)
  Object.entries(calculations.value.workerConsumption).forEach(([resource, amount]) => {
    if (amount === 0) return

    const price = prices.value[resource] || 0

    // Check if this resource is essential for ANY tier that we have workers in
    let isEssentialForActiveTier = false

    // Tier 1 (Workers)
    if (
      calculations.value.totalWorkersByTier[0] > 0 &&
      WORKER_CONFIG.TIER1_ESSENTIAL.includes(resource as any)
    ) {
      isEssentialForActiveTier = true
    }
    // Tier 2 (Technicians)
    if (
      calculations.value.totalWorkersByTier[1] > 0 &&
      WORKER_CONFIG.TIER2_ESSENTIAL.includes(resource as any)
    ) {
      isEssentialForActiveTier = true
    }
    // Tier 3 (Engineers)
    if (
      calculations.value.totalWorkersByTier[2] > 0 &&
      WORKER_CONFIG.TIER3_ESSENTIAL.includes(resource as any)
    ) {
      isEssentialForActiveTier = true
    }
    // Tier 4 (Scientists)
    if (
      calculations.value.totalWorkersByTier[3] > 0 &&
      WORKER_CONFIG.TIER4_ESSENTIAL.includes(resource as any)
    ) {
      isEssentialForActiveTier = true
    }

    const isOptionalActive = optionalConsumables.value[resource] === true

    if (isEssentialForActiveTier || isOptionalActive) {
      totalCosts += amount * price
    }
  })

  // 2. Cost of production materials with negative balance (consuming more than producing)
  Object.entries(calculations.value.netBalance).forEach(([material, dailyBalance]) => {
    if (dailyBalance < 0) {
      const price = prices.value[material] || 0
      const dailyCost = Math.abs(dailyBalance) * price
      totalCosts += dailyCost
    }
  })

  // Total Revenue = Revenue from materials we can SELL (positive net balance)
  let totalRevenue = 0

  Object.entries(calculations.value.netBalance).forEach(([material, dailyBalance]) => {
    if (dailyBalance > 0) {
      const price = prices.value[material] || 0
      const dailyRevenue = dailyBalance * price
      totalRevenue += dailyRevenue
    }
  })

  const totalProfit = totalRevenue - totalCosts

  return { totalCosts, totalRevenue, totalProfit }
})

const hasPrices = computed(() => {
  return Object.values(prices.value).some((p) => p > 0)
})

// Persistence
onMounted(() => {
  const data = loadData()
  if (data) {
    if (data.buildings) buildings.value = data.buildings
    if (data.prices) prices.value = data.prices
    if (data.currentPrices) currentPrices.value = data.currentPrices
    if (data.avgPrices) avgPrices.value = data.avgPrices
    if (data.usePriceType) usePriceType.value = data.usePriceType
    if (data.stock) stock.value = data.stock
    if (data.lockedPrices) lockedPrices.value = data.lockedPrices
    if (data.gameSpeed) gameSpeed.value = data.gameSpeed
    if (data.technologyLevels) technologyLevels.value = data.technologyLevels
    if (data.optionalConsumables) optionalConsumables.value = data.optionalConsumables
  }
})

watch(
  [
    buildings,
    prices,
    currentPrices,
    avgPrices,
    usePriceType,
    stock,
    lockedPrices,
    productivityByTier,
    gameSpeed,
    technologyLevels,
    optionalConsumables,
  ],
  () => {
    // Load current data to preserve planDays values
    const currentData = loadData() || {}
    const dataToSave: SavedData = {
      buildings: buildings.value,
      prices: prices.value,
      currentPrices: currentPrices.value,
      avgPrices: avgPrices.value,
      usePriceType: usePriceType.value,
      stock: stock.value,
      lockedPrices: lockedPrices.value,
      gameSpeed: gameSpeed.value,
      technologyLevels: technologyLevels.value,
      optionalConsumables: optionalConsumables.value,
      workerPlanDays: currentData.workerPlanDays, // Preserve workerPlanDays from storage
      materialPlanDays: currentData.materialPlanDays, // Preserve materialPlanDays from storage
    }
    saveData(dataToSave)
  },
  { deep: true },
)

// Building functions
const addBuilding = (): void => {
  showBuildingTypeModal.value = true
}

const confirmAddBuilding = (buildingType: string): void => {
  const buildingData = GAME_DATA.buildings[buildingType]
  if (!buildingData) return

  const firstRecipeKey = Object.keys(buildingData.recipes)[0]
  if (!firstRecipeKey) return

  // Inicializar planetModifier en 100 si es un edificio de Resource Extraction
  const isResourceExtraction = buildingData.industryType === 'Resource Extraction'

  const newBuilding: BuildingInstance = {
    id: Date.now(),
    buildingType: buildingType,
    quantity: 1,
    recipes: [
      {
        id: Date.now(),
        recipeKey: firstRecipeKey,
        ...(isResourceExtraction && { planetModifier: 100 }),
      },
    ],
  }

  buildings.value.push(newBuilding)
  showBuildingTypeModal.value = false
}

const cancelAddBuilding = (): void => {
  showBuildingTypeModal.value = false
}

const removeBuilding = (id: number): void => {
  buildings.value = buildings.value.filter((b) => b.id !== id)
}

const addRecipe = (buildingId: number): void => {
  const building = buildings.value.find((b) => b.id === buildingId)
  if (!building) return

  const buildingData = GAME_DATA.buildings[building.buildingType]
  if (!buildingData) return

  const firstRecipe = Object.keys(buildingData.recipes)[0]
  if (!firstRecipe) return

  const isResourceExtraction = buildingData.industryType === 'Resource Extraction'

  building.recipes.push({
    id: Date.now(),
    recipeKey: firstRecipe,
    ...(isResourceExtraction && { planetModifier: 100 }),
  })
}

const removeRecipe = (buildingId: number, recipeId: number): void => {
  const building = buildings.value.find((b) => b.id === buildingId)
  if (building && building.recipes.length > 1) {
    building.recipes = building.recipes.filter((r) => r.id !== recipeId)
  }
}

const updateBuilding = (buildingId: number, updatedBuilding: BuildingInstance): void => {
  const index = buildings.value.findIndex((b) => b.id === buildingId)
  if (index !== -1) {
    buildings.value[index] = updatedBuilding
  }
}
</script>
