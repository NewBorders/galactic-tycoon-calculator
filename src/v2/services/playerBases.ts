// src/v2/services/playerBases.ts
import { computed, ref } from 'vue'
import type { Building, GameData, Recipe } from './gamedata/service'
import type { GameBaseTransformed } from './api/types'

export type PlayerRecipe = { id: string; recipeId: number; count?: number; currentCount?: number }

export type PlayerBuilding = { id: string; buildingId: number; level: number; slotId?: number }
export type PlayerBase = {
  id: string
  planetId: number
  name?: string
  buildings: PlayerBuilding[]
  currentBuildings?: PlayerBuilding[] // API-sourced buildings (readonly reference)
  recipes: PlayerRecipe[]
  optionalConsumables?: number[]
  stock?: Record<number, number>
  gameBaseId?: number // API game base ID
  gameWarehouseId?: number // API warehouse ID
  lastStockRefresh?: number // Timestamp of last API warehouse stock refresh
  materialSortOrder?: 'name' | 'recipe' // Material balance sort order preference
}

type UiSections = { buildings: boolean; production: boolean; dailySummary: boolean }
type UiState = {
  basesOpen: Record<string, boolean>
  sections: Record<string, UiSections> // key = baseId
}

export type PlayerState = {
  bases: PlayerBase[]
  ui: UiState
}

const LS_KEY = 'gt:v2:player:bases:v2'
const uid = () => Math.random().toString(36).slice(2, 10)

function sanitizeStock(stock: Record<number, number> | undefined | null): Record<number, number> {
  if (!stock || typeof stock !== 'object') return {}
  const result: Record<number, number> = {}
  Object.entries(stock).forEach(([key, value]) => {
    const id = Number(key)
    const amount = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(id) || Number.isNaN(amount)) return
    if (amount < 0) return
    result[id] = amount
  })
  return result
}

function ensureUi(st: Partial<PlayerState>): PlayerState {
  const ui: UiState = {
    basesOpen: st.ui?.basesOpen ?? {},
    sections: st.ui?.sections ?? {},
  }
  const bases = ((st.bases as PlayerBase[]) ?? []).map((base) => ({
    ...base,
    gameBaseId: typeof base.gameBaseId === 'number' ? base.gameBaseId : undefined,
    gameWarehouseId: typeof base.gameWarehouseId === 'number' ? base.gameWarehouseId : undefined,
    lastStockRefresh: typeof base.lastStockRefresh === 'number' ? base.lastStockRefresh : undefined,
    buildings: (base.buildings as PlayerBuilding[])?.map((bld) => ({
      id: bld.id ?? uid(),
      buildingId: bld.buildingId,
      level: Math.max(0, Math.floor(bld.level ?? 1)),
      slotId: typeof bld.slotId === 'number' ? bld.slotId : undefined,
    })) ?? [],
    currentBuildings: Array.isArray(base.currentBuildings)
      ? (base.currentBuildings as PlayerBuilding[]).map((bld) => ({
          id: bld.id ?? uid(),
          buildingId: bld.buildingId,
          level: Math.max(0, Math.floor(bld.level ?? 1)),
          slotId: typeof bld.slotId === 'number' ? bld.slotId : undefined,
        }))
      : undefined,
    recipes:
      (base.recipes as PlayerRecipe[])?.map((rec) => ({
        id: rec.id ?? uid(),
        recipeId: rec.recipeId,
        count: typeof rec.count === 'number' && Number.isFinite(rec.count) && rec.count >= 0 ? Math.max(0, Math.floor(rec.count)) : 1,
        currentCount: typeof rec.currentCount === 'number' && Number.isFinite(rec.currentCount) && rec.currentCount >= 0 ? Math.max(0, Math.floor(rec.currentCount)) : undefined,
      })) ?? [],
    optionalConsumables: Array.isArray(base.optionalConsumables)
      ? [...new Set(base.optionalConsumables.filter((id): id is number => typeof id === 'number'))]
      : [],
    stock: sanitizeStock(base.stock),
  }))
  return { bases, ui }
}

function loadState(): PlayerState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return ensureUi(raw ? JSON.parse(raw) : {})
  } catch {
    return ensureUi({})
  }
}

function saveState(st: PlayerState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(st))
  } catch {}
}

export function usePlayerBases(gd: GameData) {
  const state = ref<PlayerState>(loadState())

  const planets = computed(() => gd.planets)
  const buildings = computed<Building[]>(() => gd.buildings)
  const recipes = computed<Recipe[]>(() => gd.recipes)
  const planetsById = computed(() => new Map(planets.value.map((p) => [p.id, p])))
  const buildingsById = computed(() => new Map(buildings.value.map((b) => [b.id, b])))
  const recipesById = computed(() => new Map(recipes.value.map((r) => [r.id, r])))

  const syncRecipesWithBuildings = (base: PlayerBase) => {
    const availableBuildings = new Set(base.buildings.map((b) => b.buildingId))
    base.recipes = base.recipes.filter((selection) => {
      const recipe = recipesById.value.get(selection.recipeId)
      if (!recipe) return false
      return availableBuildings.has(recipe.producedInId)
    })
  }

  state.value.bases.forEach((base) => syncRecipesWithBuildings(base))

  const planetHasBase = (planetId: number) => state.value.bases.some((b) => b.planetId === planetId)

  function addBase(planetId: number) {
    if (planetHasBase(planetId)) return
    const id = crypto?.randomUUID?.() ?? `b_${Date.now()}`
    state.value.bases.push({
      id,
      planetId,
      buildings: [],
      recipes: [],
      optionalConsumables: [],
      stock: {},
    })
    saveState(state.value)
  }

  function removeBase(baseId: string) {
    state.value.bases = state.value.bases.filter((b) => b.id !== baseId)
    saveState(state.value)
  }

  function renameBase(baseId: string, name: string) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    b.name = name.trim()
    saveState(state.value)
  }

  function addBuilding(baseId: string, buildingId: number, level = 1) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return undefined
    const instanceId = uid()

    // Assign temporary slotId for planned buildings without API import
    // Use negative numbers to distinguish from real Game slots (which are >= 0)
    // Find the minimum negative slotId in use and go one lower
    const existingSlotIds = b.buildings.map((bld) => bld.slotId ?? 0).filter((id) => typeof id === 'number')
    const minSlotId = Math.min(...existingSlotIds.filter((id) => id < 0), -1)
    const tempSlotId = minSlotId - 1

    b.buildings.push({
      id: instanceId,
      buildingId,
      level: Math.max(1, level),
      slotId: tempSlotId,
    })
    syncRecipesWithBuildings(b)
    saveState(state.value)
    return instanceId
  }

  function setBuilding(baseId: string, instanceId: string, patch: { level?: number }) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    const it = b.buildings.find((bb) => bb.id === instanceId)
    if (!it) return
    if (patch.level != null) it.level = Math.max(0, Math.floor(patch.level))
    syncRecipesWithBuildings(b)
    saveState(state.value)
  }

  function removeBuilding(baseId: string, instanceId: string) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    b.buildings = b.buildings.filter((bb) => bb.id !== instanceId)
    syncRecipesWithBuildings(b)
    saveState(state.value)
  }

  function addRecipe(baseId: string, recipeId: number): string | undefined {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return undefined
    const recipe = recipesById.value.get(recipeId)
    if (!recipe) return undefined
    const hasBuilding = b.buildings.some((instance) => instance.buildingId === recipe.producedInId)
    if (!hasBuilding) return undefined
    // If recipe already exists, increment its count and return its ID
    const existing = b.recipes.find((r) => r.recipeId === recipeId)
    if (existing) {
      existing.count = (existing.count ?? 1) + 1
      syncRecipesWithBuildings(b)
      saveState(state.value)
      return existing.id
    } else {
      // Add new recipe at the top of the list
      // For manually added recipes, currentCount is undefined (not from API)
      const newId = uid()
      b.recipes.unshift({ id: newId, recipeId, count: 1 })
      syncRecipesWithBuildings(b)
      saveState(state.value)
      return newId
    }
  }

  function setRecipeCount(baseId: string, recipeInstanceId: string, count: number) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    const it = b.recipes.find((r) => r.id === recipeInstanceId)
    if (!it) return
    it.count = Math.max(0, Math.floor(Number(count) || 0))
    // Allow count = 0 (Issue #61: recipes should stay visible when disabled)
    saveState(state.value)
  }

  function removeRecipe(baseId: string, recipeInstanceId: string) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    b.recipes = b.recipes.filter((r) => r.id !== recipeInstanceId)
    saveState(state.value)
  }

  function reorderRecipes(baseId: string, orderedIds: string[]) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    const byId = new Map(b.recipes.map((x) => [x.id, x]))
    b.recipes = orderedIds.map((id) => byId.get(id)!).filter(Boolean)
    saveState(state.value)
  }

  function setOptionalConsumables(baseId: string, materialIds: number[]) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    b.optionalConsumables = Array.from(new Set(materialIds)).filter(
      (id): id is number => typeof id === 'number' && !Number.isNaN(id),
    )
    saveState(state.value)
  }

  function setStock(baseId: string, stock: Record<number, number>) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    b.stock = sanitizeStock(stock)
    b.lastStockRefresh = Date.now()
    saveState(state.value)
  }

  // API synchronization functions
  /**
   * Update or add a base from API data
   * Matches by gameBaseId, planetId, or creates new entry
   */
  function syncBaseFromApi(apiBase: {
    id: number // gameBaseId
    warehouseId: number // gameWarehouseId
    name: string
    planetId: number
  }) {
    // Try to find existing base by gameBaseId
    let base = state.value.bases.find((b) => b.gameBaseId === apiBase.id)

    if (!base) {
      // Try to find by planetId (for backward compatibility)
      base = state.value.bases.find((b) => b.planetId === apiBase.planetId && !b.gameBaseId)
    }

    if (base) {
      // Update existing base with API info
      base.gameBaseId = apiBase.id
      base.gameWarehouseId = apiBase.warehouseId
      if (!base.name) {
        base.name = apiBase.name
      }
    } else {
      // Create new base
      const newBase: PlayerBase = {
        id: crypto?.randomUUID?.() ?? `b_${Date.now()}`,
        planetId: apiBase.planetId,
        name: apiBase.name,
        gameBaseId: apiBase.id,
        gameWarehouseId: apiBase.warehouseId,
        buildings: [],
        recipes: [],
        optionalConsumables: [],
        stock: {},
      }
      // Add at the top of the list
      state.value.bases.unshift(newBase)
    }

    saveState(state.value)
  }

  /**
   * Update warehouse stocks for a specific base from API data
   */
  function updateBaseStockFromApi(gameBaseId: number, stocks: Record<number, number>) {
    const base = state.value.bases.find((b) => b.gameBaseId === gameBaseId)
    if (!base) return

    base.stock = sanitizeStock(stocks)
    base.lastStockRefresh = Date.now()
    saveState(state.value)
  }

  /**
   * Update stock for all bases sharing the same warehouse
   * Used when warehouse stock is fetched by warehouseId
   */
  function updateStockForWarehouse(gameWarehouseId: number, stocks: Record<number, number>) {
    console.log('[PlayerBases] updateStockForWarehouse called', { gameWarehouseId, stockCount: Object.keys(stocks).length })
    const sanitizedStocks = sanitizeStock(stocks)
    const timestamp = Date.now()

    let updated = false
    state.value.bases.forEach((base) => {
      if (base.gameWarehouseId === gameWarehouseId) {
        console.log('[PlayerBases] Updating stock for base', base.name, base.id)
        base.stock = { ...sanitizedStocks }
        base.lastStockRefresh = timestamp
        updated = true
      }
    })

    if (updated) {
      console.log('[PlayerBases] Stock updated, saving to localStorage')
      saveState(state.value)
    } else {
      console.warn('[PlayerBases] No bases found with warehouseId', gameWarehouseId)
    }
  }

  /**
   * Import full base data (buildings + production orders) from API payload
   * Overwrites existing buildings and recipes for the local base
   * Uses the unified addBuilding/addRecipe methods to ensure consistency
   */
  function importBaseFromApiPayload(
    baseId: string,
    payload: GameBaseTransformed,
  ): boolean {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return false

    // Store current (API) buildings as read-only reference
    // This ONLY updates the current state from the API
    const slots = payload.buildingSlots ?? []
    b.currentBuildings = slots.map((slot) => ({
      id: `current_${slot.buildingId}_${slot.slot}`,
      buildingId: slot.buildingId,
      level: slot.level != null ? Math.max(1, Math.floor(Number(slot.level))) : 1,
      slotId: slot.slot,
    }))

    // IMPORTANT: Do NOT overwrite b.buildings (user's planned values)
    // They are preserved as-is so user can see what changed via highlighting
    // Use slotId-based mapping to match currentBuildings (not array index)
    // For new imports, seed buildings from currentBuildings only if buildings was empty
    if (b.buildings.length === 0) {
      b.buildings = b.currentBuildings.map((cur) => ({
        id: `planned_${cur.buildingId}_${Math.random().toString(36).slice(2, 10)}`,
        buildingId: cur.buildingId,
        level: cur.level,
        slotId: cur.slotId,
      }))
    } else {
      // Update existing buildings to match currentBuildings structure using slotId
      // Preserve levels from what user planned, but sync buildingIds and remove obsolete entries
      const currentBySlotId = new Map<number, typeof b.currentBuildings[0]>()
      b.currentBuildings.forEach((cur) => {
        if (cur.slotId != null) currentBySlotId.set(cur.slotId, cur)
      })

      // Create map of existing planned buildings by slotId
      const plannedBySlotId = new Map<number, typeof b.buildings[0]>()
      b.buildings.forEach((planned) => {
        if (planned.slotId != null) plannedBySlotId.set(planned.slotId, planned)
      })

      // Rebuild buildings array: For each current building, preserve planned level if exists
      b.buildings = b.currentBuildings.map((current) => {
        const existingPlanned = current.slotId != null ? plannedBySlotId.get(current.slotId) : null
        if (existingPlanned) {
          const plannedLevel = Math.max(0, Math.floor(existingPlanned.level ?? 0))
          const currentLevel = Math.max(0, Math.floor(current.level ?? 0))
          // Keep existing planned entry but update buildingId (in case it changed)
          return {
            ...existingPlanned,
            buildingId: current.buildingId,
            slotId: current.slotId,
            level: Math.max(plannedLevel, currentLevel),
          }
        } else {
          // New slot: create new planned entry from current
          return {
            id: `planned_${current.buildingId}_${Math.random().toString(36).slice(2, 10)}`,
            buildingId: current.buildingId,
            level: current.level,
            slotId: current.slotId,
          }
        }
      })
    }

    // Import productionOrders: Update currentCount but preserve planned counts
    // (similar logic: only update currentCount from API, don't touch planned count)
    b.recipes.forEach((recipe) => {
      recipe.currentCount = 0 // Reset, will be filled below
    })

    // Import productionOrders: Count occurrences per recipeId to store in currentCount
    const orders = payload.productionOrders ?? []
    const recipeCountMap = new Map<number, number>()
    orders.forEach((o) => {
      const recipeId = Number(o.recipeId)
      if (!isFinite(recipeId)) return
      recipeCountMap.set(recipeId, (recipeCountMap.get(recipeId) ?? 0) + 1)
    })

    // Update recipes: set currentCount from API, preserve planned counts for existing recipes
    // For new recipes (not in planned), seed both current and planned to match API
    recipeCountMap.forEach((apiCount, recipeId) => {
      const existing = b.recipes.find((r) => r.recipeId === recipeId)
      if (existing) {
        // Recipe already planned: just update currentCount, preserve count (planned)
        existing.currentCount = apiCount
        const plannedCount = typeof existing.count === 'number' && Number.isFinite(existing.count)
          ? Math.max(0, Math.floor(existing.count))
          : 0
        if (apiCount > plannedCount) {
          existing.count = apiCount
        }
      } else {
        // New recipe from API: add it with both current and planned matching
        const recipeInstanceId = addRecipe(baseId, recipeId)
        if (recipeInstanceId) {
          const recipe = b.recipes.find((r) => r.id === recipeInstanceId)
          if (recipe) {
            recipe.currentCount = apiCount
            recipe.count = apiCount // Seed planned to match current for new recipes
          }
        }
      }
    })

    saveState(state.value)
    return true
  }

  /**
   * Get the timestamp of last warehouse refresh for a base
   */
  function getLastStockRefresh(baseId: string): number | null {
    const base = state.value.bases.find((b) => b.id === baseId)
    return base?.lastStockRefresh ?? null
  }

  // UI-State API
  function isBaseOpen(baseId: string): boolean {
    return !!state.value.ui.basesOpen[baseId]
  }

  function setBaseOpen(baseId: string, open: boolean) {
    state.value.ui.basesOpen[baseId] = open
    saveState(state.value)
  }

  function toggleBaseOpen(baseId: string) {
    state.value.ui.basesOpen[baseId] = !state.value.ui.basesOpen[baseId]
    saveState(state.value)
  }

  function getSections(baseId: string): UiSections {
    const sections = state.value.ui.sections[baseId]
    if (sections) {
      if (typeof sections.dailySummary !== 'boolean') {
        sections.dailySummary = false
      }
      return sections
    }
    const initial: UiSections = { buildings: false, production: false, dailySummary: false }
    state.value.ui.sections[baseId] = initial
    return initial
  }

  function setSection(baseId: string, which: keyof UiSections, open: boolean) {
    const s = getSections(baseId)
    s[which] = open
    saveState(state.value)
  }

  function setMaterialSortOrder(baseId: string, sortOrder: 'name' | 'recipe') {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    b.materialSortOrder = sortOrder
    saveState(state.value)
  }

  return {
    state,
    planets,
    buildings,
    planetsById,
    buildingsById,
    planetHasBase,
    addBase,
    removeBase,
    renameBase,
    addBuilding,
    setBuilding,
    removeBuilding,
    addRecipe,
    removeRecipe,
    reorderRecipes,
    setRecipeCount,
    setOptionalConsumables,
    setStock,
    syncBaseFromApi,
    updateBaseStockFromApi,
    updateStockForWarehouse,
    getLastStockRefresh,
    isBaseOpen,
    setBaseOpen,
    toggleBaseOpen,
    getSections,
    setSection,
    setMaterialSortOrder,
    importBaseFromApiPayload,
    persist: () => saveState(state.value),
  }
}
