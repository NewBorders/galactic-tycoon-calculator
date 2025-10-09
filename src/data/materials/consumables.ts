import type { Material } from '../../types'

/**
 * Consumables - Tier 1
 * Basic worker supplies
 */
export const CONSUMABLES_T1: Record<string, Material> = {
  rations: { id: 12, name: 'Rations', category: 'consumable', weight: 0.1 },
  drinking_water: { id: 16, name: 'Drinking Water', category: 'consumable', weight: 0.1 },
  tools: { id: 17, name: 'Tools', category: 'consumable', weight: 0.1 },
  ale: { id: 10, name: 'Ale', category: 'consumable', weight: 0.15 },
  workwear: { id: 44, name: 'Workwear', category: 'consumable', weight: 0.1 },
  hydrogen_fuel: { id: 110, name: 'Hydrogen Fuel', category: 'consumable', weight: 0.25 },
}

/**
 * Consumables - Tier 2
 * Advanced worker and equipment supplies
 */
export const CONSUMABLES_T2: Record<string, Material> = {
  advanced_tools: { id: 18, name: 'Advanced Tools', category: 'consumable', weight: 0.35 },
  exosuit: { id: 15, name: 'Exosuit', category: 'consumable', weight: 1 },
  ship_repair_kit: { id: 113, name: 'Ship Repair Kit', category: 'consumable', weight: 0.75 },
}

/**
 * All consumable materials
 */
export const CONSUMABLES: Record<string, Material> = {
  ...CONSUMABLES_T1,
  ...CONSUMABLES_T2,
}
