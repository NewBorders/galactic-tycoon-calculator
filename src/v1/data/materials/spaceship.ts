import type { Material } from '../../types'

export const SPACESHIP_MATERIALS_T1: Record<string, Material> = {
  hull_plate: { id: 104, name: 'Hull Plate', category: 'Construction', weight: 2, tier: 1 },
  hydrogen_fuel: { id: 110, name: 'Hydrogen Fuel', category: 'Chemistry', weight: 0.25, tier: 1 },
  ship_repair_kit: { id: 113, name: 'Ship Repair Kit', category: 'Construction', weight: 0.75, tier: 1 },
}

export const SPACESHIP_MATERIALS_T2: Record<string, Material> = {
  life_support_system: { id: 82, name: 'Life Support System', category: 'Manufacturing', weight: 1.5, tier: 2 },
  ship_interior_kit: { id: 103, name: 'Ship Interior Kit', category: 'Manufacturing', weight: 6, tier: 2 },
  cargo_bay_segment: { id: 105, name: 'Cargo Bay Segment', category: 'Construction', weight: 4, tier: 2 },
  fuel_tank_segment: { id: 106, name: 'Fuel Tank Segment', category: 'Construction', weight: 4, tier: 2 },
  hydrogen_generator: { id: 101, name: 'Hydrogen Generator', category: 'Manufacturing', weight: 7.5, tier: 2 },
  linear_ftl_emitter: { id: 109, name: 'Linear FTL Emitter', category: 'Electronics', weight: 7.5, tier: 2 },
  heat_shielding: { id: 111, name: 'Heat Shielding', category: 'Chemistry', weight: 2, tier: 2 },
  shuttle_bridge: { id: 118, name: 'Shuttle Bridge', category: 'Manufacturing', weight: 15, tier: 2 },
}

export const SPACESHIP_MATERIALS_T3: Record<string, Material> = {
  radiation_shielding: { id: 81, name: 'Radiation Shielding', category: 'Manufacturing', weight: 2, tier: 3 },
  fission_fuel: { id: 73, name: 'Fission Fuel', category: 'Chemistry', weight: 1, tier: 3 },
  fission_reactor: { id: 133, name: 'Fission Reactor', category: 'Manufacturing', weight: 25, tier: 3 },
  quantum_ftl_emitter: { id: 134, name: 'Quantum FTL Emitter', category: 'Electronics', weight: 12.5, tier: 3 },
  tiridium_hull_plate: { id: 137, name: 'Tiridium Hull Plate', category: 'Construction', weight: 5, tier: 3 },
  hauler_bridge: { id: 139, name: 'Hauler Bridge', category: 'Manufacturing', weight: 40, tier: 3 },
  ftl_field_controller: { id: 115, name: 'FTL Field Controller', category: 'Electronics', weight: 4, tier: 3 },
  composite_shielding: { id: 120, name: 'Composite Shielding', category: 'Electronics', weight: 1.5, tier: 3 },
}

export const SPACESHIP_MATERIALS_T4: Record<string, Material> = {
  starglass_hull_plate: { id: 114, name: 'Starglass Hull Plate', category: 'Electronics', weight: 7.5, tier: 4 },
  extradimensional_ftl_emitter: { id: 160, name: 'Extra-dimensional FTL Emitter', category: 'Electronics', weight: 15, tier: 4 },
  freighter_bridge: { id: 166, name: 'Freighter Bridge', category: 'Manufacturing', weight: 75, tier: 4 },
  starlifter_structural_elements: { id: 171, name: 'Starlifter Structural Elements', category: 'Construction', weight: 25, tier: 4 },
  antimatter_reactor: { id: 150, name: 'Antimatter Reactor', category: 'Manufacturing', weight: 100, tier: 4 },
  nanoweave_shielding: { id: 121, name: 'Nanoweave Shielding', category: 'Construction', weight: 2, tier: 4 },
}

export const SPECIAL_MATERIALS: Record<string, Material> = {
  research_data: { id: 64, name: 'Research Data', category: 'Science', weight: 0.1, tier: 1 },
  advanced_research_data: { id: 65, name: 'Advanced Research Data', category: 'Science', weight: 0.1, tier: 2 },
  apex_research_data: { id: 127, name: 'Apex Research Data', category: 'Science', weight: 0.1, tier: 3 },
  quantum_research_data: { id: 164, name: 'Quantum Research Data', category: 'Science', weight: 0.1, tier: 4 },
  operating_system: { id: 146, name: 'Operating System', category: 'Science', weight: 0.01, tier: 3 },
  artificial_intelligence: { id: 147, name: 'Artificial Intelligence', category: 'Science', weight: 0.01, tier: 3 },
  ai_training_data: { id: 148, name: 'AI Training Data', category: 'Science', weight: 0.01, tier: 3 },
}

export const SPACESHIP_MATERIALS: Record<string, Material> = {
  ...SPACESHIP_MATERIALS_T1,
  ...SPACESHIP_MATERIALS_T2,
  ...SPACESHIP_MATERIALS_T3,
  ...SPACESHIP_MATERIALS_T4,
  ...SPECIAL_MATERIALS,
}
