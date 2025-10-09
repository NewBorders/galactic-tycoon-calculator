import type { Material } from '../../types'

export const FOOD_MATERIALS_T1: Record<string, Material> = {
  fruits: { id: 28, name: 'Fruits', category: 'Agriculture', weight: 0.2 },
  vegetables: { id: 29, name: 'Vegetables', category: 'Agriculture', weight: 0.2 },
  cows: { id: 37, name: 'Cows', category: 'Agriculture', weight: 3 },
  meat: { id: 38, name: 'Meat', category: 'Agriculture', weight: 0.25 },
  cotton: { id: 39, name: 'Cotton', category: 'Agriculture', weight: 0.2 },
  wood: { id: 48, name: 'Wood', category: 'Agriculture', weight: 0.65 },
  leather: { id: 49, name: 'Leather', category: 'Agriculture', weight: 0.3 },
}

export const FOOD_MATERIALS_T2: Record<string, Material> = {
  milk: { id: 9, name: 'Milk', category: 'Agriculture', weight: 0.2 },
  fine_rations: { id: 13, name: 'Fine Rations', category: 'Food Production', weight: 0.15 },
  coffee_beans: { id: 51, name: 'Coffee Beans', category: 'Agriculture', weight: 0.25 },
  coffee: { id: 21, name: 'Coffee', category: 'Food Production', weight: 0.2 },
  chickens: { id: 88, name: 'Chickens', category: 'Agriculture', weight: 0.25 },
  honeycaps: { id: 128, name: 'Honeycaps', category: 'Agriculture', weight: 0.25 },
  sugar: { id: 129, name: 'Sugar', category: 'Food Production', weight: 0.25 },
  pie: { id: 130, name: 'Pie', category: 'Food Production', weight: 0.4 },
  eggs: { id: 131, name: 'Eggs', category: 'Agriculture', weight: 0.2 },
  herbs: { id: 156, name: 'Herbs', category: 'Agriculture', weight: 0.15 },
  vitaqua: { id: 158, name: 'Vitaqua', category: 'Food Production', weight: 0.15 },
}

export const FOOD_MATERIALS_T3: Record<string, Material> = {
  gourmet_rations: { id: 153, name: 'Gourmet Rations', category: 'Food Production', weight: 0.25 },
  exotic_spices: { id: 154, name: 'Exotic Spices', category: 'Agriculture', weight: 0.3 },
  lobster: { id: 155, name: 'Lobster', category: 'Agriculture', weight: 0.4 },
  rejuvaline: { id: 157, name: 'Rejuvaline', category: 'Chemistry', weight: 0.2 },
}

export const FOOD_MATERIALS: Record<string, Material> = {
  ...FOOD_MATERIALS_T1,
  ...FOOD_MATERIALS_T2,
  ...FOOD_MATERIALS_T3,
}
