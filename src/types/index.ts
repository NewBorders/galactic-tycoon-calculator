export type IndustryType = 
  | 'Agriculture'
  | 'Chemistry'
  | 'Construction'
  | 'Electronics'
  | 'Food Production'
  | 'Manufacturing'
  | 'Metallurgy'
  | 'Resource Extraction'
  | 'Science'

export interface Recipe {
  name: string
  time: number
  inputs: Record<string, number>
  outputs: Record<string, number>
}

export interface Building {
  name: string
  workers: number
  industryType: IndustryType
  recipes: Record<string, Recipe>
}

export interface Material {
  name: string
  category: string
  weight?: number
}

export interface BuildingInstance {
  id: number
  buildingType: string
  quantity: number
  recipes: RecipeInstance[]
  planetModifiers?: Record<string, number>
}

export interface RecipeInstance {
  id: number
  recipeKey: string
}

export interface GameData {
  buildings: Record<string, Building>
  materials: Record<string, Material>
  workerConsumption: Record<string, number>
}

export interface SavedData {
  buildings?: BuildingInstance[]
  prices?: Record<string, number>
  stock?: Record<string, number>
  productivity?: number
  gameSpeed?: number
  technologyLevels?: Record<IndustryType, number>
  optionalConsumables?: Record<string, boolean>
}

export interface Calculations {
  totalInputs: Record<string, number>
  totalOutputs: Record<string, number>
  netBalance: Record<string, number>
  totalWorkers: number
  workerConsumption: Record<string, number>
}
