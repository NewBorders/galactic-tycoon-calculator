import type { Material } from '../../types'
import { RAW_MATERIALS } from './raw'
import { PROCESSED_MATERIALS } from './processed'
import { MANUFACTURED_MATERIALS } from './manufactured'
import { FOOD_MATERIALS } from './food'
import { CONSUMABLES } from './consumables'
import { SPACESHIP_MATERIALS, SPECIAL_MATERIALS } from './spaceship'

/**
 * All materials available in the game
 * Organized by category for easy management
 */
export const MATERIALS: Record<string, Material> = {
  ...RAW_MATERIALS,
  ...PROCESSED_MATERIALS,
  ...MANUFACTURED_MATERIALS,
  ...FOOD_MATERIALS,
  ...CONSUMABLES,
  ...SPACESHIP_MATERIALS,
  ...SPECIAL_MATERIALS,
}

/**
 * Export individual categories for when you need them
 */
export {
  RAW_MATERIALS,
  PROCESSED_MATERIALS,
  MANUFACTURED_MATERIALS,
  FOOD_MATERIALS,
  CONSUMABLES,
  SPACESHIP_MATERIALS,
  SPECIAL_MATERIALS,
}
