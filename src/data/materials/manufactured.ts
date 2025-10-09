import type { Material } from '../../types'

/**
 * Manufactured Materials - Tier 1
 * Complex products assembled from processed materials
 */
export const MANUFACTURED_MATERIALS_T1: Record<string, Material> = {
  construction_kit: { id: 26, name: 'Construction Kit', category: 'manufactured', weight: 2 },
  construction_tools: { id: 27, name: 'Construction Tools', category: 'manufactured', weight: 0.25 },
  prefab_kit: { id: 92, name: 'Prefab Kit', category: 'manufactured', weight: 2 },
  amenities: { id: 93, name: 'Amenities', category: 'manufactured', weight: 1.5 },
  pipes: { id: 68, name: 'Pipes', category: 'manufactured', weight: 0.35 },
  office_supplies: { id: 66, name: 'Office Supplies', category: 'manufactured', weight: 0.3 },
  furniture: { id: 47, name: 'Furniture', category: 'manufactured', weight: 0.4 },
  truss: { id: 98, name: 'Truss', category: 'manufactured', weight: 2 },
  welding_kit: { id: 108, name: 'Welding Kit', category: 'manufactured', weight: 0.6 },
  hull_plate: { id: 104, name: 'Hull Plate', category: 'manufactured', weight: 2 },
}

/**
 * Manufactured Materials - Tier 2
 * Advanced components and systems
 */
export const MANUFACTURED_MATERIALS_T2: Record<string, Material> = {
  combustion_engine: { id: 54, name: 'Combustion Engine', category: 'manufactured', weight: 2 },
  electric_motor: { id: 55, name: 'Electric Motor', category: 'manufactured', weight: 0.65 },
  battery: { id: 56, name: 'Battery', category: 'manufactured', weight: 0.3 },
  electronic_circuit: { id: 59, name: 'Electronic Circuit', category: 'manufactured', weight: 0.1 },
  consumer_electronics: { id: 63, name: 'Consumer Electronics', category: 'manufactured', weight: 0.4 },
  transistor: { id: 124, name: 'Transistor', category: 'manufactured', weight: 0.1 },
  chip: { id: 125, name: 'Chip', category: 'manufactured', weight: 0.15 },
  silicon_wafer: { id: 126, name: 'Silicon Wafer', category: 'manufactured', weight: 0.1 },
  advanced_circuit_board: { id: 112, name: 'Advanced Circuit Board', category: 'manufactured', weight: 0.2 },
  pump: { id: 107, name: 'Pump', category: 'manufactured', weight: 0.6 },
  cooling_system: { id: 117, name: 'Cooling System', category: 'manufactured', weight: 1.25 },
  control_console: { id: 102, name: 'Control Console', category: 'manufactured', weight: 0.75 },
  reinforced_glass: { id: 83, name: 'Reinforced Glass', category: 'manufactured', weight: 0.4 },
  insulation_panels: { id: 89, name: 'Insulation Panels', category: 'manufactured', weight: 0.4 },
  pressure_sealant_kit: { id: 90, name: 'Pressure Sealant Kit', category: 'manufactured', weight: 0.5 },
  modern_prefab_kit: { id: 132, name: 'Modern Prefab Kit', category: 'manufactured', weight: 2 },
  composite_truss: { id: 99, name: 'Composite Truss', category: 'manufactured', weight: 2.5 },
}

/**
 * All manufactured materials
 */
export const MANUFACTURED_MATERIALS: Record<string, Material> = {
  ...MANUFACTURED_MATERIALS_T1,
  ...MANUFACTURED_MATERIALS_T2,
}
