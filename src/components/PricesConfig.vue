<template>
  <div v-if="show" class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-300">Configuration</h3>
    </div>

    <!-- Import Stock Section -->
    <div class="mb-6 bg-gray-700 rounded-lg p-4">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-lg font-semibold text-blue-400">Import Stock from Game</h3>
        <button
          v-if="importStockText"
          @click="clearImportStockText"
          class="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm text-gray-300"
        >
          Clear
        </button>
      </div>
      <p class="text-sm text-gray-400 mb-3">
        Paste the stock data copied from the game (Material, Quantity, Weight columns):
      </p>
      <textarea
        v-model="importStockText"
        @input="handleStockImport"
        placeholder="Paste here the table copied from game...\nAle\t45\t7t\nAmenities\t2\t3t"
        class="w-full bg-gray-600 rounded px-3 py-2 text-white text-sm font-mono h-24 resize-none"
      ></textarea>
      <div
        v-if="importStockStatus"
        class="mt-2 text-sm"
        :class="importStockStatus.success ? 'text-green-400' : 'text-red-400'"
      >
        {{ importStockStatus.message }}
      </div>
    </div>

    <!-- Import Prices Section -->
    <div class="mb-6 bg-gray-700 rounded-lg p-4">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-lg font-semibold text-green-400">Import Prices from Game</h3>
        <div class="flex gap-2">
          <button
            @click="fetchApiPrices"
            :disabled="isLoadingApiPrices"
            class="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm text-white"
          >
            {{ isLoadingApiPrices ? 'Loading...' : 'Fetch from API' }}
          </button>
          <button
            v-if="importPricesText"
            @click="clearImportPricesText"
            class="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm text-gray-300"
          >
            Clear
          </button>
        </div>
      </div>
      
      <!-- Price Type Selector -->
      <div class="mb-3 flex items-center gap-4">
        <label class="text-sm text-gray-400">Use price type:</label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            value="current"
            :checked="usePriceType === 'current'"
            @change="updatePriceType('current')"
            class="text-blue-500"
          />
          <span class="text-sm text-gray-300">Current Price</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            value="avg"
            :checked="usePriceType === 'avg'"
            @change="updatePriceType('avg')"
            class="text-blue-500"
          />
          <span class="text-sm text-gray-300">Average Price</span>
        </label>
      </div>
      
      <div
        v-if="apiPricesStatus"
        class="mb-3 text-sm"
        :class="apiPricesStatus.success ? 'text-green-400' : 'text-red-400'"
      >
        {{ apiPricesStatus.message }}
      </div>
      
      <p class="text-sm text-gray-400 mb-3">
        Paste the prices data copied from the game (will not update locked prices):
      </p>
      <textarea
        v-model="importPricesText"
        @input="handlePricesImport"
        placeholder="Paste here the prices table copied from game..."
        class="w-full bg-gray-600 rounded px-3 py-2 text-white text-sm font-mono h-24 resize-none"
      ></textarea>
      <div
        v-if="importPricesStatus"
        class="mt-2 text-sm"
        :class="importPricesStatus.success ? 'text-green-400' : 'text-red-400'"
      >
        {{ importPricesStatus.message }}
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-6 bg-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Search Filter -->
      <div>
        <label class="block text-sm font-medium text-gray-400 mb-2">Search Material</label>
        <input
          v-model="searchFilter"
          type="text"
          placeholder="Type to search..."
          class="w-full bg-gray-600 rounded px-3 py-2 text-white text-sm"
        />
      </div>

      <!-- Tier Filter -->
      <div>
        <label class="block text-sm font-medium text-gray-400 mb-2">Filter by Tier</label>
        <select
          v-model="tierFilter"
          class="w-full bg-gray-600 rounded px-3 py-2 text-white text-sm"
        >
          <option value="">All Tiers</option>
          <option value="1">Tier 1</option>
          <option value="2">Tier 2</option>
          <option value="3">Tier 3</option>
          <option value="4">Tier 4</option>
        </select>
      </div>

      <!-- Category Filter -->
      <div>
        <label class="block text-sm font-medium text-gray-400 mb-2">Filter by Category</label>
        <select
          v-model="categoryFilter"
          class="w-full bg-gray-600 rounded px-3 py-2 text-white text-sm"
        >
          <option value="">All Categories</option>
          <option value="Agriculture">Agriculture</option>
          <option value="Chemistry">Chemistry</option>
          <option value="Construction">Construction</option>
          <option value="Electronics">Electronics</option>
          <option value="Food Production">Food Production</option>
          <option value="Manufacturing">Manufacturing</option>
          <option value="Metallurgy">Metallurgy</option>
          <option value="Resource Extraction">Resource Extraction</option>
          <option value="Science">Science</option>
        </select>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="mb-4 flex gap-2 flex-wrap">
      <button
        @click="hideWithoutPrice = !hideWithoutPrice"
        class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
      >
        {{ hideWithoutPrice ? 'Show All' : 'Hide Without Price' }}
      </button>
      <button
        @click="showOnlyLocked = !showOnlyLocked"
        class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
      >
        {{ showOnlyLocked ? 'Show All' : 'Show Only Locked' }}
      </button>
      <button
        @click="clearAllFilters"
        v-if="searchFilter || tierFilter || categoryFilter"
        class="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
      >
        Clear Filters
      </button>
    </div>

    <!-- Materials Table - Two Columns -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="overflow-x-auto bg-gray-700 rounded-lg">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-gray-700">
            <tr class="border-b border-gray-600">
              <th class="text-left py-2 px-2 text-gray-400">Material</th>
              <th class="text-right py-2 px-2 text-gray-400 w-20">Price</th>
              <th class="text-right py-2 px-2 text-gray-400 w-20 text-xs">Current</th>
              <th class="text-right py-2 px-2 text-gray-400 w-20 text-xs">Avg</th>
              <th class="text-right py-2 px-2 text-gray-400 w-20">Stock</th>
              <th class="text-center py-2 px-2 text-gray-400 w-10">🔒</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="[key, material] in filteredMaterialsColumn1"
              :key="key"
              :class="[
                'border-b border-gray-700/50 hover:bg-gray-600/30',
                getIndustryColors(material.category).bg
              ]"
            >
              <td class="py-2 px-2">
                <div class="flex items-center gap-2">
                  <span :class="['text-xs font-medium', getIndustryColors(material.category).text]">
                    [T{{ getTier(key) }}]
                  </span>
                  <span class="text-gray-200">{{ material.name }}</span>
                </div>
              </td>
              <td class="py-2 px-2">
                <input
                  type="number"
                  step="0.01"
                  :value="prices[key] || 0"
                  @input="updatePrice(key, ($event.target as HTMLInputElement).value)"
                  :disabled="lockedPrices[key]"
                  :class="lockedPrices[key] ? 'bg-gray-600 text-gray-400' : 'bg-gray-800'"
                  class="w-full rounded px-2 py-1 text-white text-right text-xs"
                  placeholder="0.00"
                />
              </td>
              <td class="py-2 px-2 text-right text-xs text-gray-400">
                {{ currentPrices[key] ? currentPrices[key].toFixed(2) : '-' }}
              </td>
              <td class="py-2 px-2 text-right text-xs text-gray-400">
                {{ avgPrices[key] ? avgPrices[key].toFixed(2) : '-' }}
              </td>
              <td class="py-2 px-2">
                <input
                  type="number"
                  step="1"
                  :value="stock[key] || 0"
                  @input="updateStock(key, ($event.target as HTMLInputElement).value)"
                  class="w-full bg-gray-800 rounded px-2 py-1 text-white text-right text-xs"
                  placeholder="0"
                />
              </td>
              <td class="py-2 px-2 text-center">
                <button
                  @click="toggleLockPrice(key)"
                  class="hover:text-yellow-400 transition-colors"
                  :title="lockedPrices[key] ? 'Unlock price' : 'Lock price'"
                >
                  {{ lockedPrices[key] ? '🔒' : '🔓' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="overflow-x-auto bg-gray-700 rounded-lg">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-gray-700">
            <tr class="border-b border-gray-600">
              <th class="text-left py-2 px-2 text-gray-400">Material</th>
              <th class="text-right py-2 px-2 text-gray-400 w-20">Price</th>
              <th class="text-right py-2 px-2 text-gray-400 w-20 text-xs">Current</th>
              <th class="text-right py-2 px-2 text-gray-400 w-20 text-xs">Avg</th>
              <th class="text-right py-2 px-2 text-gray-400 w-20">Stock</th>
              <th class="text-center py-2 px-2 text-gray-400 w-10">🔒</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="[key, material] in filteredMaterialsColumn2"
              :key="key"
              :class="[
                'border-b border-gray-700/50 hover:bg-gray-600/30',
                getIndustryColors(material.category).bg
              ]"
            >
              <td class="py-2 px-2">
                <div class="flex items-center gap-2">
                  <span :class="['text-xs font-medium', getIndustryColors(material.category).text]">
                    [T{{ getTier(key) }}]
                  </span>
                  <span class="text-gray-200">{{ material.name }}</span>
                </div>
              </td>
              <td class="py-2 px-2">
                <input
                  type="number"
                  step="0.01"
                  :value="prices[key] || 0"
                  @input="updatePrice(key, ($event.target as HTMLInputElement).value)"
                  :disabled="lockedPrices[key]"
                  :class="lockedPrices[key] ? 'bg-gray-600 text-gray-400' : 'bg-gray-800'"
                  class="w-full rounded px-2 py-1 text-white text-right text-xs"
                  placeholder="0.00"
                />
              </td>
              <td class="py-2 px-2 text-right text-xs text-gray-400">
                {{ currentPrices[key] ? currentPrices[key].toFixed(2) : '-' }}
              </td>
              <td class="py-2 px-2 text-right text-xs text-gray-400">
                {{ avgPrices[key] ? avgPrices[key].toFixed(2) : '-' }}
              </td>
              <td class="py-2 px-2">
                <input
                  type="number"
                  step="1"
                  :value="stock[key] || 0"
                  @input="updateStock(key, ($event.target as HTMLInputElement).value)"
                  class="w-full bg-gray-800 rounded px-2 py-1 text-white text-right text-xs"
                  placeholder="0"
                />
              </td>
              <td class="py-2 px-2 text-center">
                <button
                  @click="toggleLockPrice(key)"
                  class="hover:text-yellow-400 transition-colors"
                  :title="lockedPrices[key] ? 'Unlock price' : 'Lock price'"
                >
                  {{ lockedPrices[key] ? '🔒' : '🔓' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Result Count -->
    <div class="mt-4 text-sm text-gray-400 text-center">
      Showing {{ filteredMaterialsAll.length }} of {{ totalMaterialsCount }} materials
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Material, IndustryType } from '../types'
import { MATERIAL_NAME_TO_KEY } from '../data/materialNameMapping'
import { parseStockData, parsePricesData } from '../utils/parsing'
import { getIndustryColors } from '../utils/industryColors'
import { fetchMaterialPrices } from '../services/pricesApi'

interface Props {
  show: boolean
  materials: Record<string, Material>
  workerConsumption: Record<string, number>
  prices: Record<string, number>
  currentPrices: Record<string, number>
  avgPrices: Record<string, number>
  usePriceType: 'current' | 'avg'
  stock: Record<string, number>
  lockedPrices: Record<string, boolean>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:prices': [prices: Record<string, number>]
  'update:currentPrices': [currentPrices: Record<string, number>]
  'update:avgPrices': [avgPrices: Record<string, number>]
  'update:usePriceType': [usePriceType: 'current' | 'avg']
  'update:stock': [stock: Record<string, number>]
  'update:lockedPrices': [lockedPrices: Record<string, boolean>]
}>()

const importStockText = ref('')
const importStockStatus = ref<{ success: boolean; message: string } | null>(null)

const importPricesText = ref('')
const importPricesStatus = ref<{ success: boolean; message: string } | null>(null)

const isLoadingApiPrices = ref(false)
const apiPricesStatus = ref<{ success: boolean; message: string } | null>(null)

const hideWithoutPrice = ref(false)
const showOnlyLocked = ref(false)
const searchFilter = ref('')
const tierFilter = ref('')
const categoryFilter = ref('')

const clearImportStockText = () => {
  importStockText.value = ''
  importStockStatus.value = null
}

const clearImportPricesText = () => {
  importPricesText.value = ''
  importPricesStatus.value = null
}

const clearAllFilters = () => {
  searchFilter.value = ''
  tierFilter.value = ''
  categoryFilter.value = ''
}

const getTier = (key: string): number => {
  const material = props.materials[key]
  if (!material) return 1
  
  // Use tier from material data
  return material.tier || 1
}

const getCategoryOrder = (category: IndustryType): number => {
  const order: Record<IndustryType, number> = {
    'Resource Extraction': 1,
    'Metallurgy': 2,
    'Chemistry': 3,
    'Agriculture': 4,
    'Food Production': 5,
    'Manufacturing': 6,
    'Construction': 7,
    'Electronics': 8,
    'Science': 9,
    'Residential': 10
  }
  return order[category] || 999
}

const totalMaterialsCount = computed(() => {
  return Object.keys(props.materials).length + Object.keys(props.workerConsumption).length
})

const filteredMaterialsAll = computed(() => {
  let materialsArray = Object.entries(props.materials)
  
  // Apply search filter
  if (searchFilter.value) {
    const search = searchFilter.value.toLowerCase()
    materialsArray = materialsArray.filter(([key, material]) =>
      material.name.toLowerCase().includes(search) || key.toLowerCase().includes(search)
    )
  }
  
  // Apply tier filter
  if (tierFilter.value) {
    const tier = Number(tierFilter.value)
    materialsArray = materialsArray.filter(([key]) => getTier(key) === tier)
  }
  
  // Apply category filter
  if (categoryFilter.value) {
    materialsArray = materialsArray.filter(([key, material]) => material.category === categoryFilter.value)
  }
  
  // Filter out materials without price if hideWithoutPrice is true
  if (hideWithoutPrice.value) {
    materialsArray = materialsArray.filter(([key]) => {
      const price = props.prices[key]
      return price && price > 0
    })
  }
  
  // Show only locked prices
  if (showOnlyLocked.value) {
    materialsArray = materialsArray.filter(([key]) => props.lockedPrices[key])
  }
  
  // Sort by: category, tier, name
  return materialsArray.sort(([keyA, a], [keyB, b]) => {
    const categoryOrderA = getCategoryOrder(a.category)
    const categoryOrderB = getCategoryOrder(b.category)
    
    if (categoryOrderA !== categoryOrderB) {
      return categoryOrderA - categoryOrderB
    }
    
    const tierA = getTier(keyA)
    const tierB = getTier(keyB)
    
    if (tierA !== tierB) {
      return tierA - tierB
    }
    
    return a.name.localeCompare(b.name)
  })
})

const filteredMaterialsColumn1 = computed(() => {
  const half = Math.ceil(filteredMaterialsAll.value.length / 2)
  return filteredMaterialsAll.value.slice(0, half)
})

const filteredMaterialsColumn2 = computed(() => {
  const half = Math.ceil(filteredMaterialsAll.value.length / 2)
  return filteredMaterialsAll.value.slice(half)
})

const updatePrice = (key: string, value: string) => {
  if (props.lockedPrices[key]) return
  const newPrices = { ...props.prices, [key]: Number(value) }
  emit('update:prices', newPrices)
}

const updateStock = (key: string, value: string) => {
  const newStock = { ...props.stock, [key]: Number(value) }
  emit('update:stock', newStock)
}

const toggleLockPrice = (key: string) => {
  const newLockedPrices = { ...props.lockedPrices, [key]: !props.lockedPrices[key] }
  emit('update:lockedPrices', newLockedPrices)
}

const handleStockImport = () => {
  const text = importStockText.value.trim()
  if (!text) {
    importStockStatus.value = null
    return
  }

  const result = parseStockData(text, MATERIAL_NAME_TO_KEY)
  
  if (result.success && result.data) {
    emit('update:stock', { ...props.stock, ...result.data })
  }
  
  importStockStatus.value = {
    success: result.success,
    message: result.message,
  }
}

const handlePricesImport = () => {
  const text = importPricesText.value.trim()
  if (!text) {
    importPricesStatus.value = null
    return
  }

  const result = parsePricesData(text, MATERIAL_NAME_TO_KEY)
  
  if (result.success && result.data) {
    // Only update prices that are not locked
    const newPrices = { ...props.prices }
    for (const [key, value] of Object.entries(result.data)) {
      if (!props.lockedPrices[key]) {
        newPrices[key] = value
      }
    }
    emit('update:prices', newPrices)
    
    const lockedCount = Object.keys(result.data).filter(key => props.lockedPrices[key]).length
    if (lockedCount > 0) {
      importPricesStatus.value = {
        success: true,
        message: `${result.message} (${lockedCount} locked prices were not updated)`,
      }
      return
    }
  }
  
  importPricesStatus.value = {
    success: result.success,
    message: result.message,
  }
}

const fetchApiPrices = async () => {
  isLoadingApiPrices.value = true
  apiPricesStatus.value = null
  
  try {
    const apiPrices = await fetchMaterialPrices()
    
    // Map API material IDs to our material keys
    const newCurrentPrices: Record<string, number> = {}
    const newAvgPrices: Record<string, number> = {}
    
    let updatedCount = 0
    let lockedCount = 0
    
    for (const apiPrice of apiPrices) {
      // Find material by ID
      const materialEntry = Object.entries(props.materials).find(
        ([_, material]) => material.id === apiPrice.matId
      )
      
      if (materialEntry) {
        const [key] = materialEntry
        
        // Convert from cents to currency units
        newCurrentPrices[key] = apiPrice.currentPrice > 0 ? apiPrice.currentPrice / 100 : 0
        newAvgPrices[key] = apiPrice.avgPrice > 0 ? apiPrice.avgPrice / 100 : 0
        
        // Count if locked or updated
        if (props.lockedPrices[key]) {
          lockedCount++
        } else {
          updatedCount++
        }
      }
    }
    
    // Merge with existing prices
    emit('update:currentPrices', { ...props.currentPrices, ...newCurrentPrices })
    emit('update:avgPrices', { ...props.avgPrices, ...newAvgPrices })
    
    // Update active prices based on selected type (only for non-locked prices)
    const pricesToUse = props.usePriceType === 'current' ? newCurrentPrices : newAvgPrices
    const newPrices = { ...props.prices }
    
    for (const [key, value] of Object.entries(pricesToUse)) {
      if (!props.lockedPrices[key]) {
        newPrices[key] = value
      }
    }
    
    emit('update:prices', newPrices)
    
    apiPricesStatus.value = {
      success: true,
      message: `Loaded ${updatedCount} prices from API${lockedCount > 0 ? ` (${lockedCount} locked prices not updated)` : ''}`
    }
  } catch (error) {
    apiPricesStatus.value = {
      success: false,
      message: `Error loading prices: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  } finally {
    isLoadingApiPrices.value = false
  }
}

const updatePriceType = (type: 'current' | 'avg') => {
  emit('update:usePriceType', type)
  
  // Update active prices based on selected type
  const newPrices = { ...props.prices }
  const sourceprices = type === 'current' ? props.currentPrices : props.avgPrices
  
  for (const [key, value] of Object.entries(sourceprices)) {
    if (!props.lockedPrices[key] && value > 0) {
      newPrices[key] = value
    }
  }
  
  emit('update:prices', newPrices)
}
</script>
