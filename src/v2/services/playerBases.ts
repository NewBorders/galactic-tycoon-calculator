// src/v2/services/playerBases.ts
import { computed, ref } from 'vue'
import type { Building, GameData, Recipe } from './gamedata/service'

export type PlayerRecipe = { id: string; recipeId: number }

export type PlayerBuilding = { id: string; buildingId: number; level: number }
export type PlayerBase = {
  id: string
  planetId: number
  name?: string
  buildings: PlayerBuilding[]
  recipes: PlayerRecipe[]
  optionalConsumables?: number[]
  stock?: Record<number, number>
}

type UiSections = { buildings: boolean; production: boolean }
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
    buildings: (base.buildings as PlayerBuilding[])?.map((bld) => ({
      id: bld.id ?? uid(),
      buildingId: bld.buildingId,
      level: Math.max(1, Math.floor(bld.level ?? 1)),
    })) ?? [],
    recipes:
      (base.recipes as PlayerRecipe[])?.map((rec) => ({
        id: rec.id ?? uid(),
        recipeId: rec.recipeId,
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
    if (!b) return
    b.buildings.push({ id: uid(), buildingId, level: Math.max(1, level) })
    syncRecipesWithBuildings(b)
    saveState(state.value)
  }

  function setBuilding(baseId: string, instanceId: string, patch: { level?: number }) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    const it = b.buildings.find((bb) => bb.id === instanceId)
    if (!it) return
    if (patch.level != null) it.level = Math.max(1, Math.floor(patch.level))
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

  function reorderBuildings(baseId: string, orderedIds: string[]) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    const byId = new Map(b.buildings.map((x) => [x.id, x]))
    b.buildings = orderedIds.map((id) => byId.get(id)!).filter(Boolean)
    saveState(state.value)
  }

  function addRecipe(baseId: string, recipeId: number) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    if (b.recipes.some((r) => r.recipeId === recipeId)) return
    const recipe = recipesById.value.get(recipeId)
    if (!recipe) return
    const hasBuilding = b.buildings.some((instance) => instance.buildingId === recipe.producedInId)
    if (!hasBuilding) return
    b.recipes.push({ id: uid(), recipeId })
    syncRecipesWithBuildings(b)
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
    saveState(state.value)
  }

  // UI-State API
  function isBaseOpen(baseId: string): boolean {
    return !!state.value.ui.basesOpen[baseId]
  }

  function setBaseOpen(baseId: string, open: boolean) {
    state.value.ui.basesOpen[baseId] = open
    saveState(state.value)
  }

  function getSections(baseId: string): UiSections {
    return (state.value.ui.sections[baseId] ??= { buildings: false, production: false })
  }

  function setSection(baseId: string, which: keyof UiSections, open: boolean) {
    const s = getSections(baseId)
    s[which] = open
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
    reorderBuildings,
    addRecipe,
    removeRecipe,
    reorderRecipes,
    setOptionalConsumables,
    setStock,
    isBaseOpen,
    setBaseOpen,
    getSections,
    setSection,
    persist: () => saveState(state.value),
  }
}
