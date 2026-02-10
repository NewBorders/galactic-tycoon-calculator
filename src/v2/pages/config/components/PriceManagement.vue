<script setup lang="ts">
import type { GameData, Material } from '@/v2/services/gamedata/types'
import { ref, computed } from 'vue'
import { loadGameData, useMaterialPricing } from '@/v2/services/gamedata/service'
import type { PriceMode } from '@/v2/services/gamedata/prices'
import { formatPrice } from '@/v2/utils/formatNumber'
import MaterialIcon from '@/v2/components/MaterialIcon.vue'

import { onMounted } from 'vue'
const gameData = ref<GameData | null>(null)
const pricing = ref<ReturnType<typeof useMaterialPricing> | null>(null)
onMounted(async () => {
  const { data } = await loadGameData()
  gameData.value = data
  pricing.value = useMaterialPricing(data)
})

// Filter and search
const searchTerm = ref('')
const showOnlyManual = ref(false)
const sortBy = ref<'name' | 'id' | 'price'>('name')

// Computed material list with filters and sorting
const filteredMaterials = computed(() => {
  if (!gameData.value?.materials || !pricing.value) return []

  const materials = gameData.value.materials.filter((material: Material) => {
    // Search filter
    if (searchTerm.value) {
      const search = searchTerm.value.toLowerCase()
      if (!material.name.toLowerCase().includes(search)) {
        return false
      }
    }

    // Manual only filter
    if (showOnlyManual.value && pricing.value) {
      const override = pricing.value.settings.overrides[material.id]
      if (!override?.manualPrice) {
        return false
      }
    }

    return true
  })

  // Sort materials
  materials.sort((a: Material, b: Material) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'id':
        return a.id - b.id
      case 'price': {
              if (!pricing.value) return 0
              const priceA = pricing.value.priceResolver(a.id)
              const priceB = pricing.value.priceResolver(b.id)
        return priceB - priceA
      }
      default:
        return 0
    }
  })

  return materials
})

// Get current price mode for display - shows actual price source being used
function getPriceModeForMaterial(materialId: number): string {
  if (!pricing.value) return 'Current'
  const override = pricing.value.settings.overrides[materialId]

  // Check if manual price exists and has priority (same logic as resolveMaterialPrice)
  if (override?.manualPrice != null && Number.isFinite(override.manualPrice) && override.manualPrice >= 0) {
    return 'Manual'
  }

  // Fall back to configured mode display
  const mode = override?.mode ?? pricing.value.settings.defaultMode
  switch (mode) {
    case 'current': return 'Current'
    case 'average': return 'Average'
    case 'weightedAverage': return 'Weighted'
    case 'manual': return 'Manual'
    default: return 'Current'
  }
}

function getManualPrice(materialId: number): number | null {
  if (!pricing.value) return null
  return pricing.value.settings.overrides[materialId]?.manualPrice ?? null
}

function updateManualPrice(materialId: number, value: string) {
  if (!pricing.value) return
  const numValue = parseFloat(value)
  if (value === '' || Number.isNaN(numValue)) {
    pricing.value.setManualPrice(materialId, null)
  } else {
    pricing.value.setManualPrice(materialId, numValue)
  }
}

function updatePriceMode(materialId: number, mode: string) {
  if (!pricing.value) return
  if (mode === 'default') {
    pricing.value.setOverrideMode(materialId, undefined)
  } else {
    pricing.value.setOverrideMode(materialId, mode as PriceMode)
  }
}

function updateDefaultMode(mode: string) {
  if (!pricing.value) return
  pricing.value.setDefaultMode(mode as PriceMode)
}

function clearAllManualPrices() {
  if (!pricing.value || !gameData.value) return
  if (confirm('Are you sure you want to clear all manual prices?')) {
    const currentPricing = pricing.value
    if (!currentPricing) return
    gameData.value.materials.forEach((material) => {
      currentPricing.setManualPrice(material.id, null)
    })
  }
}

// Refresh prices from API
const refreshing = ref(false)
async function refreshPrices() {
  if (!pricing.value) return
  refreshing.value = true
  try {
    await pricing.value.refreshPrices(true)
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <div class="space-y-4 text-slate-100">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium text-slate-100">Price Management</h3>
      <div class="flex gap-2">
        <button
          @click="refreshPrices"
          :disabled="refreshing || (pricing ? pricing.loading : false)"
          class="px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-sm"
        >
          {{ refreshing || (pricing ? pricing.loading : false) ? 'Refreshing...' : 'Refresh API Prices' }}
        </button>
        <button
          @click="clearAllManualPrices"
          class="px-3 py-2 bg-red-700 hover:bg-red-600 rounded text-sm"
        >
          Clear All Manual
        </button>
      </div>
    </div>

      <!-- Global Price Mode -->
      <div class="bg-slate-800 border border-slate-700 rounded p-4 space-y-3">
        <h4 class="font-medium text-slate-200">Default Price Mode</h4>
        <div class="grid gap-3">
          <label class="flex items-start gap-2">
            <input
              type="radio"
              name="defaultPriceMode"
              value="current"
              :checked="pricing ? pricing.settings.defaultMode === 'current' : false"
              @change="updateDefaultMode('current')"
              class="text-blue-600 mt-0.5"
            />
            <div>
              <span class="text-sm font-medium">Current Prices</span>
              <p class="text-xs text-slate-400">Uses the latest market price from the API</p>
            </div>
          </label>
          <label class="flex items-start gap-2">
            <input
              type="radio"
              name="defaultPriceMode"
              value="average"
              :checked="pricing ? pricing.settings.defaultMode === 'average' : false"
              @change="updateDefaultMode('average')"
              class="text-blue-600 mt-0.5"
            />
            <div>
              <span class="text-sm font-medium">Average Prices</span>
              <p class="text-xs text-slate-400">Uses historical average market prices for more stability</p>
            </div>
          </label>
          <label class="flex items-start gap-2">
            <input
              type="radio"
              name="defaultPriceMode"
              value="weightedAverage"
              :checked="pricing ? pricing.settings.defaultMode === 'weightedAverage' : false"
              @change="updateDefaultMode('weightedAverage')"
              class="text-blue-600 mt-0.5"
            />
            <div>
              <span class="text-sm font-medium">Weighted Average</span>
              <p class="text-xs text-slate-400">Uses volume-weighted average prices based on trading activity</p>
            </div>
          </label>
        </div>
        <div class="bg-slate-700/50 rounded p-3 mt-3">
          <p class="text-xs text-slate-300">
            <strong>Note:</strong> Manual prices always take priority over any selected mode.
            When you set a manual price for a material, it will be used regardless of the mode setting.
          </p>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="bg-slate-800 border border-slate-700 rounded p-4 space-y-3">
        <div class="flex flex-wrap gap-4">
          <div class="flex-1 min-w-64">
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Search materials..."
              class="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="flex items-center gap-2 text-sm">
              <input
                v-model="showOnlyManual"
                class="text-blue-600"
              />
              <span class="text-sm">Manual only</span>
            </label>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <span class="text-slate-400">Sort by:</span>
            <select
              v-model="sortBy"
              class="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
            >
              <option value="name">Name</option>
              <option value="id">ID</option>
              <option value="price">Final Price</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div
        v-if="pricing && pricing.error"
        class="bg-red-900/30 border border-red-700 rounded p-3 text-red-200"
      >
        <div class="flex items-center gap-2">
          <span class="text-red-400">⚠</span>
          <span class="text-sm">{{ pricing.error }}</span>
        </div>
      </div>

      <!-- Materials Table -->
      <div class="bg-slate-800 border border-slate-700 rounded">
        <div class="overflow-x-auto max-h-96 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-slate-800 border-b border-slate-700">
              <tr>
                <th class="text-left py-2 px-3 text-slate-400 font-normal">Material</th>
                <th class="text-center py-2 px-3 text-slate-400 font-normal w-24">Mode</th>
                <th class="text-right py-2 px-3 text-slate-400 font-normal w-24">Manual Price</th>
                <th class="text-right py-2 px-3 text-slate-400 font-normal w-20">Final</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="material in filteredMaterials"
                :key="material.id"
                class="border-b border-slate-700 hover:bg-slate-700/50"
              >
                <!-- Material Name with Icon -->
                <td class="py-2 px-3">
                  <div class="flex items-center gap-2">
                    <MaterialIcon :name="material.name" variant="sm" />
                    <div class="flex flex-col min-w-0">
                      <span class="text-slate-100 truncate">{{ material.name }}</span>
                      <span class="text-xs text-slate-400">ID: {{ material.id }}</span>
                    </div>
                  </div>
                </td>

                <!-- Price Mode -->
                <td class="text-center py-2 px-3">
                  <select
                    :value="pricing ? (pricing.settings.overrides[material.id]?.mode ?? 'default') : 'default'"
                    @change="updatePriceMode(material.id, ($event.target as HTMLSelectElement).value)"
                    class="bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-xs w-20"
                  >
                    <option value="default">Default</option>
                    <option value="current">Current</option>
                    <option value="average">Average</option>
                    <option value="weightedAverage">Weighted</option>
                  </select>
                </td>

                <!-- Manual Price -->
                <td class="py-2 px-3">
                  <input
                    :value="getManualPrice(material.id) ?? ''"
                    @input="(event) => updateManualPrice(material.id, (event.target as HTMLInputElement).value)"
                    @change="(event) => updateManualPrice(material.id, (event.target as HTMLInputElement).value)"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="-"
                    class="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-right"
                  />
                </td>

                <!-- Final Price (calculated) -->
                <td class="text-right py-2 px-3">
                  <span class="text-emerald-400 font-medium">
                    {{ pricing ? formatPrice(pricing.priceResolver(material.id)) : '-' }}
                  </span>
                  <div class="text-xs text-slate-500">
                    {{ getPriceModeForMaterial(material.id) }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Stats Footer -->
      <div class="text-xs text-slate-400 flex justify-between">
        <div>
          Showing {{ filteredMaterials.length }} of {{ gameData ? gameData.materials.length : 0 }} materials
        </div>
        <div v-if="pricing && pricing.lastFetched">
          API last fetched: {{ new Date(pricing.lastFetched).toLocaleString() }}
        </div>
      </div>
  </div>
</template>
