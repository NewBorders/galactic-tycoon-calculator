// src/v2/services/playerBases.ts
import { computed, ref } from 'vue'
import type { Building, GameData, Recipe } from './gamedata/service'

export type PlayerRecipe = { id: string; recipeId: number; share?: number }

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

function sanitizeShare(value: unknown): number | undefined {
  if (value == null) return undefined
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) return undefined
  return Math.min(100, Math.max(0, Math.round(numeric)))
}

function shareWeight(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number') return fallback
  if (!Number.isFinite(value) || Number.isNaN(value)) return fallback
  return Math.min(100, Math.max(0, Math.round(value)))
}

function distributeShares(
  entries: PlayerRecipe[],
  total: number,
  fallbackWeight = 1,
  lockedId?: string,
) {
  if (!entries.length) return
  const targetTotal = Math.min(100, Math.max(0, Math.round(total)))
  if (targetTotal === 0) {
    entries.forEach((entry) => {
      if (entry.id === lockedId) return
      entry.share = 0
    })
    return
  }

  const weights = entries.map((entry) => shareWeight(entry.share, fallbackWeight))
  const sumWeights = weights.reduce((acc, weight) => acc + weight, 0)
  const effectiveWeights = sumWeights > 0 ? weights : entries.map(() => fallbackWeight)
  const totalWeights = sumWeights > 0 ? sumWeights : fallbackWeight * entries.length

  const safeFallback = totalWeights > 0 ? fallbackWeight : 1

  let remainder = targetTotal
  entries.forEach((entry, index) => {
    if (entry.id === lockedId) return
    const weight = effectiveWeights[index] ?? safeFallback
    const share =
      index === entries.length - 1 || (lockedId && entries[index + 1]?.id === lockedId)
        ? remainder
        : totalWeights > 0
          ? Math.min(remainder, Math.round((weight / totalWeights) * targetTotal))
          : 0
    entry.share = share
    remainder = Math.max(0, remainder - share)
  })
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
        share: sanitizeShare((rec as PlayerRecipe).share),
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

  const rebalanceBuildingShares = (base: PlayerBase, buildingId: number) => {
    const selections = base.recipes
      .map((selection) => ({ selection, recipe: recipesById.value.get(selection.recipeId) }))
      .filter(({ recipe }) => recipe?.producedInId === buildingId)
    if (!selections.length) return

    const overrides = selections.filter(({ selection }) => selection.share != null)
    if (!overrides.length) {
      selections.forEach(({ selection }) => {
        selection.share = undefined
      })
      return
    }

    const total = overrides.reduce(
      (acc, { selection }) => acc + shareWeight(selection.share, 0),
      0,
    )
    const fallback = overrides.length > 0 ? 100 / overrides.length : 100
    let remainder = 100
    overrides.forEach(({ selection }, index) => {
      const value = shareWeight(selection.share, fallback)
      const share =
        index === overrides.length - 1
          ? remainder
          : Math.min(remainder, total > 0 ? Math.round((value / total) * 100) : Math.round(fallback))
      selection.share = share
      remainder -= share
    })

    const others = selections.filter(({ selection }) => selection.share == null)
    if (others.length > 0) {
      distributeShares(
        others.map(({ selection }) => selection),
        Math.max(0, remainder),
        overrides.length ? Math.round(100 / overrides.length) : 1,
      )
    }
  }

  state.value.bases.forEach((base) => syncRecipesWithBuildings(base))
  state.value.bases.forEach((base) => {
    const touched = new Set<number>()
    base.recipes.forEach((selection) => {
      const recipe = recipesById.value.get(selection.recipeId)
      if (!recipe) return
      if (touched.has(recipe.producedInId)) return
      touched.add(recipe.producedInId)
      rebalanceBuildingShares(base, recipe.producedInId)
    })
  })

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
    b.recipes.push({ id: uid(), recipeId, share: undefined })
    rebalanceBuildingShares(b, recipe.producedInId)
    syncRecipesWithBuildings(b)
    saveState(state.value)
  }

  function removeRecipe(baseId: string, recipeInstanceId: string) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    const removed = b.recipes.find((r) => r.id === recipeInstanceId)
    b.recipes = b.recipes.filter((r) => r.id !== recipeInstanceId)
    if (removed) {
      const recipe = recipesById.value.get(removed.recipeId)
      if (recipe) {
        rebalanceBuildingShares(b, recipe.producedInId)
      }
    }
    saveState(state.value)
  }

  function reorderRecipes(baseId: string, orderedIds: string[]) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    const byId = new Map(b.recipes.map((x) => [x.id, x]))
    b.recipes = orderedIds.map((id) => byId.get(id)!).filter(Boolean)
    saveState(state.value)
  }

  function setRecipeShare(baseId: string, recipeInstanceId: string, share: number) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    const recipe = b.recipes.find((r) => r.id === recipeInstanceId)
    if (!recipe) return
    const sanitized = sanitizeShare(share) ?? 0
    const fullRecipe = recipesById.value.get(recipe.recipeId)
    if (!fullRecipe) {
      recipe.share = sanitized
      saveState(state.value)
      return
    }

    const buildingId = fullRecipe.producedInId
    recipe.share = sanitized

    const siblings = b.recipes.filter((r) => {
      if (r.id === recipeInstanceId) return false
      const siblingRecipe = recipesById.value.get(r.recipeId)
      return siblingRecipe?.producedInId === buildingId
    })

    if (!siblings.length) {
      recipe.share = 100
      saveState(state.value)
      return
    }

    const available = Math.max(0, 100 - sanitized)
    distributeShares(siblings, available)
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
    setRecipeShare,
    setOptionalConsumables,
    setStock,
    isBaseOpen,
    setBaseOpen,
    getSections,
    setSection,
    persist: () => saveState(state.value),
  }
}
