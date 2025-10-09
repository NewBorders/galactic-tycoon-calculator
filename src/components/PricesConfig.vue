<template>
  <div v-if="show" class="bg-gray-800 rounded-lg p-6 mb-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Prices and Stock Configuration</h2>
      <button
        @click="hideWithoutPrice = !hideWithoutPrice"
        class="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
      >
        {{ hideWithoutPrice ? 'Show All' : 'Hide Without Price' }}
      </button>
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
        <button
          v-if="importPricesText"
          @click="clearImportPricesText"
          class="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm text-gray-300"
        >
          Clear
        </button>
      </div>
      <p class="text-sm text-gray-400 mb-3">Paste the prices data copied from the game:</p>
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

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-700">
            <th class="text-left py-2 px-2 text-gray-400">Material</th>
            <th class="text-right py-2 px-2 text-gray-400">Price</th>
            <th class="text-right py-2 px-2 text-gray-400">Stock</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="[key, material] in sortedMaterials"
            :key="key"
            class="border-b border-gray-700/50"
          >
            <td class="py-2 px-2 text-gray-300">{{ material.name }}</td>
            <td class="py-2 px-2">
              <input
                type="number"
                step="0.01"
                :value="prices[key] || 0"
                @input="updatePrice(key, ($event.target as HTMLInputElement).value)"
                class="w-full bg-gray-700 rounded px-2 py-1 text-white text-right"
                placeholder="0.00"
              />
            </td>
            <td class="py-2 px-2">
              <input
                type="number"
                step="1"
                :value="stock[key] || 0"
                @input="updateStock(key, ($event.target as HTMLInputElement).value)"
                class="w-full bg-gray-700 rounded px-2 py-1 text-white text-right"
                placeholder="0"
              />
            </td>
          </tr>
          <tr
            v-for="resource in sortedWorkerResources"
            :key="resource"
            class="border-b border-gray-700/50"
          >
            <td class="py-2 px-2 text-gray-300 capitalize">{{ resource.replace(/_/g, ' ') }}</td>
            <td class="py-2 px-2">
              <input
                type="number"
                step="0.01"
                :value="prices[resource] || 0"
                @input="updatePrice(resource, ($event.target as HTMLInputElement).value)"
                class="w-full bg-gray-700 rounded px-2 py-1 text-white text-right"
                placeholder="0.00"
              />
            </td>
            <td class="py-2 px-2">
              <input
                type="number"
                step="1"
                :value="stock[resource] || 0"
                @input="updateStock(resource, ($event.target as HTMLInputElement).value)"
                class="w-full bg-gray-700 rounded px-2 py-1 text-white text-right"
                placeholder="0"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Material } from '../types'
import { MATERIAL_NAME_TO_KEY } from '../data/materialNameMapping'
import { parseStockData, parsePricesData } from '../utils/parsing'

interface Props {
  show: boolean
  materials: Record<string, Material>
  workerConsumption: Record<string, number>
  prices: Record<string, number>
  stock: Record<string, number>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:prices': [prices: Record<string, number>]
  'update:stock': [stock: Record<string, number>]
}>()

const importStockText = ref('')
const importStockStatus = ref<{ success: boolean; message: string } | null>(null)

const importPricesText = ref('')
const importPricesStatus = ref<{ success: boolean; message: string } | null>(null)

const hideWithoutPrice = ref(false)

const clearImportStockText = () => {
  importStockText.value = ''
  importStockStatus.value = null
}

const clearImportPricesText = () => {
  importPricesText.value = ''
  importPricesStatus.value = null
}

const sortedMaterials = computed(() => {
  let materialsArray = Object.entries(props.materials)
  
  // Filter out materials without price if hideWithoutPrice is true
  if (hideWithoutPrice.value) {
    materialsArray = materialsArray.filter(([key]) => {
      const price = props.prices[key]
      return price && price > 0
    })
  }
  
  return materialsArray.sort(([, a], [, b]) => a.name.localeCompare(b.name))
})

const sortedWorkerResources = computed(() => {
  let resources = Object.keys(props.workerConsumption)
  
  // Filter out resources without price if hideWithoutPrice is true
  if (hideWithoutPrice.value) {
    resources = resources.filter((key) => {
      const price = props.prices[key]
      return price && price > 0
    })
  }
  
  return resources.sort((a, b) => a.replace(/_/g, ' ').localeCompare(b.replace(/_/g, ' ')))
})

const updatePrice = (key: string, value: string) => {
  const newPrices = { ...props.prices, [key]: Number(value) }
  emit('update:prices', newPrices)
}

const updateStock = (key: string, value: string) => {
  const newStock = { ...props.stock, [key]: Number(value) }
  emit('update:stock', newStock)
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
    emit('update:prices', { ...props.prices, ...result.data })
  }
  
  importPricesStatus.value = {
    success: result.success,
    message: result.message,
  }
}
</script>
