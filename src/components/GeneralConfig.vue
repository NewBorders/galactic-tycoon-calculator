<template>
  <div class="bg-gray-800 rounded-lg p-6 mb-6">
    <h2 class="text-xl font-semibold mb-4">General Settings</h2>
    
    <!-- Game Speed -->
    <div class="mb-6">
      <div>
        <label class="block text-sm text-gray-400 mb-2">Game Speed</label>
        <p class="text-sm text-gray-400 mb-2">Speed multiplier (1x, 2x, 4x, etc.)</p>
        <div class="flex items-center gap-2">
          <input
            type="number"
            :min="GAME_LIMITS.MIN_GAME_SPEED"
            :max="GAME_LIMITS.MAX_GAME_SPEED"
            :step="GAME_LIMITS.GAME_SPEED_STEP"
            :value="gameSpeed"
            @input="$emit('update:gameSpeed', Number(($event.target as HTMLInputElement).value))"
            class="w-32 bg-gray-700 rounded px-3 py-2 text-white"
          />
          <span class="text-gray-400">x</span>
        </div>
      </div>
    </div>

    <!-- Technology Levels -->
    <div class="border-t border-gray-700 pt-6">
      <h3 class="text-lg font-semibold mb-4">Technology Levels</h3>
      <p class="text-sm text-gray-400 mb-4">Percentage bonus for each industry type (reduces production time)</p>
      <div class="grid grid-cols-3 gap-4">
        <div v-for="industry in INDUSTRY_TYPES" :key="industry">
          <label class="block text-sm text-gray-400 mb-2">{{ industry }}</label>
          <div class="flex items-center gap-2">
            <input
              type="number"
              :min="GAME_LIMITS.MIN_TECH_LEVEL"
              :max="GAME_LIMITS.MAX_TECH_LEVEL"
              :value="props.technologyLevels[industry]"
              @input="updateTechnology(industry, Number(($event.target as HTMLInputElement).value))"
              class="w-24 bg-gray-700 rounded px-3 py-2 text-white"
            />
            <span class="text-gray-400">%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Data Management -->
    <div class="border-t border-gray-700 pt-6 mt-6">
      <h3 class="text-lg font-semibold mb-4">Data Management</h3>
      <div class="flex flex-wrap gap-3">
        <button
          @click="handleExport"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded flex items-center gap-2"
        >
          <Download :size="16" />
          Export Configuration
        </button>
        <label
          class="px-4 py-2 bg-green-600 hover:bg-green-500 rounded flex items-center gap-2 cursor-pointer"
        >
          <Upload :size="16" />
          Import Configuration
          <input
            type="file"
            accept=".json"
            @change="handleImport"
            class="hidden"
            ref="fileInput"
          />
        </label>
        <button
          @click="handleClear"
          class="px-4 py-2 bg-red-600 hover:bg-red-500 rounded flex items-center gap-2"
        >
          <Trash2 :size="16" />
          Clear All Data
        </button>
      </div>
      <p class="text-xs text-gray-500 mt-2">
        Export saves all buildings, prices, stock, and settings to a JSON file. Import restores from a previously exported file.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Download, Upload, Trash2 } from 'lucide-vue-next'
import type { IndustryType } from '../types'
import { GAME_LIMITS } from '../config/constants'
import { exportData, importData, clearAllData } from '../utils/storage/dataManagement'

interface Props {
  gameSpeed: number
  technologyLevels: Record<IndustryType, number>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:gameSpeed': [value: number]
  'update:technologyLevels': [value: Record<IndustryType, number>]
  'dataImported': []
}>()

const fileInput = ref<HTMLInputElement | null>(null)

const INDUSTRY_TYPES: IndustryType[] = [
  'Agriculture',
  'Chemistry',
  'Construction',
  'Electronics',
  'Food Production',
  'Manufacturing',
  'Metallurgy',
  'Resource Extraction',
  'Science'
]

const updateTechnology = (industry: IndustryType, value: number) => {
  emit('update:technologyLevels', {
    ...props.technologyLevels,
    [industry]: value
  })
}

const handleExport = () => {
  try {
    exportData()
  } catch (error) {
    alert('Failed to export data: ' + (error as Error).message)
  }
}

const handleImport = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  try {
    await importData(file)
    alert('Data imported successfully! Reloading page...')
    emit('dataImported')
    window.location.reload()
  } catch (error) {
    alert('Failed to import data: ' + (error as Error).message)
  }
  
  // Reset input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleClear = () => {
  const cleared = clearAllData()
  if (cleared) {
    alert('All data cleared! Reloading page...')
    window.location.reload()
  }
}
</script>
