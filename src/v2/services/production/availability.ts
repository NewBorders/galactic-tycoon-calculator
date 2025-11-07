import type { Building, Material, Planet } from '../gamedata/types'

const AGRICULTURE_SPECIALISATION = 3

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
  const requiresFertility = building?.specialization === AGRICULTURE_SPECIALISATION
  const fertility = planet?.fertility ?? 0
  const fertilitySatisfied = !requiresFertility || fertility > 0

  const requiresAbundance = material?.source === 1
  let abundanceRating: number | null = null
  let abundanceFactor = 1
  let abundanceSatisfied = true

  if (requiresAbundance) {
    const entry = planet?.materials.find((mat) => mat.id === material?.id)
    abundanceRating = entry?.abundanceRating ?? null
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
