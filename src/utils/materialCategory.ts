import type { IndustryType } from '../types'
import { BUILDINGS } from '../data/buildings'

/**
 * Map of material output to the building industry type where it's produced
 * This is auto-generated based on building recipes
 */
export const MATERIAL_INDUSTRY_MAP: Record<string, IndustryType> = {}

// Generate the map from buildings
Object.values(BUILDINGS).forEach(building => {
  Object.values(building.recipes).forEach(recipe => {
    Object.keys(recipe.outputs).forEach(materialKey => {
      // Only set if not already set (first occurrence wins)
      if (!MATERIAL_INDUSTRY_MAP[materialKey]) {
        MATERIAL_INDUSTRY_MAP[materialKey] = building.industryType
      }
    })
  })
})

/**
 * Get the industry type for a material based on where it's produced
 */
export function getMaterialCategory(materialKey: string): IndustryType {
  return MATERIAL_INDUSTRY_MAP[materialKey] || 'Resource Extraction'
}
