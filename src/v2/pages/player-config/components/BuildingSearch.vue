<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Building } from '@/v2/services/gamedata/types'
import { translate } from '@/v2/localisation'
import MaterialIcon from '@/v2/components/MaterialIcon.vue'

const props = defineProps<{ buildings: Building[] }>()
const emit = defineEmits<{ select: [b: Building] }>()
const query = ref('')

const open = computed(() => query.value.trim().length >= 2)
const suggestions = computed(() => {
  if (!open.value) return []
  const q = query.value.trim().toLowerCase()
  return props.buildings.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 30)
})

function choose(b: Building) {
  emit('select', b)
  query.value = '' // reset
}
</script>

<template>
  <div class="relative max-w-2xl">
    <input
      v-model="query"
      :placeholder="translate('buildingSearch')"
      class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
    />
    <div
      v-if="open"
      class="absolute left-0 right-0 mt-1 z-20 rounded border border-slate-700 bg-slate-800 shadow-xl max-h-96 overflow-auto"
    >
      <template v-if="suggestions.length">
        <button
          v-for="b in suggestions"
          :key="b.id"
          class="w-full text-left p-3 hover:bg-slate-700 grid grid-cols-3 gap-2"
          @click="choose(b)"
        >
          <div class="font-medium truncate inline-flex items-center gap-1">
            <MaterialIcon :name="b.name" variant="md" />
            <span class="truncate">{{ b.name }}</span>
          </div>
          <div class="text-xs text-slate-400">Tier {{ b.tier }} • Spec {{ b.specialization }}</div>
          <div class="text-xs text-slate-500 truncate">
            Needs: {{ b.workersNeeded?.worker ?? 0 }}/{{ b.workersNeeded?.technician ?? 0 }}/{{
              b.workersNeeded?.engineer ?? 0
            }}/{{ b.workersNeeded?.scientist ?? 0 }}
          </div>
        </button>
      </template>
      <div v-else class="px-3 py-2 text-sm text-slate-400">{{ translate('noResults') }}</div>
    </div>
  </div>
</template>
