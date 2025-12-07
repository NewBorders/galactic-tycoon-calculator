<script setup lang="ts">
import Draggable from 'vuedraggable'
import { computed } from 'vue'
import type { Building } from '@/v2/services/gamedata/types'
import type { PlayerBuilding } from '@/v2/services/playerBases'
import MaterialIcon from '@/v2/components/MaterialIcon.vue'

const props = defineProps<{
  baseId: string
  buildingRefs: PlayerBuilding[]
  lookup: Building[]
}>()

const emit = defineEmits<{
  update:[{ id: string; patch:{ level?:number } }]
  remove:[{ id: string }]
  reorder:[{ ids: string[] }]
  persist:[]
}>()

const buildingById = computed(() => new Map(props.lookup.map(b => [b.id, b])))

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
    class="grid gap-3 md:grid-cols-2"
    @end="$emit('persist')"
  >
    <template #item="{ element: inst }">
      <div class="rounded border border-slate-700 bg-slate-900 p-3 flex gap-3 items-start">
        <span class="dnd-handle-bld cursor-move px-2 py-1 border border-slate-700 rounded select-none">↕</span>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">
            <span class="inline-flex items-center gap-1">
              <MaterialIcon :name="buildingById.get(inst.buildingId)?.name ?? ('#'+inst.buildingId)" variant="md" />
              <span class="truncate">{{ buildingById.get(inst.buildingId)?.name ?? ('#'+inst.buildingId) }}</span>
            </span>
          </div>
          <div class="text-xs text-slate-400">
            Tier {{ buildingById.get(inst.buildingId)?.tier ?? '-' }} • Spec {{ buildingById.get(inst.buildingId)?.specialization ?? '-' }}
          </div>
          <div class="mt-2 flex gap-3 flex-wrap items-center">
            <label class="text-xs text-slate-400">Level
              <input
                type="number" min="0"
                class="ml-1 w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1"
                :value="inst.level"
                @input="e => $emit('update', { id: inst.id, patch:{ level: Math.max(0, Number((e.target as HTMLInputElement).value)) } })"
              />
            </label>
          </div>
        </div>
        <button
          class="px-2 py-1 border border-slate-700 rounded hover:bg-slate-700"
          @click.stop="$emit('remove', { id: inst.id })"
        >
          Remove
        </button>
      </div>
    </template>
  </Draggable>
</template>
