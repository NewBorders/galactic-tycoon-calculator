<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { GameData, GdIndex, Planet } from '../../services/gamedata/service.ts'
import { searchPlanetsByName, useMaterialPricing } from '../../services/gamedata/service.ts'
import { usePlayerBases } from '../../services/playerBases.ts'
import Draggable from 'vuedraggable'
import { translate } from '../../localisation/localisation.ts'

import PlanetSearch from './components/PlanetSearch.vue'
import ConfiguredBase from './components/ConfiguredBase.vue'
import ApiConfigPanel from './components/ApiConfigPanel.vue'
import { usePlayerTechnology } from '@/v2/services/playerTechnology'

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
  setRecipeCount,
  setOptionalConsumables,
  setStock,
  syncBaseFromApi,
  updateBaseStockFromApi,
  isBaseOpen,
  setBaseOpen,
  getSections,
  setSection,
} = usePlayerBases(props.gameData)

const { state: technologyState } = usePlayerTechnology()
const technologyLevels = computed(() => technologyState.value.levels ?? {})
const startingBonus = computed(() => technologyState.value.startingBonus ?? 1)

const query = ref('')

const TIMEFRAME_STORAGE_KEY = 'gt:v2:timeframeHours'
const DEFAULT_TIMEFRAME_HOURS = 24

function sanitizeTimeframe(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return DEFAULT_TIMEFRAME_HOURS
  const clamped = Math.min(336, Math.max(1, Math.round(numeric)))
  return clamped
}

function loadTimeframe(): number {
  try {
    const raw = localStorage.getItem(TIMEFRAME_STORAGE_KEY)
    if (raw == null) return DEFAULT_TIMEFRAME_HOURS
    return sanitizeTimeframe(Number(raw))
  } catch {
    return DEFAULT_TIMEFRAME_HOURS
  }
}

const timeframeHours = ref(loadTimeframe())

const suggestions = computed<Planet[]>(() => {
  const text = query.value.trim()
  if (text.length < 2) return []
  return searchPlanetsByName(props.gameData.planets, text)
})

const {
  priceResolver,
  refreshPrices,
  loading: priceLoading,
  error: priceError,
  lastFetched: priceLastFetched,
  nextRefreshAt: priceNextRefreshAt,
} = useMaterialPricing(props.gameData)

function formatTimestamp(value: number | null | undefined) {
  if (!value) return '—'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hours = `${date.getHours()}`.padStart(2, '0')
    const minutes = `${date.getMinutes()}`.padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch {
    return '—'
  }
}

const formattedPriceTimestamp = computed(() => formatTimestamp(priceLastFetched.value ?? null))
const formattedGameDataTimestamp = computed(() => formatTimestamp(props.gameDataLoadedAt ?? null))

const refreshCountdown = ref('—')
let refreshTimer: ReturnType<typeof setInterval> | null = null

function formatCountdown(ms: number | null) {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms <= 0) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`
}

function updateCountdown() {
  if (priceLoading.value) {
    refreshCountdown.value = '…'
    return
  }
  const target = priceNextRefreshAt.value
  if (!target) {
    refreshCountdown.value = '—'
    return
  }
  const msRemaining = target - Date.now()
  refreshCountdown.value = formatCountdown(msRemaining)
}

watch([priceNextRefreshAt, priceLoading], () => {
  updateCountdown()
})

onMounted(() => {
  updateCountdown()
  refreshTimer = setInterval(() => {
    updateCountdown()
  }, 1000)
})

onBeforeUnmount(() => {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

function selectPlanet(planet: Planet) {
  if (!planetHasBase(planet.id)) addBase(planet.id)
  query.value = ''
  persist()
}

function getPlanetById(id: number) {
  return props.gameData.planets.find((pl) => pl.id === id)
}

watch(
  timeframeHours,
  (value) => {
    const sanitized = sanitizeTimeframe(value)
    if (sanitized !== value) {
      timeframeHours.value = sanitized
      return
    }
    try {
      localStorage.setItem(TIMEFRAME_STORAGE_KEY, String(sanitized))
    } catch {}
  },
  { immediate: false },
)

function handleBasesLoaded(
  bases: Array<{ id: number; name: string; planetId: number; warehouseId: number }>,
) {
  bases.forEach((apiBase) => {
    syncBaseFromApi({
      id: apiBase.id,
      name: apiBase.name,
      planetId: apiBase.planetId,
      warehouseId: apiBase.warehouseId,
    })
  })
  persist()
}

function handleStocksLoaded(
  stocks: Array<{
    baseId: number
    items: Array<{ materialId: number; quantity: number }>
  }>,
) {
  stocks.forEach((warehouseData) => {
    const stockRecord: Record<number, number> = {}
    warehouseData.items.forEach((item) => {
      stockRecord[item.materialId] = item.quantity
    })
    updateBaseStockFromApi(warehouseData.baseId, stockRecord)
  })
  persist()
}
</script>

<template>
  <div class="space-y-4 text-slate-100">
    <!-- API Configuration -->
    <ApiConfigPanel @basesLoaded="handleBasesLoaded" @stocksLoaded="handleStocksLoaded" />

    <div class="flex flex-wrap items-center gap-3 justify-end text-xs text-slate-400">
      <div>
        {{ translate('gameDataTimestamp') }}
        <span class="text-slate-200">{{ formattedGameDataTimestamp }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span>
          {{ translate('priceLastUpdated') }}
          <span class="text-slate-200">{{ formattedPriceTimestamp }}</span>
          <span class="ml-2 text-slate-500">
            ({{ translate('nextRefreshIn') }} {{ refreshCountdown }})
          </span>
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
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-2">
          <span>{{ translate('timeframeHoursLabel') }}</span>
          <input
            v-model.number="timeframeHours"
            type="number"
            min="1"
            max="336"
            step="1"
            class="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          />
        </label>
        <span class="text-slate-500 hidden md:inline">
          {{ translate('timeframeHoursHint') }}
        </span>
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
          :technology-levels="technologyLevels"
          :starting-bonus="startingBonus"
          :timeframe-hours="timeframeHours"
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
          @updateRecipe="
            ({ id, patch }) => {
              // patch.count may be undefined; ensure numeric
              setRecipeCount(base.id, id, patch.count ?? 0)
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
          @updateStock="
            (stock) => {
              setStock(base.id, stock)
              persist()
            }
          "
          @persist="persist"
        />
      </template>
    </Draggable>
  </div>
</template>
