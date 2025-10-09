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
        @input="parseImportStockText"
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
        @input="parseImportPricesText"
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

// Mapping from game names to internal keys
const nameToKeyMap: Record<string, string> = {
  // Tier 1 - Raw Materials
  'iron ore': 'iron_ore',
  silica: 'silica',
  limestone: 'limestone',
  grain: 'grain',
  oxygen: 'oxygen',
  water: 'water',
  hydrogen: 'hydrogen',
  carbon: 'carbon',
  nitrogen: 'nitrogen',
  'aluminium ore': 'aluminium_ore',

  // Tier 1 - Processed Materials
  iron: 'iron',
  concrete: 'concrete',
  polyethylene: 'polyethylene',
  glass: 'glass',
  steel: 'steel',
  flux: 'flux',
  aluminium: 'aluminium',
  rubber: 'rubber',
  ethanol: 'ethanol',
  lubricant: 'lubricant',
  'color compound': 'color_compound',

  // Tier 1 - Food & Organic
  fruits: 'fruits',
  vegetables: 'vegetables',
  cows: 'cows',
  meat: 'meat',
  cotton: 'cotton',
  wood: 'wood',
  leather: 'leather',
  fabric: 'fabric',

  // Tier 1 - Manufactured
  'construction kit': 'construction_kit',
  'construction tools': 'construction_tools',
  'prefab kit': 'prefab_kit',
  amenities: 'amenities',
  pipes: 'pipes',
  'office supplies': 'office_supplies',
  furniture: 'furniture',
  truss: 'truss',
  'welding kit': 'welding_kit',
  'hull plate': 'hull_plate',

  // Tier 1 - Consumables
  rations: 'rations',
  'drinking water': 'drinking_water',
  tools: 'tools',
  ale: 'ale',
  workwear: 'workwear',
  'hydrogen fuel': 'hydrogen_fuel',

  // Tier 1 - Special
  'research data': 'research_data',

  // Tier 2 - Raw Materials
  'copper ore': 'copper_ore',
  'titanium ore': 'titanium_ore',
  'platinum ore': 'platinum_ore',
  argon: 'argon',

  // Tier 2 - Processed Materials
  copper: 'copper',
  titanium: 'titanium',
  neoplast: 'neoplast',
  fertilizer: 'fertilizer',
  'sulfuric acid': 'sulfuric_acid',
  lithium: 'lithium',
  'copper wire': 'copper_wire',
  coolant: 'coolant',
  epoxy: 'epoxy',
  kevlar: 'kevlar',
  aerogel: 'aerogel',
  durablend: 'durablend',
  'neoplast sheet': 'neoplast_sheet',

  // Tier 2 - Food & Organic
  milk: 'milk',
  'fine rations': 'fine_rations',
  'coffee beans': 'coffee_beans',
  coffee: 'coffee',
  chickens: 'chickens',
  honeycaps: 'honeycaps',
  sugar: 'sugar',
  pie: 'pie',
  eggs: 'eggs',
  herbs: 'herbs',
  vitaqua: 'vitaqua',

  // Tier 2 - Manufactured & Components
  'combustion engine': 'combustion_engine',
  'electric motor': 'electric_motor',
  battery: 'battery',
  'electronic circuit': 'electronic_circuit',
  'consumer electronics': 'consumer_electronics',
  transistor: 'transistor',
  chip: 'chip',
  'silicon wafer': 'silicon_wafer',
  'advanced circuit board': 'advanced_circuit_board',
  pump: 'pump',
  'cooling system': 'cooling_system',
  'control console': 'control_console',
  'reinforced glass': 'reinforced_glass',
  'insulation panels': 'insulation_panels',
  'pressure sealant kit': 'pressure_sealant_kit',
  'modern prefab kit': 'modern_prefab_kit',
  'composite truss': 'composite_truss',

  // Tier 2 - Spaceship Components
  'life support system': 'life_support_system',
  'ship interior kit': 'ship_interior_kit',
  'cargo bay segment': 'cargo_bay_segment',
  'fuel tank segment': 'fuel_tank_segment',
  'heat shielding': 'heat_shielding',
  'shuttle bridge': 'shuttle_bridge',
  'hydrogen generator': 'hydrogen_generator',
  'linear ftl emitter': 'linear_ftl_emitter',
  'mining vehicle': 'mining_vehicle',
  drone: 'drone',

  // Tier 2 - Consumables
  'advanced tools': 'advanced_tools',
  exosuit: 'exosuit',
  'ship repair kit': 'ship_repair_kit',

  // Tier 2 - Special
  'structural elements': 'structural_elements',
  'construction vehicle': 'construction_vehicle',
  drill: 'drill',
  'advanced research data': 'advanced_research_data',
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

const parseImportStockText = () => {
  const text = importStockText.value.trim()
  if (!text) {
    importStockStatus.value = null
    return
  }

  try {
    // Split by lines and clean up
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    const newStock: Record<string, number> = { ...props.stock }
    let updatedCount = 0
    const notFoundItems: string[] = []

    // Process lines in pairs or check for tab-separated format
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Check if this line contains tabs (single-line format)
      if (line.includes('\t')) {
        const parts = line.split('\t')
        if (parts.length >= 2) {
          const name = parts[0].toLowerCase().trim()
          const quantityStr = parts[1].trim()
          const quantity = parseInt(quantityStr, 10)

          if (!isNaN(quantity)) {
            const key = nameToKeyMap[name]
            if (key) {
              newStock[key] = quantity
              updatedCount++
            } else {
              notFoundItems.push(name)
            }
          }
        }
      } else {
        // Multi-line format: name on one line, quantity on next
        const name = line.toLowerCase().trim()

        // Check if next line exists and contains a number
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]
          // Try to extract number from next line (format: "45  7t" or "45\t7t")
          const match = nextLine.match(/^(\d+)/)

          if (match) {
            const quantity = parseInt(match[1], 10)
            const key = nameToKeyMap[name]

            if (key) {
              newStock[key] = quantity
              updatedCount++
              i++ // Skip the next line as we've already processed it
            } else {
              notFoundItems.push(name)
              i++ // Skip the next line
            }
          }
        }
      }
    }

    if (updatedCount > 0) {
      emit('update:stock', newStock)
      let message = `✓ Successfully imported ${updatedCount} items`
      if (notFoundItems.length > 0) {
        message += ` (${notFoundItems.length} items not found: ${notFoundItems.join(', ')})`
      }
      importStockStatus.value = { success: true, message }
    } else {
      importStockStatus.value = {
        success: false,
        message: '✗ No valid items found. Check the format.',
      }
    }
  } catch (error) {
    importStockStatus.value = {
      success: false,
      message: '✗ Error parsing data. Please check the format.',
    }
  }
}

const parseImportPricesText = () => {
  const text = importPricesText.value.trim()
  if (!text) {
    importPricesStatus.value = null
    return
  }

  try {
    // Split by lines and clean up
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    const newPrices: Record<string, number> = { ...props.prices }
    let updatedCount = 0
    const notFoundItems: string[] = []

    // Process each line
    for (const line of lines) {
      // Skip header line
      if (line.toLowerCase().includes('material') && line.toLowerCase().includes('price')) {
        continue
      }

      // Split by tab
      const parts = line
        .split('\t')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)

      if (parts.length >= 2) {
        const name = parts[0].toLowerCase().trim()

        // The price could be in the last column (skip "Selling" column if present)
        const priceStr = parts[parts.length - 1]

        // Remove currency symbols: "65,00$" -> "65,00"
        let cleanPrice = priceStr.replace(/[$€£]/g, '')
        // Replace comma with dot for decimal separator: "65,00" -> "65.00"
        cleanPrice = cleanPrice.replace(',', '.')
        const price = parseFloat(cleanPrice)

        if (!isNaN(price)) {
          const key = nameToKeyMap[name]

          if (key) {
            newPrices[key] = price
            updatedCount++
          } else {
            notFoundItems.push(name)
          }
        }
      }
    }

    if (updatedCount > 0) {
      emit('update:prices', newPrices)
      let message = `✓ Successfully imported ${updatedCount} prices`
      if (notFoundItems.length > 0) {
        message += ` (${notFoundItems.length} items not found: ${notFoundItems.join(', ')})`
      }
      importPricesStatus.value = { success: true, message }
    } else {
      importPricesStatus.value = {
        success: false,
        message: '✗ No valid prices found. Check the format.',
      }
    }
  } catch (error) {
    importPricesStatus.value = {
      success: false,
      message: '✗ Error parsing data. Please check the format.',
    }
  }
}
</script>
