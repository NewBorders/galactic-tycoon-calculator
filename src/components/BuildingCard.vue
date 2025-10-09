<template>
  <div class="bg-gray-700 rounded-lg p-4">
    <div class="flex gap-4 items-start mb-4">
      <div class="flex-1">
        <label class="block text-sm text-gray-400 mb-1">Building Type</label>
        <div class="flex items-center gap-2">
          <div class="flex-1 bg-gray-600 rounded px-3 py-2 text-gray-300">
            {{ buildingData.name }}
          </div>
          <div class="bg-blue-900 rounded px-3 py-2 text-blue-300 font-semibold text-sm whitespace-nowrap">
            {{ effectiveProductivity }}%
          </div>
        </div>
      </div>

      <div class="w-32">
        <label class="block text-sm text-gray-400 mb-1">Quantity</label>
        <input
          type="number"
          :min="GAME_LIMITS.MIN_BUILDING_QUANTITY"
          :value="building.quantity"
          @input="updateQuantity(($event.target as HTMLInputElement).value)"
          class="w-full bg-gray-600 rounded px-3 py-2"
        />
      </div>

      <div class="pt-6">
        <button @click="$emit('remove')" class="p-2 bg-red-600 hover:bg-red-700 rounded">
          <Trash2 :size="20" />
        </button>
      </div>
    </div>

    <div class="ml-4 border-l-2 border-gray-600 pl-4 space-y-2">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-semibold text-gray-300">
          Recipes ({{ building.recipes.length }} recipe{{
            building.recipes.length !== 1 ? 's' : ''
          }}
          - processed in sequence)
        </span>
        <button
          @click="$emit('add-recipe')"
          class="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 hover:bg-green-700 rounded"
        >
          <Plus :size="16" />
          Add Recipe
        </button>
      </div>

      <div
        v-for="recipe in building.recipes"
        :key="recipe.id"
        class="bg-gray-600 rounded p-3"
      >
        <div class="flex gap-2 items-start mb-2">
          <div class="flex-1">
            <select
              :value="recipe.recipeKey"
              @change="updateRecipe(recipe.id, ($event.target as HTMLSelectElement).value)"
              class="w-full bg-gray-700 rounded px-3 py-2 text-sm font-semibold"
            >
              <option
                v-for="[key, rcp] in Object.entries(buildingData.recipes)"
                :key="key"
                :value="key"
              >
                {{ rcp.name }}
              </option>
            </select>
          </div>

          <button
            v-if="building.recipes.length > 1"
            @click="$emit('remove-recipe', recipe.id)"
            class="p-2 bg-red-600 hover:bg-red-700 rounded"
          >
            <Trash2 :size="16" />
          </button>
        </div>

        <!-- Recipe Flow: Inputs -> Outputs -->
        <div class="flex items-center gap-2 text-xs flex-wrap">
          <!-- Inputs -->
          <template v-if="getRecipeData(recipe.recipeKey)?.inputs && Object.keys(getRecipeData(recipe.recipeKey)!.inputs).length > 0">
            <span
              v-for="[material, amount] in Object.entries(getRecipeData(recipe.recipeKey)!.inputs)"
              :key="material"
              class="bg-red-900/30 text-red-300 px-2 py-1 rounded border border-red-700/50"
            >
              {{ formatMaterialName(material) }} ({{ amount }})
            </span>
            <span class="text-gray-500 font-bold text-base">→</span>
          </template>

          <!-- Outputs -->
          <template v-if="getRecipeData(recipe.recipeKey)?.outputs">
            <span
              v-for="[material, amount] in Object.entries(getRecipeData(recipe.recipeKey)!.outputs)"
              :key="material"
              class="bg-green-900/40 text-green-300 px-2 py-1 rounded border border-green-600/50 font-semibold"
            >
              {{ formatMaterialName(material) }} ({{ amount }})
            </span>
          </template>
        </div>

        <!-- Planet Modifier for Resource Extraction buildings -->
        <div
          v-if="isResourceExtraction"
          class="mt-2 flex items-center gap-2 bg-gray-700 rounded p-2"
        >
          <label class="text-xs text-gray-400">Planet Modifier:</label>
          <input
            type="number"
            :min="GAME_LIMITS.MIN_PLANET_MODIFIER"
            :max="GAME_LIMITS.MAX_PLANET_MODIFIER"
            :value="recipe.planetModifier ?? 100"
            @input="updatePlanetModifier(recipe.id, ($event.target as HTMLInputElement).value)"
            class="w-20 bg-gray-800 rounded px-2 py-1 text-white text-sm text-right"
          />
          <span class="text-xs text-gray-400">% (lower = slower extraction)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import { computed } from 'vue'
import type { BuildingInstance, Building, IndustryType } from '../types'
import { GAME_LIMITS } from '../config/constants'

interface Props {
  building: BuildingInstance
  buildingData: Building
  technologyLevels: Record<IndustryType, number>
  productivityByTier: [number, number, number, number]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  remove: []
  'add-recipe': []
  'remove-recipe': [recipeId: number]
  'update-building': [building: BuildingInstance]
}>()

// Verificar si es un edificio de extracción de recursos
const isResourceExtraction = computed(() => {
  return props.buildingData.industryType === 'Resource Extraction'
})

// Calcular la productividad efectiva del edificio
const effectiveProductivity = computed(() => {
  const totalWorkers = props.buildingData.workers
  if (totalWorkers === 0) return 70
  
  // Calcular productividad ponderada según los workers de cada tier
  let weightedProductivity = 0
  props.buildingData.workersByTier.forEach((count, index) => {
    const tierProductivity = props.productivityByTier[index]
    weightedProductivity += tierProductivity * count
  })
  
  const baseProductivity = weightedProductivity / totalWorkers
  
  // Aplicar technology bonus
  const techLevel = props.technologyLevels[props.buildingData.industryType] || 0
  const techMultiplier = (100 + techLevel) / 100
  
  return Math.round(baseProductivity * techMultiplier)
})

const updateQuantity = (value: string) => {
  emit('update-building', { ...props.building, quantity: Number(value) })
}

const updateRecipe = (recipeId: number, recipeKey: string) => {
  const newRecipes = props.building.recipes.map((r) =>
    r.id === recipeId ? { ...r, recipeKey } : r,
  )
  emit('update-building', { ...props.building, recipes: newRecipes })
}

const updatePlanetModifier = (recipeId: number, value: string) => {
  const modifier = Number(value)
  const newRecipes = props.building.recipes.map((r) =>
    r.id === recipeId ? { ...r, planetModifier: modifier } : r,
  )
  emit('update-building', { ...props.building, recipes: newRecipes })
}

// Obtener datos de la receta
const getRecipeData = (recipeKey: string) => {
  return props.buildingData.recipes[recipeKey]
}

// Formatear nombre de material
const formatMaterialName = (material: string): string => {
  return material
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
</script>
