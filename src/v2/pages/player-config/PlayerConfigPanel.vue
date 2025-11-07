<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GameData, GdIndex, Planet } from '../../services/gamedata/service.ts'
import { searchPlanetsByName, useMaterialPricing } from '../../services/gamedata/service.ts'
import { usePlayerBases } from '../../services/playerBases.ts'
import Draggable from 'vuedraggable'
import { translate } from '../../localisation/localisation.ts'

import PlanetSearch from './components/PlanetSearch.vue'
import ConfiguredBase from './components/ConfiguredBase.vue'

const props = defineProps<{ gameData: GameData; index: GdIndex; gameDataLoadedAt?: number | null }>()
const {
  state,
  planetHasBase,
  addBase,
  removeBase,
  renameBase,
  persist,
  addBuilding,
  setBuilding,
  removeBuilding,
  reorderBuildings,
  addRecipe,
  removeRecipe,
  reorderRecipes,
  setOptionalConsumables,
  isBaseOpen,
  setBaseOpen,
  getSections,
  setSection,
} = usePlayerBases(props.gameData)

const query = ref('')

const suggestions = computed<Planet[]>(() => {
  const text = query.value.trim()
  if (text.length < 2) return []
  return searchPlanetsByName(props.gameData.planets, text)
})

const { priceResolver, refreshPrices, loading: priceLoading, error: priceError, lastFetched: priceLastFetched } =
  useMaterialPricing(props.gameData)

function formatTimestamp(value: number | null | undefined) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return '—'
  }
}

const formattedPriceTimestamp = computed(() => formatTimestamp(priceLastFetched.value ?? null))
const formattedGameDataTimestamp = computed(() => formatTimestamp(props.gameDataLoadedAt ?? null))

function selectPlanet(planet: Planet) {
  if (!planetHasBase(planet.id)) addBase(planet.id)
  query.value = ''
  persist()
}

function getPlanetById(id: number) {
  return props.gameData.planets.find((pl) => pl.id === id)
}
</script>

<template>
  <div class="space-y-4 text-slate-100">
    <div class="flex flex-wrap items-center gap-3 justify-end text-xs text-slate-400">
      <div>
        {{ translate('gameDataTimestamp') }}
        <span class="text-slate-200">{{ formattedGameDataTimestamp }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span>
          {{ translate('priceLastUpdated') }}
          <span class="text-slate-200">{{ formattedPriceTimestamp }}</span>
        </span>
        <button
          class="px-2 py-1 border border-slate-700 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
          :disabled="priceLoading"
          @click="refreshPrices()"
        >
          {{ priceLoading ? translate('priceRefreshing') : translate('priceRefresh') }}
        </button>
      </div>
      <div v-if="priceError" class="text-amber-300">
        {{ translate('priceError') }}: {{ priceError }}
      </div>
    </div>

    <PlanetSearch
      v-model:query="query"
      :suggestions="suggestions"
      :hasBase="planetHasBase"
      @select="selectPlanet"
    />

    <!-- Bases -->
    <Draggable
      v-model="state.bases"
      item-key="id"
      handle=".dnd-handle"
      class="space-y-3"
      @end="persist"
    >
      <template #item="{ element: base }">
        <ConfiguredBase
          :base="base"
          :planet="getPlanetById(base.planetId)"
          :buildings="props.gameData.buildings"
          :game-data="props.gameData"
          :index="props.index"
          :price-resolver="priceResolver"
          :isBaseOpen="(id) => isBaseOpen(id)"
          :getSections="(id) => getSections(id)"
          @toggleBase="
            (open) => {
              setBaseOpen(base.id, open)
              persist()
            }
          "
          @toggleSection="
            ({ which, open }) => {
              setSection(base.id, which, open)
              persist()
            }
          "
          @rename="
            (name) => {
              renameBase(base.id, name)
              persist()
            }
          "
          @remove="
            () => {
              removeBase(base.id)
              persist()
            }
          "
          @addBuilding="
            ({ buildingId, level }) => {
              addBuilding(base.id, buildingId, level)
              persist()
            }
          "
          @updateBuilding="
            ({ id, patch }) => {
              setBuilding(base.id, id, patch)
              persist()
            }
          "
          @removeBuilding="
            ({ id }) => {
              removeBuilding(base.id, id)
              persist()
            }
          "
          @reorderBuildings="
            ({ ids }) => {
              reorderBuildings(base.id, ids)
              persist()
            }
          "
          @addRecipe="
            ({ recipeId }) => {
              addRecipe(base.id, recipeId)
              persist()
            }
          "
          @removeRecipe="
            ({ id }) => {
              removeRecipe(base.id, id)
              persist()
            }
          "
          @reorderRecipes="
            ({ ids }) => {
              reorderRecipes(base.id, ids)
              persist()
            }
          "
          @setOptionalConsumables="
            (materialIds) => {
              setOptionalConsumables(base.id, materialIds)
              persist()
            }
          "
          @persist="persist"
        />
      </template>
    </Draggable>
  </div>
</template>
