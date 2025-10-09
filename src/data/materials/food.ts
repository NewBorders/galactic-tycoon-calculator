import type { Material } from '../../types'

/**
 * Food & Organic Materials - Tier 1
 * Basic agricultural and livestock products
 */
export const FOOD_MATERIALS_T1: Record<string, Material> = {
  fruits: { id: 28, name: 'Fruits', category: 'food', weight: 0.2 },
  vegetables: { id: 29, name: 'Vegetables', category: 'food', weight: 0.2 },
  cows: { id: 37, name: 'Cows', category: 'food', weight: 3 },
  meat: { id: 38, name: 'Meat', category: 'food', weight: 0.25 },
  cotton: { id: 39, name: 'Cotton', category: 'food', weight: 0.2 },
  wood: { id: 48, name: 'Wood', category: 'food', weight: 0.65 },
  leather: { id: 49, name: 'Leather', category: 'food', weight: 0.3 },
}

/**
 * Food & Organic Materials - Tier 2
 * Advanced agricultural products
 */
export const FOOD_MATERIALS_T2: Record<string, Material> = {
  milk: { id: 9, name: 'Milk', category: 'food', weight: 0.2 },
  fine_rations: { id: 13, name: 'Fine Rations', category: 'food', weight: 0.15 },
  coffee_beans: { id: 51, name: 'Coffee Beans', category: 'food', weight: 0.25 },
  coffee: { id: 21, name: 'Coffee', category: 'food', weight: 0.2 },
  chickens: { id: 88, name: 'Chickens', category: 'food', weight: 0.25 },
  honeycaps: { id: 128, name: 'Honeycaps', category: 'food', weight: 0.25 },
  sugar: { id: 129, name: 'Sugar', category: 'food', weight: 0.25 },
  pie: { id: 130, name: 'Pie', category: 'food', weight: 0.4 },
  eggs: { id: 131, name: 'Eggs', category: 'food', weight: 0.2 },
  herbs: { id: 156, name: 'Herbs', category: 'food', weight: 0.15 },
  vitaqua: { id: 158, name: 'Vitaqua', category: 'food', weight: 0.15 },
}

/**
 * All food and organic materials
 */
export const FOOD_MATERIALS: Record<string, Material> = {
  ...FOOD_MATERIALS_T1,
  ...FOOD_MATERIALS_T2,
}
