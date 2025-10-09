import type { Material } from '../../types'

/**
 * Manufactured Materials - Tier 1
 * Complex products assembled from processed materials
 */
export const MANUFACTURED_MATERIALS_T1: Record<string, Material> = {
  construction_kit: { id: 26, name: 'Construction Kit', category: 'Construction', weight: 2 },
  construction_tools: { id: 27, name: 'Construction Tools', category: 'Manufacturing', weight: 0.25 },
  prefab_kit: { id: 92, name: 'Prefab Kit', category: 'Construction', weight: 2 },
  amenities: { id: 93, name: 'Amenities', category: 'Construction', weight: 1.5 },
  pipes: { id: 68, name: 'Pipes', category: 'Manufacturing', weight: 0.35 },
  office_supplies: { id: 66, name: 'Office Supplies', category: 'Manufacturing', weight: 0.3 },
  furniture: { id: 47, name: 'Furniture', category: 'Manufacturing', weight: 0.4 },
  truss: { id: 98, name: 'Truss', category: 'Metallurgy', weight: 2 },
  welding_kit: { id: 108, name: 'Welding Kit', category: 'Manufacturing', weight: 0.6 },
  hull_plate: { id: 104, name: 'Hull Plate', category: 'Construction', weight: 2 },
  drill: { id: 87, name: 'Drill', category: 'Manufacturing', weight: 1 },
  fabric: { id: 50, name: 'Fabric', category: 'Manufacturing', weight: 0.1 },
}

/**
 * Manufactured Materials - Tier 2
 * Advanced components and systems
 */
export const MANUFACTURED_MATERIALS_T2: Record<string, Material> = {
  combustion_engine: { id: 54, name: 'Combustion Engine', category: 'Manufacturing', weight: 2 },
  electric_motor: { id: 55, name: 'Electric Motor', category: 'Electronics', weight: 0.65 },
  battery: { id: 56, name: 'Battery', category: 'Chemistry', weight: 0.3 },
  electronic_circuit: { id: 59, name: 'Electronic Circuit', category: 'Electronics', weight: 0.1 },
  consumer_electronics: { id: 63, name: 'Consumer Electronics', category: 'Electronics', weight: 0.4 },
  transistor: { id: 124, name: 'Transistor', category: 'Electronics', weight: 0.1 },
  chip: { id: 125, name: 'Chip', category: 'Electronics', weight: 0.15 },
  advanced_circuit_board: { id: 112, name: 'Advanced Circuit Board', category: 'Electronics', weight: 0.2 },
  pump: { id: 107, name: 'Pump', category: 'Electronics', weight: 0.6 },
  cooling_system: { id: 117, name: 'Cooling System', category: 'Manufacturing', weight: 1.25 },
  control_console: { id: 102, name: 'Control Console', category: 'Electronics', weight: 0.75 },
  reinforced_glass: { id: 83, name: 'Reinforced Glass', category: 'Chemistry', weight: 0.4 },
  insulation_panels: { id: 89, name: 'Insulation Panels', category: 'Chemistry', weight: 0.4 },
  pressure_sealant_kit: { id: 90, name: 'Pressure Sealant Kit', category: 'Construction', weight: 0.5 },
  modern_prefab_kit: { id: 132, name: 'Modern Prefab Kit', category: 'Construction', weight: 2 },
  composite_truss: { id: 99, name: 'Composite Truss', category: 'Metallurgy', weight: 2.5 },
  structural_elements: { id: 91, name: 'Structural Elements', category: 'Construction', weight: 2 },
  construction_vehicle: { id: 52, name: 'Construction Vehicle', category: 'Manufacturing', weight: 5 },
  mining_vehicle: { id: 86, name: 'Mining Vehicle', category: 'Manufacturing', weight: 5 },
  life_support_system: { id: 82, name: 'Life Support System', category: 'Manufacturing', weight: 1.5 },
  hydrogen_generator: { id: 101, name: 'Hydrogen Generator', category: 'Manufacturing', weight: 7.5 },
  drone: { id: 143, name: 'Drone', category: 'Electronics', weight: 1 },
  workwear: { id: 44, name: 'Workwear', category: 'Manufacturing', weight: 0.1 },
  kevlar: { id: 74, name: 'Kevlar', category: 'Manufacturing', weight: 0.25 },
}

/**
 * Manufactured Materials - Tier 3
 * High-tech systems and components
 */
export const MANUFACTURED_MATERIALS_T3: Record<string, Material> = {
  molecular_fusion_kit: { id: 19, name: 'Molecular Fusion Kit', category: 'Manufacturing', weight: 2 },
  advanced_construction_kit: { id: 94, name: 'Advanced Construction Kit', category: 'Construction', weight: 3.5 },
  advanced_prefab_kit: { id: 96, name: 'Advanced Prefab Kit', category: 'Construction', weight: 3.5 },
  advanced_amenities: { id: 97, name: 'Advanced Amenities', category: 'Construction', weight: 3 },
  titanium_carbide_drill: { id: 100, name: 'Titanium Carbide Drill', category: 'Manufacturing', weight: 1.5 },
  advanced_processing_unit: { id: 169, name: 'Advanced Processing Unit', category: 'Electronics', weight: 0.2 },
  sensor_array: { id: 116, name: 'Sensor Array', category: 'Electronics', weight: 3 },
  mainframe: { id: 140, name: 'Mainframe', category: 'Electronics', weight: 2.25 },
  vr_headset: { id: 119, name: 'VR Headset', category: 'Electronics', weight: 0.4 },
  fission_reactor: { id: 133, name: 'Fission Reactor', category: 'Manufacturing', weight: 25 },
  robot: { id: 20, name: 'Robot', category: 'Manufacturing', weight: 2 },
  filtration_system: { id: 165, name: 'Filtration System', category: 'Manufacturing', weight: 2 },
  industrial_machinery: { id: 161, name: 'Industrial Machinery', category: 'Construction', weight: 4 },
  radiation_shielding: { id: 81, name: 'Radiation Shielding', category: 'Manufacturing', weight: 2 },
  fission_fuel: { id: 73, name: 'Fission Fuel', category: 'Chemistry', weight: 1 },
  composite_shielding: { id: 120, name: 'Composite Shielding', category: 'Electronics', weight: 1.5 },
}

/**
 * Manufactured Materials - Tier 4
 * Cutting-edge technology and systems
 */
export const MANUFACTURED_MATERIALS_T4: Record<string, Material> = {
  apex_structural_elements: { id: 95, name: 'Apex Structural Elements', category: 'Construction', weight: 4 },
  apex_prefab_kit: { id: 144, name: 'Apex Prefab Kit', category: 'Construction', weight: 4 },
  aicore: { id: 138, name: 'AICore', category: 'Electronics', weight: 10 },
  quantum_mainframe: { id: 173, name: 'Quantum Mainframe', category: 'Electronics', weight: 7.5 },
  antimatter_reactor: { id: 150, name: 'Antimatter Reactor', category: 'Manufacturing', weight: 100 },
  antimatter_containment: { id: 151, name: 'Antimatter Containment', category: 'Manufacturing', weight: 3 },
  superconducting_coil: { id: 152, name: 'Superconducting Coil', category: 'Electronics', weight: 0.5 },
  graphenium_wire: { id: 80, name: 'Graphenium Wire', category: 'Metallurgy', weight: 0.4 },
  field_cooling_system: { id: 174, name: 'Field Cooling System', category: 'Manufacturing', weight: 6 },
  neural_interface: { id: 167, name: 'Neural Interface', category: 'Electronics', weight: 1.5 },
  ftl_field_controller: { id: 115, name: 'FTL Field Controller', category: 'Electronics', weight: 4 },
  laboratory_suit: { id: 14, name: 'Laboratory Suit', category: 'Manufacturing', weight: 0.5 },
  exosuit: { id: 15, name: 'Exosuit', category: 'Manufacturing', weight: 1 },
}

/**
 * All manufactured materials
 */
export const MANUFACTURED_MATERIALS: Record<string, Material> = {
  ...MANUFACTURED_MATERIALS_T1,
  ...MANUFACTURED_MATERIALS_T2,
  ...MANUFACTURED_MATERIALS_T3,
  ...MANUFACTURED_MATERIALS_T4,
}
