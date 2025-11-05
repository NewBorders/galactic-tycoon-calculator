// src/v2/services/playerBases.ts
import { computed, ref } from 'vue'
import type { Building, GameData } from './gamedata/service'

export type PlayerBuilding = { id: string; buildingId: number; level: number }
export type PlayerBase = {
  id: string
  planetId: number
  name?: string
  buildings: PlayerBuilding[]
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
  return { bases: (st.bases as PlayerBase[]) ?? [], ui }
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
  const planetsById = computed(() => new Map(planets.value.map((p) => [p.id, p])))
  const buildingsById = computed(() => new Map(buildings.value.map((b) => [b.id, b])))

  const planetHasBase = (planetId: number) => state.value.bases.some((b) => b.planetId === planetId)

  function addBase(planetId: number) {
    if (planetHasBase(planetId)) return
    const id = crypto?.randomUUID?.() ?? `b_${Date.now()}`
    state.value.bases.push({ id, planetId, buildings: [] })
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
    saveState(state.value)
  }

  function setBuilding(baseId: string, instanceId: string, patch: { level?: number }) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    const it = b.buildings.find((bb) => bb.id === instanceId)
    if (!it) return
    if (patch.level != null) it.level = Math.max(1, Math.floor(patch.level))
    saveState(state.value)
  }

  function removeBuilding(baseId: string, instanceId: string) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    b.buildings = b.buildings.filter((bb) => bb.id !== instanceId)
    saveState(state.value)
  }

  function reorderBuildings(baseId: string, orderedIds: string[]) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    const byId = new Map(b.buildings.map((x) => [x.id, x]))
    b.buildings = orderedIds.map((id) => byId.get(id)!).filter(Boolean)
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
    isBaseOpen,
    setBaseOpen,
    getSections,
    setSection,
    persist: () => saveState(state.value),
  }
}
