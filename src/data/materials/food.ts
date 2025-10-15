import type { Material } from '../../types'

export const FOOD_MATERIALS_T1: Record<string, Material> = {
  fruits: { id: 28, name: 'Fruits', category: 'Agriculture', weight: 0.2, tier: 1 },
  vegetables: { id: 29, name: 'Vegetables', category: 'Agriculture', weight: 0.2, tier: 1 },
  cows: { id: 37, name: 'Cows', category: 'Agriculture', weight: 3, tier: 1 },
  meat: { id: 38, name: 'Meat', category: 'Agriculture', weight: 0.25, tier: 1 },
  cotton: { id: 39, name: 'Cotton', category: 'Agriculture', weight: 0.2, tier: 1 },
  wood: { id: 48, name: 'Wood', category: 'Agriculture', weight: 0.65, tier: 1 },
  leather: { id: 49, name: 'Leather', category: 'Agriculture', weight: 0.3, tier: 1 },
}

export const FOOD_MATERIALS_T2: Record<string, Material> = {
  milk: { id: 9, name: 'Milk', category: 'Agriculture', weight: 0.2, tier: 2 },
  fine_rations: { id: 13, name: 'Fine Rations', category: 'Food Production', weight: 0.15, tier: 2 },
  coffee_beans: { id: 51, name: 'Coffee Beans', category: 'Agriculture', weight: 0.25, tier: 2 },
  coffee: { id: 21, name: 'Coffee', category: 'Food Production', weight: 0.2, tier: 2 },
  chickens: { id: 88, name: 'Chickens', category: 'Agriculture', weight: 0.25, tier: 2 },
  honeycaps: { id: 128, name: 'Honeycaps', category: 'Agriculture', weight: 0.25, tier: 2 },
  sugar: { id: 129, name: 'Sugar', category: 'Food Production', weight: 0.25, tier: 2 },
  pie: { id: 130, name: 'Pie', category: 'Food Production', weight: 0.4, tier: 2 },
  eggs: { id: 131, name: 'Eggs', category: 'Agriculture', weight: 0.2, tier: 2 },
  herbs: { id: 156, name: 'Herbs', category: 'Agriculture', weight: 0.15, tier: 2 },
  vitaqua: { id: 158, name: 'Vitaqua', category: 'Food Production', weight: 0.15, tier: 2 },
}

export const FOOD_MATERIALS_T3: Record<string, Material> = {
  gourmet_rations: { id: 153, name: 'Gourmet Rations', category: 'Food Production', weight: 0.25, tier: 3 },
  exotic_spices: { id: 154, name: 'Exotic Spices', category: 'Agriculture', weight: 0.3, tier: 3 },
  lobster: { id: 155, name: 'Lobster', category: 'Agriculture', weight: 0.4, tier: 3 },
  rejuvaline: { id: 157, name: 'Rejuvaline', category: 'Chemistry', weight: 0.2, tier: 3 },
}

export const FOOD_MATERIALS: Record<string, Material> = {
  ...FOOD_MATERIALS_T1,
  ...FOOD_MATERIALS_T2,
  ...FOOD_MATERIALS_T3,
}
