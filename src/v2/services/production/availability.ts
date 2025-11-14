import type { Building, Material, Planet } from '../gamedata/types'

// Buildings which require planetary fertility to produce (use fertility
// instead of material abundance). These are building IDs from the
// game's data (e.g. farm, orchard, aquaponics_farm). Ranch (id 17)
// intentionally excluded because it produces animal products everywhere.
const FERTILITY_BUILDING_IDS = [10, 19, 34]

type AvailabilityArgs = {
  planet?: Planet
  building?: Building
  material?: Material
}

export type RecipeAvailability = {
  abundanceFactor: number
  abundanceRating: number | null
  requiresAbundance: boolean
  requiresFertility: boolean
  blocked: boolean
  reason: 'abundance' | 'fertility' | null
}

export function evaluateRecipeAvailability({
  planet,
  building,
  material,
}: AvailabilityArgs): RecipeAvailability {
  const requiresFertility = !!building && FERTILITY_BUILDING_IDS.indexOf(building.id) > -1
  const fertility = planet?.fertility ?? 0
  const fertilitySatisfied = !requiresFertility || fertility > 0
  // If the building requires fertility (agriculture), use planet fertility
  // as the abundance factor instead of the material's abundance entry.
  const requiresAbundance = material?.source === 1 && !requiresFertility
  let abundanceRating: number | null = null
  let abundanceFactor = 1
  let abundanceSatisfied = true

  if (requiresFertility) {
    abundanceRating = fertility ?? null
    abundanceFactor = (fertility ?? 0) / 100
    abundanceSatisfied = fertility > 0
  } else if (requiresAbundance) {
    let entry = null as null | { id: number; abundanceRating?: number }
    if (planet && planet.materials) {
      for (let i = 0; i < planet.materials.length; i++) {
        const mat = planet.materials[i]
        if (!mat) continue
        if (mat.id === (material as Material | undefined)?.id) {
          entry = mat
          break
        }
      }
    }
    abundanceRating = entry && entry.abundanceRating != null ? entry.abundanceRating : null
    if (!entry || !entry.abundanceRating) {
      abundanceFactor = 0
      abundanceSatisfied = false
    } else {
      abundanceFactor = entry.abundanceRating / 100
      abundanceSatisfied = entry.abundanceRating > 0
    }
  }

  const reason: RecipeAvailability['reason'] = !fertilitySatisfied
    ? 'fertility'
    : abundanceSatisfied
    ? null
    : 'abundance'

  const blocked = reason !== null

  if (blocked) {
    abundanceFactor = 0
  }

  return {
    abundanceFactor,
    abundanceRating,
    requiresAbundance,
    requiresFertility,
    blocked,
    reason,
  }
}
