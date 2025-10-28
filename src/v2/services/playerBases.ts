import { computed, ref } from 'vue'
import type { Building, GameData } from './gamedata/service'

export type PlayerBuilding = { buildingId: number; level: number; count: number }
export type PlayerBase = {
  id: string
  planetId: number
  name?: string
  buildings: PlayerBuilding[]
}
export type PlayerState = { bases: PlayerBase[] }

const LS_KEY = 'gt:v2:player:bases:v1'
const loadState = (): PlayerState => {
  try {
    const s = localStorage.getItem(LS_KEY)
    return s ? JSON.parse(s) : { bases: [] }
  } catch {
    return { bases: [] }
  }
}
const saveState = (st: PlayerState) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(st))
  } catch {}
}

export function usePlayerBases(gameData: GameData) {
  const state = ref<PlayerState>(loadState())

  const planets = computed(() => gameData.planets)
  const buildings = computed<Building[]>(() => gameData.buildings)
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

  function addBuilding(baseId: string, buildingId: number, level = 1, count = 1) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    const ex = b.buildings.find((bb) => bb.buildingId === buildingId && bb.level === level)
    if (ex) {
      ex.count += count
    } else {
      b.buildings.push({ buildingId, level, count })
    }
    saveState(state.value)
  }

  function setBuilding(baseId: string, buildingId: number, level: number, count: number) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    const item = b.buildings.find((bb) => bb.buildingId === buildingId && bb.level === level)
    if (!item) return
    item.count = Math.max(0, Math.floor(count))
    if (item.count === 0) b.buildings = b.buildings.filter((bb) => bb !== item)
    saveState(state.value)
  }

  // swaps ohne undefined
  function moveBase(idx: number, dir: -1 | 1) {
    const arr = state.value.bases
    const j = idx + dir
    if (idx < 0 || j < 0 || idx >= arr.length || j >= arr.length) return
    const a = arr[idx]!,
      b = arr[j]!
    arr[idx] = b
    arr[j] = a
    saveState(state.value)
  }

  function moveBuilding(baseId: string, idx: number, dir: -1 | 1) {
    const b = state.value.bases.find((x) => x.id === baseId)
    if (!b) return
    const arr = b.buildings
    const j = idx + dir
    if (idx < 0 || j < 0 || idx >= arr.length || j >= arr.length) return
    const a = arr[idx]!,
      c = arr[j]!
    arr[idx] = c
    arr[j] = a
    saveState(state.value)
  }

  const basesEnriched = computed(() =>
    state.value.bases.map((b) => ({
      ...b,
      planetName: planetsById.value.get(b.planetId)?.name ?? `planet_${b.planetId}`,
      buildings: b.buildings.map((bb) => ({
        ...bb,
        name: buildingsById.value.get(bb.buildingId)?.name ?? `building_${bb.buildingId}`,
      })),
    })),
  )

  return {
    state,
    basesEnriched,
    planets,
    buildings,
    planetHasBase,
    addBase,
    removeBase,
    renameBase,
    addBuilding,
    setBuilding,
    moveBase,
    moveBuilding,
    persist: () => saveState(state.value),
  }
}
