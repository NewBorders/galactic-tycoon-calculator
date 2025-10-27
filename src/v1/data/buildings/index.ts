import type { Building } from '../../types'
import { TIER1_BUILDINGS } from './tier1'
import { TIER2_BUILDINGS } from './tier2'
import { TIER3_BUILDINGS } from './tier3'
import { TIER4_BUILDINGS } from './tier4'

/**
 * All Buildings organized by tier
 */
export const BUILDINGS: Record<string, Building> = {
  ...TIER1_BUILDINGS,
  ...TIER2_BUILDINGS,
  ...TIER3_BUILDINGS,
  ...TIER4_BUILDINGS,
}

export { TIER1_BUILDINGS, TIER2_BUILDINGS, TIER3_BUILDINGS, TIER4_BUILDINGS }
