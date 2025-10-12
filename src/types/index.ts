export type WorkerTier = 'worker' | 'technician' | 'engineer' | 'scientist'

export type IndustryType = 
  | 'Agriculture'
  | 'Chemistry'
  | 'Construction'
  | 'Electronics'
  | 'Food Production'
  | 'Manufacturing'
  | 'Metallurgy'
  | 'Resource Extraction'
  | 'Residential'
  | 'Science'

export interface Recipe {
  id: number
  name: string
  time: number
  inputs: Record<string, number>
  outputs: Record<string, number>
}

export interface Building {
  id: number
  name: string
  description?: string
  workers: number // Total de trabajadores
  workersByTier: [number, number, number, number] // [worker, technician, engineer, scientist]
  industryType: IndustryType
  tier: number
  recipes: Record<string, Recipe>
}

export interface Material {
  id: number
  name: string
  category: IndustryType
  weight?: number
}

export interface BuildingInstance {
  id: number
  buildingType: string
  quantity: number
  recipes: RecipeInstance[]
}

export interface RecipeInstance {
  id: number
  recipeKey: string
  planetModifier?: number // Modifier específico para esta receta (para Resource Extraction y Agriculture)
}

export interface GameData {
  buildings: Record<string, Building>
  materials: Record<string, Material>
  workerConsumption: Record<string, number>
}

export interface SavedData {
  buildings?: BuildingInstance[]
  prices?: Record<string, number>
  currentPrices?: Record<string, number> // Precio actual de la API
  avgPrices?: Record<string, number> // Precio promedio de la API
  usePriceType?: 'current' | 'avg' // Tipo de precio a usar en los cálculos
  stock?: Record<string, number>
  lockedPrices?: Record<string, boolean>
  productivity?: number
  gameSpeed?: number
  technologyLevels?: Record<IndustryType, number>
  optionalConsumables?: Record<string, boolean>
  workerPlanDays?: number
  materialPlanDays?: number
  planDays?: number // Generic plan days (deprecated, use workerPlanDays or materialPlanDays)
}

export interface Calculations {
  totalInputs: Record<string, number>
  totalOutputs: Record<string, number>
  netBalance: Record<string, number>
  totalWorkers: number
  totalWorkersByTier: [number, number, number, number] // [worker, technician, engineer, scientist]
  workerConsumption: Record<string, number>
}
