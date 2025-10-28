export type GameDataRaw = {
  systems: SystemRaw[]
  materials: MaterialRaw[]
  buildings: BuildingRaw[]
  recipes: RecipeRaw[]
  workers: WorkerRaw[]
}

export type SystemRaw = {
  id: number
  name: string
  x: number
  y: number
  v: number //Visual variation identifier
  planets: PlanetRaw[] | null
}

export type PlanetRaw = {
  id: number
  sId: number // systemId
  name: string
  fert: number // Fertility (100 is standard, 0=no farming)
  tier: number
  x: number
  y: number
  mats: Array<{
    id: number
    ab: number // Abundance rating (affects extraction speed: 50=half speed, 200=double)
  }>
  type: string // Planet classification enum (visual only)
  size: number // Planet size (visual only)
}

export type MaterialRaw = {
  id: number
  name: string
  sName: string //Short display name
  description: string
  type: number // Material category enum
  cp: number // Calculated base price in cents (price of material calculated by internal algorithm, the actual market price may vary)
  reqTech: number // Required technology level to produce (0=none)
  source: number // 1=extraction, 2=crafting/farming
  tier: number
  weight: number
}

export type BuildingRaw = {
  id: number
  name: string
  description: string
  constructionMaterials: Array<{
    id: number
    am: number
  }>
  specialization: number // Building specialization enum (Construction = 1, Manufacturing = 2, Agriculture = 3, ResourceExtraction = 4, Metallurgy = 5, Chemistry = 6, Electronics = 7, FoodProduction = 8, Science = 10)
  tier: number
  cost: number // unused
  requiredResearch: number // Unused
  recipesIds: null | Array<number>
  workersHousing: null | Array<number> // Housing capacity by type
  workersNeeded: null | Array<number> //Worker requirements by type [Worker, Technician, Engineer, Scientist]
}

export type RecipeRawInput = {
  id: number
  am: number
}

export type RecipeRaw = {
  id: number
  producedIn: number
  reqTech: number
  timeMinutes: number
  type: number
  inputs: RecipeRawInput[]
  output: {
    id: number
    am: number
  }
}

export type WorkerRaw = {
  type: number
  adminCost: number // Administration overhead (Expansion Burden) per 100 workers
  consumables: Array<{
    matId: number
    amount: number
    essential: boolean
  }>
}
