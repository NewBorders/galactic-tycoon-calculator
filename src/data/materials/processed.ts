import type { Material } from '../../types'

/**
 * Processed Materials - Tier 1
 * Basic refined materials from raw resources
 */
export const PROCESSED_MATERIALS_T1: Record<string, Material> = {
  iron: { id: 2, name: 'Iron', category: 'Metallurgy', weight: 1.5, tier: 1 },
  concrete: { id: 3, name: 'Concrete', category: 'Construction', weight: 0.35, tier: 1 },
  polyethylene: { id: 25, name: 'Polyethylene', category: 'Chemistry', weight: 0.035, tier: 1 },
  glass: { id: 33, name: 'Glass', category: 'Metallurgy', weight: 0.25, tier: 1 },
  steel: { id: 35, name: 'Steel', category: 'Metallurgy', weight: 2.5, tier: 1 },
  flux: { id: 41, name: 'Flux', category: 'Chemistry', weight: 0.4, tier: 1 },
  aluminium: { id: 43, name: 'Aluminium', category: 'Metallurgy', weight: 1.25, tier: 1 },
  rubber: { id: 53, name: 'Rubber', category: 'Chemistry', weight: 0.075, tier: 1 },
  ethanol: { id: 57, name: 'Ethanol', category: 'Chemistry', weight: 0.2, tier: 1 },
  lubricant: { id: 58, name: 'Lubricant', category: 'Chemistry', weight: 0.15, tier: 1 },
  color_compound: { id: 84, name: 'Color Compound', category: 'Chemistry', weight: 0.25, tier: 1 },
  fabric: { id: 50, name: 'Fabric', category: 'Manufacturing', weight: 0.1, tier: 1 },
}

/**
 * Processed Materials - Tier 2
 * Advanced refined materials
 */
export const PROCESSED_MATERIALS_T2: Record<string, Material> = {
  copper: { id: 6, name: 'Copper', category: 'Metallurgy', weight: 2, tier: 2 },
  titanium: { id: 46, name: 'Titanium', category: 'Metallurgy', weight: 2, tier: 2 },
  neoplast: { id: 30, name: 'Neoplast', category: 'Chemistry', weight: 0.1, tier: 2 },
  fertilizer: { id: 36, name: 'Fertilizer', category: 'Chemistry', weight: 0.25, tier: 2 },
  sulfuric_acid: { id: 61, name: 'Sulfuric Acid', category: 'Chemistry', weight: 0.3, tier: 2 },
  lithium: { id: 60, name: 'Lithium', category: 'Chemistry', weight: 1.5, tier: 2 },
  copper_wire: { id: 62, name: 'Copper Wire', category: 'Metallurgy', weight: 0.1, tier: 2 },
  coolant: { id: 71, name: 'Coolant', category: 'Chemistry', weight: 0.15, tier: 2 },
  epoxy: { id: 72, name: 'Epoxy', category: 'Chemistry', weight: 0.15, tier: 2 },
  kevlar: { id: 74, name: 'Kevlar', category: 'Manufacturing', weight: 0.25, tier: 2 },
  aerogel: { id: 79, name: 'Aerogel', category: 'Chemistry', weight: 0.4, tier: 2 },
  durablend: { id: 122, name: 'Durablend', category: 'Construction', weight: 0.4, tier: 2 },
  neoplast_sheet: { id: 123, name: 'Neoplast Sheet', category: 'Chemistry', weight: 0.6, tier: 2 },
  silicon_wafer: { id: 126, name: 'Silicon Wafer', category: 'Metallurgy', weight: 0.1, tier: 2 },
}

/**
 * Processed Materials - Tier 3
 * High-tech refined materials
 */
export const PROCESSED_MATERIALS_T3: Record<string, Material> = {
  platinum: { id: 76, name: 'Platinum', category: 'Metallurgy', weight: 2.5, tier: 3 },
  graphene: { id: 77, name: 'Graphene', category: 'Metallurgy', weight: 0.25, tier: 3 },
  carbon_nanotubes: { id: 78, name: 'Carbon Nanotubes', category: 'Metallurgy', weight: 0.1, tier: 3 },
  aeridium: { id: 135, name: 'Aeridium', category: 'Metallurgy', weight: 3, tier: 3 },
  tiridium_alloy: { id: 136, name: 'Tiridium Alloy', category: 'Metallurgy', weight: 4, tier: 3 },
  cohesilite: { id: 145, name: 'Cohesilite', category: 'Construction', weight: 0.6, tier: 3 },
  nanopolyne: { id: 141, name: 'Nanopolyne', category: 'Chemistry', weight: 0.3, tier: 3 },
  nanoweave: { id: 142, name: 'Nanoweave', category: 'Chemistry', weight: 0.5, tier: 3 },
  bio_nutrient_blend: { id: 175, name: 'Bio-Nutrient Blend', category: 'Chemistry', weight: 0.3, tier: 3 },
}

/**
 * Processed Materials - Tier 4
 * Cutting-edge exotic materials
 */
export const PROCESSED_MATERIALS_T4: Record<string, Material> = {
  graphenium: { id: 172, name: 'Graphenium', category: 'Chemistry', weight: 2, tier: 4 },
  quadranium: { id: 159, name: 'Quadranium', category: 'Chemistry', weight: 4, tier: 4 },
  starglass: { id: 170, name: 'Starglass', category: 'Chemistry', weight: 4, tier: 4 },
  biopolyne: { id: 162, name: 'Biopolyne', category: 'Chemistry', weight: 0.6, tier: 4 },
  antimatter: { id: 149, name: 'Antimatter', category: 'Chemistry', weight: 3, tier: 4 },
}

/**
 * All processed materials
 */
export const PROCESSED_MATERIALS: Record<string, Material> = {
  ...PROCESSED_MATERIALS_T1,
  ...PROCESSED_MATERIALS_T2,
  ...PROCESSED_MATERIALS_T3,
  ...PROCESSED_MATERIALS_T4,
}
