<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="$emit('cancel')"
  >
    <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
      <h2 class="text-xl font-semibold mb-4">Select Building Type</h2>
      <p class="text-sm text-gray-400 mb-4">
        The building type cannot be changed after creation
      </p>
      <div class="mb-6">
        <label class="block text-sm text-gray-400 mb-2">Building Type</label>
        <select v-model="selectedType" class="w-full bg-gray-700 rounded px-3 py-2" autofocus>
          <option v-for="[key, bldg] in Object.entries(buildings)" :key="key" :value="key">
            {{ bldg.name }}
          </option>
        </select>
      </div>
      <div class="flex gap-3 justify-end">
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
import { ref, watch } from 'vue'
import type { Building } from '../types'

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
