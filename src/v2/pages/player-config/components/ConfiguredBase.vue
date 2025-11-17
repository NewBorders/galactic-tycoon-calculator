<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { Building, GameData, GdIndex, Planet } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import { translate } from '@/v2/localisation/localisation'
import BuildingSearch from './BuildingSearch.vue'
import BaseBuildingsSection from './BaseBuildingsSection.vue'
import ProductionSection from './ProductionSection.vue'
import BaseSummaryCard from './BaseSummaryCard.vue'
import SummaryCalculationsSection from './SummaryCalculationsSection.vue'

const props = defineProps<{
  base: PlayerBase
  planet?: Planet
  buildings: Building[]
  gameData: GameData
  index: GdIndex
  priceResolver: (materialId: number) => number
  technologyLevels: Partial<Record<number, number>>
  startingBonus: number
  timeframeHours: number
  isBaseOpen: (id: string) => boolean
  getSections: (id: string) => { buildings: boolean; production: boolean; dailySummary: boolean }
  isImporting?: boolean
}>()

const emit = defineEmits<{
  rename: [name: string]
  remove: []
  importFromGame: []
  addBuilding: [{ buildingId: number; level: number }]
  updateBuilding: [{ id: string; patch: { level?: number } }]
  removeBuilding: [{ id: string }]
  reorderBuildings: [{ ids: string[] }]
  addRecipe: [{ recipeId: number }]
  removeRecipe: [{ id: string }]
  reorderRecipes: [{ ids: string[] }]
  updateRecipe: [{ id: string; patch: { count?: number } }]
  setOptionalConsumables: [materialIds: number[]]
  updateStock: [Record<number, number>]
  persist: []
  toggleBase: [open: boolean]
  toggleSection: [{ which: 'buildings' | 'production' | 'dailySummary'; open: boolean }]
}>()

// Emit for importing base data from game API
// emit('importFromGame', ) will be handled by parent

// Name-Editing
const editing = ref(false)
const buf = ref(props.base.name || 'Base')
const inputRef = ref<HTMLInputElement | null>(null)

function startEdit() {
  editing.value = true
  buf.value = props.base.name || 'Base'
  nextTick(() => inputRef.value?.focus())
}

function saveEdit() {
  emit('rename', (buf.value || 'Base').slice(0, 20))
  editing.value = false
}

function cancelEdit() {
  editing.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    saveEdit()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelEdit()
  }
}
</script>

<template>
  <details
    class="border border-slate-700 rounded bg-slate-800"
    :open="isBaseOpen(base.id)"
    @toggle="emit('toggleBase', ($event.target as HTMLDetailsElement).open)"
  >
    <summary class="flex flex-col gap-1 px-3 py-2 cursor-pointer">
      <div class="flex items-center gap-2">
        <!-- Drag Handle -->
        <span class="dnd-handle cursor-move px-2 py-1 border border-slate-700 rounded select-none"
          >↕</span
        >

        <!-- Name + Edit-Controls -->
        <div class="flex items-center gap-2 min-w-0">
          <template v-if="editing">
            <input
              ref="inputRef"
              class="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-56"
              v-model="buf"
              maxlength="20"
              @click.stop
              @keydown="onKey"
            />
            <!-- Save -->
            <button
              class="px-2 py-1 border border-green-700 text-green-300 rounded hover:bg-green-900/30"
              @click.stop="saveEdit"
              :title="translate('save')"
            >
              <!-- Check Icon -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M20 6L9 17l-5-5"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <!-- Cancel -->
            <button
              class="px-2 py-1 border border-red-700 text-red-300 rounded hover:bg-red-900/30"
              @click.stop="cancelEdit"
              :title="translate('cancel')"
            >
              <!-- X Icon -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </template>
          <template v-else>
            <span class="px-2 py-1 bg-slate-900 border border-slate-700 rounded max-w-56 truncate">
              {{ props.base.name || 'Base' }}
            </span>
            <button
              class="px-2 py-1 border border-slate-700 rounded hover:bg-slate-700"
              @click.stop="startEdit"
              :title="translate('editName')"
            >
              <!-- Pencil Icon -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path d="M12 20h9" stroke-width="2" stroke-linecap="round" />
                <path
                  d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </template>
        </div>

        <!-- Import from game (manual overwrite) -->
        <button
          class="ml-auto px-2 py-1 border border-slate-700 rounded hover:bg-slate-700 mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
          @click.stop="emit('importFromGame')"
          :disabled="props.isImporting"
          :title="translate('importFromGame')"
        >
          {{ props.isImporting ? translate('importBaseLoading') : translate('importFromGameShort') ?? 'Import' }}
        </button>

        <!-- Delete Base -->
        <button
          class="px-2 py-1 border border-slate-700 rounded hover:bg-slate-700"
          @click.stop="emit('remove')"
        >
          {{ translate('delete') }}
        </button>
      </div>

      <!-- Planet-/Basisinfos in Kopfzeile, responsive -->
      <div class="text-sm text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
        <span class="whitespace-nowrap font-bold">
          {{ planet?.name ?? base.planetId }}
        </span>
        <span class="whitespace-nowrap">• Tier {{ planet?.tier ?? '-' }}</span>
        <span class="whitespace-nowrap">
          <span class="font-bold">• Mats:&nbsp;</span>
          <span
            v-for="(material, i) in planet?.materials ?? []"
            :key="material.id"
            class="text-slate-500"
          >
            {{ material.name }} ({{ material.abundanceRating }}%)
            <span v-if="i < (planet?.materials.length ?? 0) - 1">, </span>
          </span>
        </span>
        <span class="whitespace-nowrap">• Fertility: {{ planet?.fertility ?? '0' }}</span>
      </div>
    </summary>

    <details
      class="mt-2 border border-slate-700 rounded bg-slate-800"
      :open="getSections(base.id).dailySummary"
      @toggle="
        emit('toggleSection', {
          which: 'dailySummary',
          open: ($event.target as HTMLDetailsElement).open,
        })
      "
    >
      <summary class="px-3 py-2 cursor-pointer font-medium">
        {{ translate('summaryForHours', { hours: props.timeframeHours }) }}
<!--        <div class="mt-2 space-y-2 px-3">-->
          <BaseSummaryCard
            :base="base"
            :game-data="props.gameData"
            :index="props.index"
            :price-resolver="props.priceResolver"
            :technology-levels="props.technologyLevels"
            :starting-bonus="props.startingBonus"
            :timeframe-hours="props.timeframeHours"
          />
<!--        </div>-->
      </summary>
      <div class="p-3">
        <SummaryCalculationsSection
          :base="base"
          :game-data="props.gameData"
          :index="props.index"
          :price-resolver="props.priceResolver"
          :technology-levels="props.technologyLevels"
          :starting-bonus="props.startingBonus"
          :timeframe-hours="props.timeframeHours"
          @updateOptional="
            (materialIds) => {
              $emit('setOptionalConsumables', materialIds)
              $emit('persist')
            }
          "
          @updateStock="
            (stock) => {
              $emit('updateStock', stock)
              $emit('persist')
            }
          "
        />
      </div>
    </details>

    <!-- Production -->
    <details
      class="mt-2 border border-slate-700 rounded bg-slate-800"
      :open="getSections(base.id).production"
      @toggle="
        emit('toggleSection', {
          which: 'production',
          open: ($event.target as HTMLDetailsElement).open,
        })
      "
    >
      <summary class="px-3 py-2 cursor-pointer font-medium">
        {{ translate('sectionProduction') }}
      </summary>
      <div class="p-3">
        <ProductionSection
          :base="base"
          :game-data="props.gameData"
          :index="props.index"
          :price-resolver="props.priceResolver"
          :technology-levels="props.technologyLevels"
          :starting-bonus="props.startingBonus"
          :timeframe-hours="props.timeframeHours"
          @addRecipe="
            (payload) => {
              $emit('addRecipe', payload)
              $emit('persist')
            }
          "
          @removeRecipe="
            (payload) => {
              $emit('removeRecipe', payload)
              $emit('persist')
            }
          "
          @updateRecipe="
            (payload) => {
              $emit('updateRecipe', payload)
              $emit('persist')
            }
          "
          @reorderRecipes="
            (payload) => {
              $emit('reorderRecipes', payload)
              $emit('persist')
            }
          "
        />
      </div>
    </details>

    <!-- Buildings -->
    <details
      class="mt-2 border border-slate-700 rounded bg-slate-800"
      :open="getSections(base.id).buildings"
      @toggle="
        emit('toggleSection', {
          which: 'buildings',
          open: ($event.target as HTMLDetailsElement).open,
        })
      "
    >
      <summary class="px-3 py-2 cursor-pointer font-medium">
        {{ translate('sectionBuildings') }}
      </summary>
      <div class="p-3 space-y-3">
        <BuildingSearch
          :buildings="buildings"
          @select="
            (b) => {
              $emit('addBuilding', { buildingId: b.id, level: 1 })
              $emit('persist')
            }
          "
        />
        <BaseBuildingsSection
          :base-id="base.id"
          :building-refs="base.buildings"
          :lookup="buildings"
          @update="
            (p) => {
              $emit('updateBuilding', p)
              $emit('persist')
            }
          "
          @remove="
            (p) => {
              $emit('removeBuilding', p)
              $emit('persist')
            }
          "
          @reorder="
            (p) => {
              $emit('reorderBuildings', p)
              $emit('persist')
            }
          "
          @persist="$emit('persist')"
        />
      </div>
    </details>
  </details>
</template>
