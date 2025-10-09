<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click.self="$emit('cancel')"
  >
    <div class="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <h2 class="text-2xl font-semibold mb-2">Select Building Type</h2>
      <p class="text-sm text-gray-400 mb-6">
        The building type cannot be changed after creation
      </p>

      <!-- Buildings organized by Industry Type -->
      <div class="space-y-6">
        <div v-for="[industryType, industryBuildings] in organizedBuildings" :key="industryType">
          <h3 class="text-lg font-semibold mb-3 flex items-center gap-2" :class="getIndustryColor(industryType)">
            <span class="text-2xl">{{ getIndustryIcon(industryType) }}</span>
            {{ industryType }}
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <button
              v-for="building in industryBuildings"
              :key="building.key"
              @click="selectBuilding(building.key)"
              :class="[
                'p-3 rounded-lg border-2 transition-all text-left',
                selectedType === building.key
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-650'
              ]"
            >
              <div class="flex items-start justify-between mb-1">
                <span class="font-semibold text-sm">{{ building.data.name }}</span>
                <span class="text-xs bg-gray-600 px-2 py-0.5 rounded">T{{ building.data.tier }}</span>
              </div>
              <div class="text-xs text-gray-400">
                <div>👷 {{ building.data.workers }} workers</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-700">
        <button @click="$emit('cancel')" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">
          Cancel
        </button>
        <button @click="confirm" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
          Add Building
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Building, IndustryType } from '../types'

interface Props {
  show: boolean
  buildings: Record<string, Building>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  confirm: [buildingType: string]
  cancel: []
}>()

const selectedType = ref('mine')

// Organizar edificios por industria y tier
const organizedBuildings = computed(() => {
  const grouped = new Map<IndustryType, Array<{ key: string; data: Building }>>()

  Object.entries(props.buildings).forEach(([key, building]) => {
    if (!grouped.has(building.industryType)) {
      grouped.set(building.industryType, [])
    }
    grouped.get(building.industryType)!.push({ key, data: building })
  })

  // Ordenar edificios dentro de cada industria por tier
  grouped.forEach((buildings) => {
    buildings.sort((a, b) => a.data.tier - b.data.tier)
  })

  // Ordenar las industrias
  const industriesOrder: IndustryType[] = [
    'Resource Extraction',
    'Agriculture',
    'Food Production',
    'Metallurgy',
    'Chemistry',
    'Manufacturing',
    'Construction',
    'Electronics',
    'Residential',
    'Science'
  ]

  const sortedMap = new Map<IndustryType, Array<{ key: string; data: Building }>>()
  industriesOrder.forEach(industry => {
    if (grouped.has(industry)) {
      sortedMap.set(industry, grouped.get(industry)!)
    }
  })

  return sortedMap
})

// Obtener color para cada tipo de industria
const getIndustryColor = (industryType: IndustryType): string => {
  const colors: Record<IndustryType, string> = {
    'Resource Extraction': 'text-amber-400',
    'Agriculture': 'text-green-400',
    'Food Production': 'text-lime-400',
    'Metallurgy': 'text-orange-400',
    'Chemistry': 'text-purple-400',
    'Manufacturing': 'text-blue-400',
    'Construction': 'text-yellow-400',
    'Electronics': 'text-cyan-400',
    'Residential': 'text-indigo-400',
    'Science': 'text-pink-400'
  }
  return colors[industryType] || 'text-gray-400'
}

// Obtener icono para cada tipo de industria
const getIndustryIcon = (industryType: IndustryType): string => {
  const icons: Record<IndustryType, string> = {
    'Resource Extraction': '⛏️',
    'Agriculture': '🌾',
    'Food Production': '🍕',
    'Metallurgy': '🔥',
    'Chemistry': '⚗️',
    'Manufacturing': '🏭',
    'Construction': '🏗️',
    'Electronics': '⚡',
    'Residential': '🏠',
    'Science': '🔬'
  }
  return icons[industryType] || '🏢'
}

const selectBuilding = (buildingKey: string) => {
  selectedType.value = buildingKey
}

watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      selectedType.value = 'mine'
    }
  },
)

const confirm = () => {
  emit('confirm', selectedType.value)
}
</script>
