import type { Material } from '../../types'

/**
 * Spaceship Components - Tier 2
 * Parts and systems for spacecraft construction
 */
export const SPACESHIP_MATERIALS: Record<string, Material> = {
  life_support_system: { id: 82, name: 'Life Support System', category: 'spaceship', weight: 1.5 },
  ship_interior_kit: { id: 103, name: 'Ship Interior Kit', category: 'spaceship', weight: 6 },
  cargo_bay_segment: { id: 105, name: 'Cargo Bay Segment', category: 'spaceship', weight: 4 },
  fuel_tank_segment: { id: 106, name: 'Fuel Tank Segment', category: 'spaceship', weight: 4 },
  heat_shielding: { id: 111, name: 'Heat Shielding', category: 'spaceship', weight: 2 },
  shuttle_bridge: { id: 118, name: 'Shuttle Bridge', category: 'spaceship', weight: 15 },
  hydrogen_generator: { id: 101, name: 'Hydrogen Generator', category: 'spaceship', weight: 7.5 },
  linear_ftl_emitter: { id: 109, name: 'Linear FTL Emitter', category: 'spaceship', weight: 7.5 },
  mining_vehicle: { id: 86, name: 'Mining Vehicle', category: 'spaceship', weight: 5 },
  drone: { id: 143, name: 'Drone', category: 'spaceship', weight: 1 },
}

/**
 * Special Materials
 * Unique items that don't fit other categories
 */
export const SPECIAL_MATERIALS: Record<string, Material> = {
  research_data: { id: 64, name: 'Research Data', category: 'special', weight: 0.1 },
  advanced_research_data: { id: 65, name: 'Advanced Research Data', category: 'special', weight: 0.1 },
  structural_elements: { id: 91, name: 'Structural Elements', category: 'special', weight: 2 },
  construction_vehicle: { id: 52, name: 'Construction Vehicle', category: 'special', weight: 5 },
  drill: { id: 87, name: 'Drill', category: 'special', weight: 1 },
}
