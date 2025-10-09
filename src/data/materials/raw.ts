import type { Material } from '../../types'

/**
 * Raw Materials - Tier 1
 * Basic resources extracted from planets
 */
export const RAW_MATERIALS_T1: Record<string, Material> = {
  iron_ore: { id: 1, name: 'Iron Ore', category: 'Resource Extraction', weight: 1 },
  silica: { id: 8, name: 'Silica', category: 'Resource Extraction', weight: 0.8 },
  limestone: { id: 34, name: 'Limestone', category: 'Resource Extraction', weight: 1 },
  grain: { id: 4, name: 'Grain', category: 'Agriculture', weight: 0.05 },
  oxygen: { id: 7, name: 'Oxygen', category: 'Resource Extraction', weight: 0.5 },
  water: { id: 11, name: 'Water', category: 'Resource Extraction', weight: 0.65 },
  hydrogen: { id: 24, name: 'Hydrogen', category: 'Resource Extraction', weight: 0.3 },
  carbon: { id: 31, name: 'Carbon', category: 'Chemistry', weight: 0.75 },
  nitrogen: { id: 32, name: 'Nitrogen', category: 'Resource Extraction', weight: 0.5 },
  aluminium_ore: { id: 42, name: 'Aluminium Ore', category: 'Resource Extraction', weight: 1.25 },
}

/**
 * Raw Materials - Tier 2
 * Advanced resources from richer planets
 */
export const RAW_MATERIALS_T2: Record<string, Material> = {
  copper_ore: { id: 5, name: 'Copper Ore', category: 'Resource Extraction', weight: 2 },
  titanium_ore: { id: 45, name: 'Titanium Ore', category: 'Resource Extraction', weight: 2 },
  platinum_ore: { id: 75, name: 'Platinum Ore', category: 'Resource Extraction', weight: 2 },
  argon: { id: 69, name: 'Argon', category: 'Resource Extraction', weight: 0.6 },
}

/**
 * Raw Materials - Tier 3
 * Rare and specialized resources
 */
export const RAW_MATERIALS_T3: Record<string, Material> = {
  uranium_ore: { id: 40, name: 'Uranium Ore', category: 'Resource Extraction', weight: 1.5 },
  aeridium_ore: { id: 67, name: 'Aeridium Ore', category: 'Resource Extraction', weight: 3 },
  bioxene: { id: 22, name: 'Bioxene', category: 'Resource Extraction', weight: 1 },
}

/**
 * Raw Materials - Tier 4
 * Ultra-rare exotic materials
 */
export const RAW_MATERIALS_T4: Record<string, Material> = {
  tesserite: { id: 23, name: 'Tesserite', category: 'Resource Extraction', weight: 3.5 },
  kryon: { id: 70, name: 'Kryon', category: 'Resource Extraction', weight: 0.75 },
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
