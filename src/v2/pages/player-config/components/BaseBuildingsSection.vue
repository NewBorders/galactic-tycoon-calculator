<script setup lang="ts">
import { buildingCostsRepository } from '@/v2/services/buildingCosts/buildingCosts.service'
import { getGameData } from '@/v2/services/gamedata/gameDataRepository'
const gameData = getGameData()
import { computed } from 'vue'
import type { Building } from '@/v2/services/gamedata/types'
import type { PlayerBuilding } from '@/v2/services/playerBases'
import MaterialIcon from '@/v2/components/MaterialIcon.vue'
import NumberInput from '@/v2/components/NumberInput.vue'
import { translate } from '@/v2/localisation'

const props = defineProps<{
  baseId: string
  buildingRefs: PlayerBuilding[]
  currentBuildings?: PlayerBuilding[]
  lookup: Building[]
}>()

defineEmits<{
  update:[{ id: string; patch:{ level?:number } }]
  remove:[{ id: string }]
  persist:[]
}>()

const buildingById = computed(() => new Map(props.lookup.map(b => [b.id, b])))
const validBuildingRefs = computed(() =>
  props.buildingRefs.filter(inst => inst && inst.buildingId !== undefined && buildingById.value.get(inst.buildingId))
)

const EXTRA_MATERIAL_IDS = [90, 120, 121] as const

const extraCostByInstanceId = computed(() => {
  const map = new Map<string, { materialId: number; materialName: string; amount: number }>()
  const byId = buildingById.value
  const materials = gameData.materials

  for (const inst of validBuildingRefs.value) {
    const building = byId.get(inst.buildingId)
    if (!building) continue

    const costMap = buildingCostsRepository.getSingleLevelCost(building, building.tier, inst.level)
    const extraMaterialId = EXTRA_MATERIAL_IDS.find(id => costMap.has(id))
    if (!extraMaterialId) continue

    const amount = costMap.get(extraMaterialId)
    if (!amount) continue

    const materialName = materials.find(m => m.id === extraMaterialId)?.name ?? `#${extraMaterialId}`
    map.set(inst.id, { materialId: extraMaterialId, materialName, amount })
  }

  return map
})
</script>

<template>
  <!-- Buildings are displayed in Game order (by slotId) and cannot be reordered in the tool -->
  <!-- User must reorder buildings in-game; tool always reflects game order -->
  <div class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
    <div
      v-for="inst in validBuildingRefs"
      :key="inst.id"
      :id="`building-tile-${inst.id}`"
      class="rounded border p-3 transition-all relative"
      :class="(() => {
        // Compare planned vs current using slotId (not array index)
        const currentForSlot = inst.slotId != null
          ? props.currentBuildings?.find(cb => cb.slotId === inst.slotId)
          : null
        const cur = currentForSlot?.level ?? 0
        const changed = cur !== inst.level
        if (changed) return 'border-blue-700 bg-blue-900'
        return inst.level === 0 ? 'border-slate-600 bg-slate-900/50 opacity-60' : 'border-slate-700 bg-slate-900'
      })()"
    >
      <!-- Slot Number Badge (top-right) - displays slotId (negative = planned, positive = game slot) -->
      <div class="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
        <span v-if="inst.slotId == null">?</span>
        <span v-else-if="inst.slotId >= 0">#{{ inst.slotId + 1 }}</span>
        <span v-else title="Planned building (not yet in game)">~</span>
      </div>

      <!-- Header: Building name -->
      <div class="flex items-start gap-3 mb-2">
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
      </div>

      <!-- Current vs Planned - compact -->
      <div class="flex gap-3 items-center justify-between">
        <!-- CURRENT (readonly, inline) -->
        <div class="text-xs text-slate-400 flex items-center gap-2">
          <span class="font-semibold">{{ translate('current') }}:</span>
          <span v-if="(() => {
            const currentForSlot = inst.slotId != null
              ? currentBuildings?.find(cb => cb.slotId === inst.slotId)
              : null
            return currentForSlot
          })()" class="text-slate-300">
            Lvl {{ (() => {
              const currentForSlot = inst.slotId != null
                ? currentBuildings?.find(cb => cb.slotId === inst.slotId)
                : null
              return currentForSlot?.level
            })() }}
          </span>
          <span v-else class="text-slate-600">—</span>
        </div>

        <!-- PLANNED (editable, inline) -->
        <div class="flex items-center gap-2">
          <label class="text-xs text-slate-400 font-semibold">
            {{ translate('planned') }}:
          </label>
          <NumberInput
            :id="`building-input-${inst.id}`"
            :model-value="inst.level"
            width="sm"
            :min="0"
            :max="999"
            @update:model-value="(newLevel) => $emit('update', { id: inst.id, patch: { level: newLevel } })"
          />
          <button
            class="px-2 py-1 text-xs border border-slate-700 rounded hover:bg-slate-700"
            @click.stop="$emit('remove', { id: inst.id })"
          >
            {{ translate('delete') }}
          </button>
        </div>
      </div>

      <!-- Zusatzkosten für Tier 2, 3, 4 -->
      <div v-if="extraCostByInstanceId.get(inst.id)" class="mt-2 text-xs text-slate-400 flex items-center gap-2">
        <span>{{ translate('extra_costs') }}:</span>
        <template v-if="extraCostByInstanceId.get(inst.id)">
          <MaterialIcon
            :name="extraCostByInstanceId.get(inst.id)!.materialName"
            variant="xs"
          />
          <span>
            {{ extraCostByInstanceId.get(inst.id)!.amount }}
          </span>
        </template>
      </div>
    </div>
  </div>
</template>
