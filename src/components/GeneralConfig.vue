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
            min="0.1"
            max="10"
            step="0.1"
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
              min="0"
              max="100"
              :value="props.technologyLevels[industry]"
              @input="updateTechnology(industry, Number(($event.target as HTMLInputElement).value))"
              class="w-24 bg-gray-700 rounded px-3 py-2 text-white"
            />
            <span class="text-gray-400">%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IndustryType } from '../types'

interface Props {
  gameSpeed: number
  technologyLevels: Record<IndustryType, number>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:gameSpeed': [value: number]
  'update:technologyLevels': [value: Record<IndustryType, number>]
}>()

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
</script>
