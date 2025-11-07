import type { Planet } from './types'

export type { GameData, System, Planet, Material, Building, Recipe, GdIndex } from './types'
export { loadGameData } from './gameDataRepository'
export { useMaterialPricing } from './prices'

export function searchPlanetsByName(allPlanets: Planet[], name: string): Planet[] {
  const q = name.trim().toLowerCase()
  if (!q) return []
  return allPlanets.filter((p) => p.name.toLowerCase().includes(q))
}

// needed later
// export function searchPlanetsByProduction(searchedMaterials: Material[]): Planet[] { ... }