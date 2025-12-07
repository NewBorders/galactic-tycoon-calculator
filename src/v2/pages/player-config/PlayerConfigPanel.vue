<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { GameData, GdIndex, Planet } from '../../services/gamedata/service.ts'
import { searchPlanetsByName, useMaterialPricing } from '../../services/gamedata/service.ts'
import { usePlayerBases } from '../../services/playerBases.ts'
import { getApiKey, getWorld } from '@/v2/services/api/apiKeyManager'
import { getExportThresholdRef } from '@/v2/services/config/exportThreshold'
import { fetchCompanyBases, fetchGameBaseDetails, transformGameBase } from '@/v2/services/api/warehouseService'
import { updateSyncTime, registerSyncCallbacks } from '@/v2/services/syncService'
import Draggable from 'vuedraggable'
import { translate } from '../../localisation/index.js'
import { usePlanningGuards } from '@/v2/composables/usePlanningGuards'

import PlanetSearch from './components/PlanetSearch.vue'
import ConfiguredBase from './components/ConfiguredBase.vue'
import ApiSyncPanel from './components/ApiSyncPanel.vue'
import LoadBasesButton from './components/LoadBasesButton.vue'
import ImportConfirmDialog from './components/ImportConfirmDialog.vue'
import GlobalSummary from './components/GlobalSummary.vue'
import { usePlayerTechnology } from '@/v2/services/playerTechnology'

import { computeBaseReport } from '@/v2/services/production/engine'

const props = defineProps<{ gameData: GameData; index: GdIndex; gameDataLoadedAt?: number | null }>()
const {
  state,
  planetHasBase,
  addBase: _addBase,
  removeBase: _removeBase,
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
  setMaterialSortOrder,
  syncBaseFromApi,
  updateBaseStockFromApi,
  importBaseFromApiPayload,
  isBaseOpen,
  setBaseOpen,
  getSections,
  setSection,
} = usePlayerBases(props.gameData)

const { guardEdit } = usePlanningGuards()

// Guarded versions of edit operations
function addBase(planetId: number) {
  guardEdit(() => _addBase(planetId), 'add base')
}

function removeBase(baseId: string) {
  guardEdit(() => _removeBase(baseId), 'remove base')
}

const { state: technologyState } = usePlayerTechnology()
const technologyLevels = computed(() => technologyState.value.levels ?? {})
const startingBonus = computed(() => technologyState.value.startingBonus ?? 1)

// Calculate global workforce burden across all bases for expansion overhead
const globalWorkforceBurden = computed(() => {
  const technologyLevelsOption: Record<number, number> = {}
  Object.entries(technologyLevels.value ?? {}).forEach(([key, value]) => {
    const spec = Number(key)
    const level = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(spec) || Number.isNaN(level)) return
    technologyLevelsOption[spec] = Math.max(0, Math.floor(level))
  })

  let totalWorkforce = 0
  state.value.bases.forEach((base) => {
    const assignment = {
      planetId: base.planetId,
      buildings: (base.buildings ?? []).map((b: { buildingId: number; level: number }) => ({
        buildingId: b.buildingId,
        level: b.level,
      })),
      recipes: (base.recipes ?? []).map((r: { id: string; recipeId: number; count?: number }) => ({
        recipeId: r.recipeId,
        count: typeof r.count === 'number' && Number.isFinite(r.count) ? Math.max(1, Math.floor(r.count)) : 1,
      })),
    }
    const activeOptionalConsumables = new Set(
      (base.optionalConsumables ?? []).filter((id): id is number => typeof id === 'number'),
    )

    const report = computeBaseReport(props.gameData, {
      assignment,
      horizonDays: 1,
      options: {
        activeOptionalConsumables,
        technologyLevels: technologyLevelsOption,
        startingBonus: startingBonus.value,
      },
    })

    // Sum up workforce from all tiers
    report.workforceSummary.forEach((wf) => {
      totalWorkforce += wf.required
    })
  })
  return totalWorkforce
})

const query = ref('')
const apiSyncPanel = ref()
const importLoading = ref<string | null>(null) // baseId of base currently importing
const importError = ref<string | null>(null)
const importSuccess = ref<string | null>(null)
const confirmDialogOpen = ref(false)
const confirmDialogBaseId = ref<string | null>(null)
const confirmDialogTitle = ref<string | undefined>(undefined)
const confirmDialogMessage = ref<string | undefined>(undefined)

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
const exportThreshold = getExportThresholdRef()

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
  
  // Register callback for when sync service loads company data
  registerSyncCallbacks({
    onCompanyDataLoaded: handleBasesLoaded
  })
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

async function handleBasesLoaded(
  bases: Array<{ id: number; name: string; planetId: number; warehouseId: number }>,
) {
  // Update sync timestamp for company data
  updateSyncTime('company')
  
  // Track existing gameBaseIds before sync to detect newly added bases
  const existingIds = new Set(
    state.value.bases
      .map((b) => (typeof b.gameBaseId === 'number' ? b.gameBaseId : null))
      .filter((x): x is number => x != null),
  )

  // Sync all bases (adds new ones or updates mapping on existing)
  bases.forEach((apiBase) => {
    syncBaseFromApi({
      id: apiBase.id,
      name: apiBase.name,
      planetId: apiBase.planetId,
      warehouseId: apiBase.warehouseId,
    })
  })

  // For bases not present before, auto-import buildings and recipes
  const key = getApiKey()
  const world = getWorld()
  if (key) {
    const newlyAdded = bases
      .map((b) => b.id)
      .filter((id) => !existingIds.has(id))

    for (const gameBaseId of newlyAdded) {
      try {
        const details = await fetchGameBaseDetails(key, gameBaseId, world)
        const transformed = transformGameBase(details.data)
        const localBase = state.value.bases.find((b) => b.gameBaseId === gameBaseId)
        if (localBase) {
          importBaseFromApiPayload(localBase.id, transformed)
        }
      } catch (e) {
        console.warn('[LoadBases] Auto-import failed for base', gameBaseId, e)
      }
    }
  } else {
    console.warn('[LoadBases] API key not set; skipping auto-import for new bases')
  }

  persist()
}

function handleStocksLoaded(
  stocks: Array<{
    gameBaseId: number
    stock: Record<number, number>
  }>,
) {
  stocks.forEach((warehouseData) => {
    updateBaseStockFromApi(warehouseData.gameBaseId, warehouseData.stock)
  })
  persist()
}

// Manual import of full base (buildings + production orders) from game API
async function handleImportBase(base: typeof state.value.bases[0]) {
  // This function now performs the import for an already-confirmed base
  const key = getApiKey()
  if (!key) {
    importError.value = translate('apiKeyNotConfigured')
    return
  }

  const world = getWorld()
  importLoading.value = base.id
  importError.value = null
  importSuccess.value = null

  try {
    // Ensure we have a mapping to gameBaseId
    if (!base.gameBaseId) {
      const company = await fetchCompanyBases(key, world, true)
      handleBasesLoaded(company.data.bases ?? [])
    }

    const localBase = state.value.bases.find((b: typeof state.value.bases[0]) => b.id === base.id)
    if (!localBase) {
      importError.value = translate('importBaseError')
      return
    }
    if (!localBase.gameBaseId) {
      importError.value = translate('importBaseError')
      return
    }

    const details = await fetchGameBaseDetails(key, localBase.gameBaseId, world)
    // Strict ETL: transform raw API payload to normalized format
    const transformed = transformGameBase(details.data)
    const imported = importBaseFromApiPayload(localBase.id, transformed)
    if (!imported) {
      importError.value = translate('importBaseError')
      console.warn('[ImportBase] Import returned false - nothing imported')
    } else {
      persist()
      importSuccess.value = translate('importBaseSuccess')
      // Clear success message after 5 seconds
      setTimeout(() => {
        importSuccess.value = null
      }, 5000)
    }
  } catch (e) {
    importError.value = `${translate('importBaseError')}: ${e instanceof Error ? e.message : String(e)}`
  } finally {
    importLoading.value = null
  }
}

function openImportDialog(base: typeof state.value.bases[0]) {
  confirmDialogBaseId.value = base.id
  confirmDialogTitle.value = translate('importBaseConfirmTitle')
  confirmDialogMessage.value = translate('importBaseConfirmMessage')
  confirmDialogOpen.value = true
}

async function confirmImport() {
  confirmDialogOpen.value = false
  const baseId = confirmDialogBaseId.value
  if (!baseId) return
  const base = state.value.bases.find((b) => b.id === baseId)
  if (!base) return
  await handleImportBase(base)
  confirmDialogBaseId.value = null
}

function cancelImport() {
  confirmDialogOpen.value = false
  confirmDialogBaseId.value = null
}
</script>

<template>
  <div class="space-y-4 text-slate-100">
    <!-- Import Feedback (Toast-like) -->
    <div v-if="importError" class="px-4 py-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-300">
      {{ importError }}
    </div>
    <div v-if="importSuccess" class="px-4 py-2 bg-green-900/30 border border-green-700 rounded text-xs text-green-300">
      {{ importSuccess }}
    </div>

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
      <!-- Warehouse sync button -->
      <ApiSyncPanel ref="apiSyncPanel" :bases="state.bases" @stocksLoaded="handleStocksLoaded" />
      <div class="flex flex-col gap-2">
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
    </div>

    <div class="flex items-center gap-2">
      <PlanetSearch
        v-model:query="query"
        :suggestions="suggestions"
        :hasBase="planetHasBase"
        @select="selectPlanet"
      />
      <LoadBasesButton :bases="state.bases" @basesLoaded="handleBasesLoaded" />
    </div>

    <!-- Global Summary -->
    <GlobalSummary
      v-if="state.bases.length > 0"
      :bases="state.bases"
      :game-data="props.gameData"
      :index="props.index"
      :price-resolver="priceResolver"
      :technology-levels="technologyLevels"
      :starting-bonus="startingBonus"
      :timeframe-hours="timeframeHours"
      :global-workforce-burden="globalWorkforceBurden"
      v-model:export-threshold="exportThreshold"
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
          :global-workforce-burden="globalWorkforceBurden"
          :isBaseOpen="(id) => isBaseOpen(id)"
          :getSections="(id) => getSections(id)"
          :isImporting="importLoading === base.id"
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
          @importFromGame="() => openImportDialog(base)"
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
          @updateMaterialSortOrder="
            (sortOrder) => {
              setMaterialSortOrder(base.id, sortOrder)
              persist()
            }
          "
          @persist="persist"
        />
      </template>
    </Draggable>

    <!-- Confirm overwrite dialog for manual Import -->
    <ImportConfirmDialog
      :open="confirmDialogOpen"
      :title="confirmDialogTitle"
      :message="confirmDialogMessage"
      :loading="false"
      @confirm="confirmImport"
      @cancel="cancelImport"
    />
  </div>
</template>
