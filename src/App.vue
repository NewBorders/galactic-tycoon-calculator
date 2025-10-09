<template>
  <div class="min-h-screen bg-gray-900 text-gray-100 p-6">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-blue-400">Production Calculator</h1>
        <div class="flex gap-2">
          <button
            @click="showSettings = !showSettings"
            class="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            <Settings :size="20" />
            {{ showSettings ? 'Hide' : 'Show' }} Settings
          </button>
          <button
            @click="showPrices = !showPrices"
            class="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            <Package :size="20" />
            {{ showPrices ? 'Hide' : 'Show' }} Stocks
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

      <PricesConfig
        :show="showPrices"
        :materials="GAME_DATA.materials"
        :worker-consumption="GAME_DATA.workerConsumption"
        :prices="prices"
        :stock="stock"
        @update:prices="prices = $event"
        @update:stock="stock = $event"
      />

      <BuildingTypeModal
        :show="showBuildingTypeModal"
        :buildings="GAME_DATA.buildings"
        @confirm="confirmAddBuilding"
        @cancel="cancelAddBuilding"
      />

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

        <ProductionSummary :total-outputs="calculations.totalOutputs" :materials="GAME_DATA.materials" />
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
const stock = ref<Record<string, number>>({})
const showPrices = ref(false)
const showSettings = ref(false)
const showBuildingTypeModal = ref(false)
const productivityByTier = computed<[number, number, number, number]>(() => {
  // Calcular productividad para cada tier basado en sus consumibles opcionales activos
  const tier1Active = [...WORKER_CONFIG.TIER1_OPTIONAL].filter(r => optionalConsumables.value[r]).length
  const tier2Active = [...WORKER_CONFIG.TIER2_OPTIONAL].filter(r => optionalConsumables.value[r]).length
  const tier3Active = [...WORKER_CONFIG.TIER3_OPTIONAL].filter(r => optionalConsumables.value[r]).length
  const tier4Active = [...WORKER_CONFIG.TIER4_OPTIONAL].filter(r => optionalConsumables.value[r]).length
  
  return [
    WORKER_CONFIG.BASE_PRODUCTIVITY + (tier1Active * WORKER_CONFIG.PRODUCTIVITY_BONUS_PER_OPTIONAL),
    WORKER_CONFIG.BASE_PRODUCTIVITY + (tier2Active * WORKER_CONFIG.PRODUCTIVITY_BONUS_PER_OPTIONAL),
    WORKER_CONFIG.BASE_PRODUCTIVITY + (tier3Active * WORKER_CONFIG.PRODUCTIVITY_BONUS_PER_OPTIONAL),
    WORKER_CONFIG.BASE_PRODUCTIVITY + (tier4Active * WORKER_CONFIG.PRODUCTIVITY_BONUS_PER_OPTIONAL),
  ]
})
const gameSpeed = ref(4)
const optionalConsumables = ref<Record<string, boolean>>({
  [WORKER_CONFIG.OPTIONAL_CONSUMABLES[0]]: false,
  [WORKER_CONFIG.OPTIONAL_CONSUMABLES[1]]: false,
  [WORKER_CONFIG.OPTIONAL_CONSUMABLES[2]]: false,
})
const technologyLevels = ref<Record<IndustryType, number>>({
  'Agriculture': 0,
  'Chemistry': 0,
  'Construction': 0,
  'Electronics': 0,
  'Food Production': 0,
  'Manufacturing': 0,
  'Metallurgy': 0,
  'Resource Extraction': 0,
  'Science': 0
})

// Calculations
const { calculations } = useCalculations(buildings, GAME_DATA, productivityByTier, gameSpeed, technologyLevels)

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
  let totalRevenue = 0

  Object.entries(calculations.value.totalInputs).forEach(([material, amount]) => {
    const price = prices.value[material] || 0
    totalCosts += amount * price
  })

  // Essential consumables (always count)
  const essentialConsumables = WORKER_CONFIG.ESSENTIAL_CONSUMABLES
  const optionalConsumablesList = WORKER_CONFIG.OPTIONAL_CONSUMABLES
  
  Object.entries(calculations.value.workerConsumption).forEach(([resource, amount]) => {
    const price = prices.value[resource] || 0
    // Count if essential OR if optional and active
    if (essentialConsumables.includes(resource) || 
        (optionalConsumablesList.includes(resource) && optionalConsumables.value[resource])) {
      totalCosts += amount * price
    }
  })

  Object.entries(calculations.value.totalOutputs).forEach(([material, amount]) => {
    const price = prices.value[material] || 0
    totalRevenue += amount * price
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
    if (data.stock) stock.value = data.stock
    if (data.gameSpeed) gameSpeed.value = data.gameSpeed
    if (data.technologyLevels) technologyLevels.value = data.technologyLevels
    if (data.optionalConsumables) optionalConsumables.value = data.optionalConsumables
  }
})

watch(
  [buildings, prices, stock, productivityByTier, gameSpeed, technologyLevels, optionalConsumables],
  () => {
    const dataToSave: SavedData = {
      buildings: buildings.value,
      prices: prices.value,
      stock: stock.value,
      gameSpeed: gameSpeed.value,
      technologyLevels: technologyLevels.value,
      optionalConsumables: optionalConsumables.value,
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
  const firstRecipeKey = Object.keys(GAME_DATA.buildings[buildingType].recipes)[0]
  const newBuilding: BuildingInstance = {
    id: Date.now(),
    buildingType: buildingType,
    quantity: 1,
    recipes: [{ id: Date.now(), recipeKey: firstRecipeKey }],
  }

  if (newBuilding.buildingType === 'mine') {
    newBuilding.planetModifiers = {
      iron_ore: 100,
      silica: 100,
      limestone: 100,
    }
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
  if (building) {
    const firstRecipe = Object.keys(GAME_DATA.buildings[building.buildingType].recipes)[0]
    building.recipes.push({ id: Date.now(), recipeKey: firstRecipe })
  }
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
