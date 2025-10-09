import type { Building } from '../../types'
import { TIER1_BUILDINGS } from './tier1'

/**
 * All buildings available in the game
 * Organized by tier for easy management
 */
export const BUILDINGS: Record<string, Building> = {
  ...TIER1_BUILDINGS,
  // TIER2_BUILDINGS will be added here when created
  // TIER3_BUILDINGS will be added here when created
}
