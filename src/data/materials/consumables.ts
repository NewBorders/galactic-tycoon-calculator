import type { Material } from '../../types'

export const CONSUMABLES_T1: Record<string, Material> = {
  rations: { id: 12, name: 'Rations', category: 'Food Production', weight: 0.1, tier: 1 },
  drinking_water: { id: 16, name: 'Drinking Water', category: 'Food Production', weight: 0.1, tier: 1 },
  tools: { id: 17, name: 'Tools', category: 'Manufacturing', weight: 0.1, tier: 1 },
  ale: { id: 10, name: 'Ale', category: 'Food Production', weight: 0.15, tier: 1 },
  hydrogen_fuel: { id: 110, name: 'Hydrogen Fuel', category: 'Chemistry', weight: 0.25, tier: 1 },
}

export const CONSUMABLES_T2: Record<string, Material> = {
  advanced_tools: { id: 18, name: 'Advanced Tools', category: 'Manufacturing', weight: 0.35, tier: 2 },
  ship_repair_kit: { id: 113, name: 'Ship Repair Kit', category: 'Construction', weight: 0.75, tier: 1 },
}

export const CONSUMABLES_T3: Record<string, Material> = {
  spectra_modulator: { id: 85, name: 'Spectra Modulator', category: 'Electronics', weight: 0.3, tier: 3 },
}

export const CONSUMABLES_T4: Record<string, Material> = {
  nanites: { id: 163, name: 'Nanites', category: 'Electronics', weight: 0.4, tier: 4 },
}

export const CONSUMABLES: Record<string, Material> = {
  ...CONSUMABLES_T1,
  ...CONSUMABLES_T2,
  ...CONSUMABLES_T3,
  ...CONSUMABLES_T4,
}
