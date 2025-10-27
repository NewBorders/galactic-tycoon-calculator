import type { Material } from '../../types'

/**
 * Raw Materials - Tier 1
 * Basic resources extracted from planets
 */
export const RAW_MATERIALS_T1: Record<string, Material> = {
  iron_ore: { id: 1, name: 'Iron Ore', category: 'Resource Extraction', weight: 1, tier: 1 },
  silica: { id: 8, name: 'Silica', category: 'Resource Extraction', weight: 0.8, tier: 1 },
  limestone: { id: 34, name: 'Limestone', category: 'Resource Extraction', weight: 1, tier: 1 },
  grain: { id: 4, name: 'Grain', category: 'Agriculture', weight: 0.05, tier: 1 },
  oxygen: { id: 7, name: 'Oxygen', category: 'Resource Extraction', weight: 0.5, tier: 1 },
  water: { id: 11, name: 'Water', category: 'Resource Extraction', weight: 0.65, tier: 1 },
  hydrogen: { id: 24, name: 'Hydrogen', category: 'Resource Extraction', weight: 0.3, tier: 1 },
  carbon: { id: 31, name: 'Carbon', category: 'Chemistry', weight: 0.75, tier: 1 },
  nitrogen: { id: 32, name: 'Nitrogen', category: 'Resource Extraction', weight: 0.5, tier: 1 },
  aluminium_ore: { id: 42, name: 'Aluminium Ore', category: 'Resource Extraction', weight: 1.25, tier: 1 },
}

/**
 * Raw Materials - Tier 2
 * Advanced resources from richer planets
 */
export const RAW_MATERIALS_T2: Record<string, Material> = {
  copper_ore: { id: 5, name: 'Copper Ore', category: 'Resource Extraction', weight: 2, tier: 2 },
  titanium_ore: { id: 45, name: 'Titanium Ore', category: 'Resource Extraction', weight: 2, tier: 2 },
  platinum_ore: { id: 75, name: 'Platinum Ore', category: 'Resource Extraction', weight: 2, tier: 3 },
  argon: { id: 69, name: 'Argon', category: 'Resource Extraction', weight: 0.6, tier: 2 },
}

/**
 * Raw Materials - Tier 3
 * Rare and specialized resources
 */
export const RAW_MATERIALS_T3: Record<string, Material> = {
  uranium_ore: { id: 40, name: 'Uranium Ore', category: 'Resource Extraction', weight: 1.5, tier: 3 },
  aeridium_ore: { id: 67, name: 'Aeridium Ore', category: 'Resource Extraction', weight: 3, tier: 3 },
  bioxene: { id: 22, name: 'Bioxene', category: 'Resource Extraction', weight: 1, tier: 3 },
}

/**
 * Raw Materials - Tier 4
 * Ultra-rare exotic materials
 */
export const RAW_MATERIALS_T4: Record<string, Material> = {
  tesserite: { id: 23, name: 'Tesserite', category: 'Resource Extraction', weight: 3.5, tier: 4 },
  kryon: { id: 70, name: 'Kryon', category: 'Resource Extraction', weight: 0.75, tier: 4 },
}

/**
 * All raw materials
 */
export const RAW_MATERIALS: Record<string, Material> = {
  ...RAW_MATERIALS_T1,
  ...RAW_MATERIALS_T2,
  ...RAW_MATERIALS_T3,
  ...RAW_MATERIALS_T4,
}
