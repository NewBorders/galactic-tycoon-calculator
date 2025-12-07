import { ref } from 'vue'

export type TechnologySpecialisation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 10

export type PlayerTechnologyState = {
  startingBonus: number
  levels: Partial<Record<TechnologySpecialisation, number>>
}

export type TechnologyDefinition = {
  id: TechnologySpecialisation
  nameKey: string
  descriptionKey: string
}

export const TECHNOLOGIES: TechnologyDefinition[] = [
  { id: 1, nameKey: 'technologyConstruction', descriptionKey: 'technologyConstructionDesc' },
  { id: 2, nameKey: 'technologyManufacturing', descriptionKey: 'technologyManufacturingDesc' },
  { id: 3, nameKey: 'technologyAgriculture', descriptionKey: 'technologyAgricultureDesc' },
  { id: 4, nameKey: 'technologyResourceExtraction', descriptionKey: 'technologyResourceExtractionDesc' },
  { id: 5, nameKey: 'technologyMetallurgy', descriptionKey: 'technologyMetallurgyDesc' },
  { id: 6, nameKey: 'technologyChemistry', descriptionKey: 'technologyChemistryDesc' },
  { id: 7, nameKey: 'technologyElectronics', descriptionKey: 'technologyElectronicsDesc' },
  { id: 8, nameKey: 'technologyFoodProduction', descriptionKey: 'technologyFoodProductionDesc' },
  { id: 10, nameKey: 'technologyScience', descriptionKey: 'technologyScienceDesc' },
]

const STORAGE_KEY = 'gt:v2:player:technology:v1'

function clampLevel(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

function clampStartingBonus(value: number): number {
  if (!Number.isFinite(value)) return 1
  const rounded = Math.round(value * 10) / 10
  return Math.max(0.1, rounded)
}

function sanitizeState(raw: Partial<PlayerTechnologyState>): PlayerTechnologyState {
  const levels: Partial<Record<TechnologySpecialisation, number>> = {}
  Object.entries(raw.levels ?? {}).forEach(([key, value]) => {
    const id = Number(key) as TechnologySpecialisation
    if (!TECHNOLOGIES.some((tech) => tech.id === id)) return
    levels[id] = clampLevel(typeof value === 'number' ? value : Number(value))
  })

  return {
    startingBonus: clampStartingBonus(raw.startingBonus ?? 1),
    levels,
  }
}

function loadState(): PlayerTechnologyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return sanitizeState({})
    return sanitizeState(JSON.parse(raw))
  } catch {
    // Silently fail on load - use default state
    return sanitizeState({})
  }
}

function saveState(state: PlayerTechnologyState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Silently fail on save
  }
}

const state = ref<PlayerTechnologyState>(loadState())

export function technologyBonusFromLevel(level: number): number {
  if (!Number.isFinite(level) || level <= 0) return 1
  return 1 + Math.max(0, level) * 0.05
}

export function usePlayerTechnology() {
  function setLevel(id: TechnologySpecialisation, value: number) {
    const nextLevel = clampLevel(value)
    const next = {
      ...state.value,
      levels: { ...state.value.levels, [id]: nextLevel },
    }
    state.value = next
    saveState(next)
  }

  function setStartingBonus(value: number) {
    const nextBonus = clampStartingBonus(value)
    const next = { ...state.value, startingBonus: nextBonus }
    state.value = next
    saveState(next)
  }

  function reset() {
    const next = sanitizeState({})
    state.value = next
    saveState(next)
  }

  function setFromApi(technologies: Array<{ id: number; level: number }>, startingBonus?: number) {
    const levels: Partial<Record<TechnologySpecialisation, number>> = {}
    
    technologies.forEach((tech) => {
      const id = tech.id as TechnologySpecialisation
      if (TECHNOLOGIES.some((t) => t.id === id)) {
        levels[id] = clampLevel(tech.level)
      }
    })

    const next: PlayerTechnologyState = {
      startingBonus: startingBonus !== undefined ? clampStartingBonus(startingBonus) : state.value.startingBonus,
      levels,
    }
    
    state.value = next
    saveState(next)
  }

  return {
    state,
    setLevel,
    setStartingBonus,
    setFromApi,
    reset,
  }
}
