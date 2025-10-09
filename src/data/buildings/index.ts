import type { Building } from '../../types'
import { TIER1_BUILDINGS } from './tier1'
import { TIER2_BUILDINGS } from './tier2'

/**
 * All Buildings organized by tier
 */
export const BUILDINGS: Record<string, Building> = {
  ...TIER1_BUILDINGS,
  ...TIER2_BUILDINGS,
}

export { TIER1_BUILDINGS, TIER2_BUILDINGS }
