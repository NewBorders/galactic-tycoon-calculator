import type { Material } from '../../types'

/**
 * Raw Materials - Tier 1
 * Basic resources extracted from planets
 */
export const RAW_MATERIALS_T1: Record<string, Material> = {
  iron_ore: { id: 1, name: 'Iron Ore', category: 'raw', weight: 1 },
  silica: { id: 8, name: 'Silica', category: 'raw', weight: 0.8 },
  limestone: { id: 34, name: 'Limestone', category: 'raw', weight: 1 },
  grain: { id: 4, name: 'Grain', category: 'raw', weight: 0.05 },
  oxygen: { id: 7, name: 'Oxygen', category: 'raw', weight: 0.5 },
  water: { id: 11, name: 'Water', category: 'raw', weight: 0.65 },
  hydrogen: { id: 24, name: 'Hydrogen', category: 'raw', weight: 0.3 },
  carbon: { id: 31, name: 'Carbon', category: 'raw', weight: 0.75 },
  nitrogen: { id: 32, name: 'Nitrogen', category: 'raw', weight: 0.5 },
  aluminium_ore: { id: 42, name: 'Aluminium Ore', category: 'raw', weight: 1.25 },
}

/**
 * Raw Materials - Tier 2
 * Advanced resources from richer planets
 */
export const RAW_MATERIALS_T2: Record<string, Material> = {
  copper_ore: { id: 5, name: 'Copper Ore', category: 'raw', weight: 2 },
  titanium_ore: { id: 45, name: 'Titanium Ore', category: 'raw', weight: 2 },
  platinum_ore: { id: 75, name: 'Platinum Ore', category: 'raw', weight: 2 },
  argon: { id: 69, name: 'Argon', category: 'raw', weight: 0.6 },
}

/**
 * All raw materials
 */
export const RAW_MATERIALS: Record<string, Material> = {
  ...RAW_MATERIALS_T1,
  ...RAW_MATERIALS_T2,
}
