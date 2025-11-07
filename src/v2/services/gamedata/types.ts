export type GameData = {
  systems: System[]
  planets: Planet[]
  materials: Material[]
  buildings: Building[]
  recipes: Recipe[]
  workers: Worker[]
}

export type GdIndex = {
  materialById: Map<number, Material>
  buildingById: Map<number, Building>
  planetById: Map<number, Planet>
  systemById: Map<number, System>
  recipeById: Map<number, Recipe>
  workerByType: Map<number, Worker>
}

export type System = {
  id: number
  name: string
  x: number
  y: number
  v: number //Visual variation identifier
}

export type PlanetMaterial = {
  id: number
  name: string
  abundanceRating: number // affects extraction speed: 50=half speed, 200=double
}

export type Planet = {
  id: number
  systemId: number
  name: string
  fertility: number // Fertility (100 is standard, 0=no farming)
  tier: number
  x: number
  y: number
  materials: PlanetMaterial[]
  type: string // Planet classification enum (visual only)
  size: number // Planet size (visual only)
}

export type Material = {
  id: number
  name: string
  shortName: string
  description: string
  type: number
  calculatedPriceInCents: number // price of material calculated by internal algorithm, the actual market price may vary
  reqTech: number // Required technology level to produce (0=none)
  source: number
  tier: number
  weightInTonnes: number
}

export type Building = {
  id: number
  name: string
  description: string
  constructionMaterials: Array<{
    id: number
    name: string
    amount: number
  }>
  specialization: number // Building specialization enum (Construction = 1, Manufacturing = 2, Agriculture = 3, ResourceExtraction = 4, Metallurgy = 5, Chemistry = 6, Electronics = 7, FoodProduction = 8, Science = 10)
  tier: number
  recipesIds: null | Array<number>
  workersHousing: {
    worker: number
    technician: number
    engineer: number
    scientist: number
  } // Housing capacity by type
  workersNeeded: {
    worker: number
    technician: number
    engineer: number
    scientist: number
  } // Worker requirements by type
}

export type RecipeInput = {
  id: number
  name: string
  amount: number
}

export type Recipe = {
  id: number
  producedInId: number
  producedInName: string
  reqTech: number
  timeMinutes: number
  type: number
  inputs: RecipeInput[]
  output: {
    id: number
    name: string
    amount: number
  }
}

export type Worker = {
  type: number
  adminCost: number // Administration overhead (Expansion Burden) per 100 workers
  consumables: Array<{
    matId: number
    matName: string
    amount: number
    essential: boolean
  }>
}
