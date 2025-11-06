// src/v2/services/playerBases.ts
import { computed, ref } from 'vue'
import type { Building, GameData, Recipe } from './gamedata/service'

export type PlayerRecipe = { id: string; recipeId: number; share: number }

export type PlayerBuilding = { id: string; buildingId: number; level: number }
export type PlayerBase = {
  id: string
  planetId: number
  name?: string
  buildings: PlayerBuilding[]
  recipes: PlayerRecipe[]
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

const LS_KEY = 'gt:v2:player:bases:v1'
const uid = () => Math.random().toString(36).slice(2, 10)

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
      (base.recipes as (PlayerRecipe & { lines?: number })[])?.map((rec) => {
        const hasShare = Number.isFinite(rec.share)
        const legacyLines = Number.isFinite(rec.lines) ? Number(rec.lines) : undefined
        const normalizedShare = hasShare
          ? Number(rec.share)
          : legacyLines != null
            ? legacyLines * 100
            : 0
        return {
          id: rec.id ?? uid(),
          recipeId: rec.recipeId,
          share: Math.max(0, normalizedShare),
        }
      }) ?? [],
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

  const addToMap = (map: Map<number, number>, key: number, value: number) => {
    const prev = map.get(key) ?? 0
    map.set(key, prev + value)
  }

  const buildingShareCapacity = (base: PlayerBase): Map<number, number> => {
    const capacity = new Map<number, number>()
    base.buildings.forEach((instance) => {
      const level = Math.max(1, Math.floor(instance.level ?? 1))
      addToMap(capacity, instance.buildingId, level * 100)
    })
    return capacity
  }

  const syncRecipesWithBuildings = (base: PlayerBase) => {
    const capacity = buildingShareCapacity(base)
    const used = new Map<number, number>()
    base.recipes.forEach((selection) => {
      const recipe = recipesById.value.get(selection.recipeId)
      if (!recipe) {
        selection.share = 0
        return
      }
      const max = capacity.get(recipe.producedInId) ?? 0
      const normalized = Math.max(0, Number.isFinite(selection.share) ? Number(selection.share) : 0)
      const already = used.get(recipe.producedInId) ?? 0
      const remaining = Math.max(0, max - already)
      const applied = Math.min(normalized, remaining)
      selection.share = applied
      used.set(recipe.producedInId, already + applied)
    })
  }

  state.value.bases.forEach((base) => syncRecipesWithBuildings(base))

  const planetHasBase = (planetId: number) => state.value.bases.some((b) => b.planetId === planetId)

  function addBase(planetId: number) {
    if (planetHasBase(planetId)) return
    const id = crypto?.randomUUID?.() ?? `b_${Date.now()}`
    state.value.bases.push({ id, planetId, buildings: [], recipes: [] })
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

  function addRecipe(baseId: string, recipeId: number, share = 100) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    if (b.recipes.some((r) => r.recipeId === recipeId)) return
    b.recipes.push({ id: uid(), recipeId, share: Math.max(0, Number(share) || 0) })
    syncRecipesWithBuildings(b)
    saveState(state.value)
  }

  function setRecipe(baseId: string, recipeInstanceId: string, patch: { share?: number }) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    const rec = b.recipes.find((r) => r.id === recipeInstanceId)
    if (!rec) return
    if (patch.share != null) rec.share = Math.max(0, Number(patch.share) || 0)
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
    setRecipe,
    removeRecipe,
    reorderRecipes,
    isBaseOpen,
    setBaseOpen,
    getSections,
    setSection,
    persist: () => saveState(state.value),
  }
}
