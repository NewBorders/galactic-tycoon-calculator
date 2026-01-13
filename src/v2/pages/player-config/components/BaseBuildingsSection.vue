<script setup lang="ts">
import Draggable from 'vuedraggable'
import { computed } from 'vue'
import type { Building } from '@/v2/services/gamedata/types'
import type { PlayerBuilding } from '@/v2/services/playerBases'
import MaterialIcon from '@/v2/components/MaterialIcon.vue'
import { translate } from '@/v2/localisation'

const props = defineProps<{
  baseId: string
  buildingRefs: PlayerBuilding[]
  currentBuildings?: PlayerBuilding[]
  lookup: Building[]
}>()

const emit = defineEmits<{
  update:[{ id: string; patch:{ level?:number } }]
  remove:[{ id: string }]
  reorder:[{ ids: string[] }]
  persist:[]
}>()

const buildingById = computed(() => new Map(props.lookup.map(b => [b.id, b])))

const currentBuildingsByBuildingId = computed(() => {
  const map = new Map<number, PlayerBuilding>()
  ;(props.currentBuildings ?? []).forEach((b) => {
    map.set(b.buildingId, b)
  })
  return map
})

const list = computed<PlayerBuilding[]>({
  get: () => props.buildingRefs,
  set: (val) => emit('reorder', { ids: val.map(v => v.id) }),
})
</script>

<template>
  <Draggable
    v-model="list"
    item-key="id"
    handle=".dnd-handle-bld"
    class="space-y-3"
    @end="$emit('persist')"
  >
    <template #item="{ element: inst }">
      <div 
        class="rounded border p-4 space-y-3 h-full transition-all"
        :class="inst.level === 0 ? 'border-slate-600 bg-slate-900/50 opacity-60' : 'border-slate-700 bg-slate-900'"
      >
        <!-- Header: Building name, controls -->
        <div class="flex items-start gap-3">
          <span class="dnd-handle-bld cursor-move px-2 py-1 border border-slate-700 rounded select-none">↕</span>
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate inline-flex items-center gap-1">
              <MaterialIcon :name="buildingById.get(inst.buildingId)?.name ?? ('#'+inst.buildingId)" variant="md" />
              <span class="truncate">{{ buildingById.get(inst.buildingId)?.name ?? ('#'+inst.buildingId) }}</span>
              <span v-if="inst.level === 0" class="text-xs text-amber-400 font-normal">({{ translate('disabled') }})</span>
            </div>
            <div class="text-xs text-slate-400">
              Tier {{ buildingById.get(inst.buildingId)?.tier ?? '-' }} • Spec {{ buildingById.get(inst.buildingId)?.specialization ?? '-' }}
            </div>
          </div>
          <button
            class="px-2 py-1 border border-slate-700 rounded hover:bg-slate-700"
            @click.stop="$emit('remove', { id: inst.id })"
          >
            {{ translate('delete') }}
          </button>
        </div>

        <!-- Current vs Planned section -->
        <div class="grid grid-cols-2 gap-4 mt-3">
          <!-- CURRENT (readonly) -->
          <div class="border-l border-slate-700 pl-3">
            <div class="text-xs font-semibold text-slate-400 mb-2">{{ translate('current') }}</div>
            <div v-if="currentBuildingsByBuildingId.has(inst.buildingId)" class="text-sm">
              <div class="text-slate-400">
                {{ translate('level') }}: 
                <span class="text-slate-300">{{ currentBuildingsByBuildingId.get(inst.buildingId)!.level }}</span>
              </div>
            </div>
            <div v-else class="text-xs text-slate-600 italic">
              —
            </div>
          </div>

          <!-- PLANNED (editable) -->
          <div class="border-l border-slate-700 pl-3">
            <div class="text-xs font-semibold text-slate-400 mb-2">{{ translate('planned') }}</div>
            <label class="text-sm text-slate-300">
              {{ translate('level') }}
              <input
                type="number" 
                min="0"
                class="ml-2 w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300"
                :value="inst.level"
                @input="e => $emit('update', { id: inst.id, patch:{ level: Math.max(0, Number((e.target as HTMLInputElement).value)) } })"
              />
            </label>
          </div>
        </div>
      </div>
    </template>
  </Draggable>
</template>
