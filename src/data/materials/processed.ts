import type { Material } from '../../types'

/**
 * Processed Materials - Tier 1
 * Basic refined materials from raw resources
 */
export const PROCESSED_MATERIALS_T1: Record<string, Material> = {
  iron: { id: 2, name: 'Iron', category: 'processed', weight: 1.5 },
  concrete: { id: 3, name: 'Concrete', category: 'processed', weight: 0.35 },
  polyethylene: { id: 25, name: 'Polyethylene', category: 'processed', weight: 0.035 },
  glass: { id: 33, name: 'Glass', category: 'processed', weight: 0.25 },
  steel: { id: 35, name: 'Steel', category: 'processed', weight: 2.5 },
  flux: { id: 41, name: 'Flux', category: 'processed', weight: 0.4 },
  aluminium: { id: 43, name: 'Aluminium', category: 'processed', weight: 1.25 },
  rubber: { id: 53, name: 'Rubber', category: 'processed', weight: 0.075 },
  ethanol: { id: 57, name: 'Ethanol', category: 'processed', weight: 0.2 },
  lubricant: { id: 58, name: 'Lubricant', category: 'processed', weight: 0.15 },
  color_compound: { id: 84, name: 'Color Compound', category: 'processed', weight: 0.25 },
  fabric: { id: 50, name: 'Fabric', category: 'processed', weight: 0.1 },
}

/**
 * Processed Materials - Tier 2
 * Advanced refined materials
 */
export const PROCESSED_MATERIALS_T2: Record<string, Material> = {
  copper: { id: 6, name: 'Copper', category: 'processed', weight: 2 },
  titanium: { id: 46, name: 'Titanium', category: 'processed', weight: 2 },
  neoplast: { id: 30, name: 'Neoplast', category: 'processed', weight: 0.1 },
  fertilizer: { id: 36, name: 'Fertilizer', category: 'processed', weight: 0.25 },
  sulfuric_acid: { id: 61, name: 'Sulfuric Acid', category: 'processed', weight: 0.3 },
  lithium: { id: 60, name: 'Lithium', category: 'processed', weight: 1.5 },
  copper_wire: { id: 62, name: 'Copper Wire', category: 'processed', weight: 0.1 },
  coolant: { id: 71, name: 'Coolant', category: 'processed', weight: 0.15 },
  epoxy: { id: 72, name: 'Epoxy', category: 'processed', weight: 0.15 },
  kevlar: { id: 74, name: 'Kevlar', category: 'processed', weight: 0.25 },
  aerogel: { id: 79, name: 'Aerogel', category: 'processed', weight: 0.4 },
  durablend: { id: 122, name: 'Durablend', category: 'processed', weight: 0.4 },
  neoplast_sheet: { id: 123, name: 'Neoplast Sheet', category: 'processed', weight: 0.6 },
}

/**
 * All processed materials
 */
export const PROCESSED_MATERIALS: Record<string, Material> = {
  ...PROCESSED_MATERIALS_T1,
  ...PROCESSED_MATERIALS_T2,
}
