<script setup lang="ts">
import { computed } from 'vue'
import type { Planet } from '@/v2/services/gamedata/types.ts'
import { translate } from '@/v2/localisation/localisation.ts'

const props = defineProps<{
  suggestions: Planet[]
  hasBase: (planetId: number) => boolean
  query: string
}>()
const emit = defineEmits<{
  'update:query':[val: string],
  select:[planet: Planet],
}>()

const open = computed(() => props.query.trim().length >= 2)
</script>

<template>
  <div class="relative max-w-xl">
    <input
      :value="query"
      @input="e => emit('update:query', (e.target as HTMLInputElement).value)"
      :placeholder="translate('planetSearch')"
      class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
      autocomplete="off"
    />

    <div
      v-if="open"
      class="absolute left-0 right-0 mt-1 z-20 rounded border border-slate-700 bg-slate-800 shadow-xl max-h-80 overflow-auto"
    >
      <template v-if="suggestions.length">
        <button
          v-for="planet in suggestions"
          :key="planet.id"
          class="w-full text-left px-3 py-2 hover:bg-slate-700 disabled:opacity-50"
          :disabled="hasBase(planet.id)"
          @click="emit('select', planet)"
        >
          <div class="font-medium">{{ planet.name }}</div>
          <div class="text-xs text-slate-400">
            ID {{ planet.id }} • Tier {{ planet.tier }} • Fertility {{ planet.fertility }}
          </div>
          <div class="text-xs text-slate-500">
            Mats:
            <span
              v-for="(material, index) in planet.materials"
              :key="material.id"
            >
              {{ material.name }} ({{ material.abundanceRating }}%)
              <span v-if="index < planet.materials.length - 1">, </span>
            </span>
          </div>
          <div v-if="hasBase(planet.id)" class="text-xs text-amber-400">{{ translate('alreadyAdded') }}</div>
        </button>
      </template>
      <div v-else class="px-3 py-2 text-sm text-slate-400">
        {{ translate('noResults') }}
      </div>
    </div>
  </div>
</template>
