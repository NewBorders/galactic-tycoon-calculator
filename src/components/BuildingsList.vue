<template>
  <div class="bg-gray-800 rounded-lg p-6 mb-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Production Buildings</h2>
      <button
        @click="$emit('add-building')"
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
      >
        <Plus :size="20" />
        Add Building
      </button>
    </div>

    <div class="space-y-6">
      <BuildingCard
        v-for="building in buildings"
        :key="building.id"
        :building="building"
        :building-data="gameData.buildings[building.buildingType]"
        :productivity="productivity"
        :technology-levels="technologyLevels"
        @remove="$emit('remove-building', building.id)"
        @add-recipe="$emit('add-recipe', building.id)"
        @remove-recipe="(recipeId) => $emit('remove-recipe', building.id, recipeId)"
        @update-building="(updated) => $emit('update-building', building.id, updated)"
      />

      <div v-if="buildings.length === 0" class="text-center text-gray-500 py-8">
        No buildings added. Click "Add Building" to begin.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import BuildingCard from './BuildingCard.vue'
import type { BuildingInstance, GameData, IndustryType } from '../types'

interface Props {
  buildings: BuildingInstance[]
  gameData: GameData
  productivity: number
  technologyLevels: Record<IndustryType, number>
}

defineProps<Props>()
defineEmits<{
  'add-building': []
  'remove-building': [id: number]
  'add-recipe': [buildingId: number]
  'remove-recipe': [buildingId: number, recipeId: number]
  'update-building': [buildingId: number, building: BuildingInstance]
}>()
</script>
