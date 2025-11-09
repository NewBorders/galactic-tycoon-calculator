// src/v2/services/production/types.ts
import type { GameData } from '../gamedata/service'

export type BaseAssignment = {
  planetId: number
  buildings: Array<{ buildingId: number; level: number; count?: number }>
  recipes: Array<{ recipeId: number; share?: number }>
}

export type Horizon = 1 | 7 | 14 | 30

export type BaseDailySummary = {
  productionRevenue: number
  materialPurchaseCosts: number
  workerPurchaseCosts: number
  net: number
}

export type MaterialBalance = {
  materialId: number
  balancePerDay: number
  unitPrice: number
  valuePerDay: number
}

export type WorkerConsumptionRow = {
  tier: 1 | 2 | 3 | 4
  materialId: number
  consumptionPerDay: number
  costPerDay: number
  unitPrice: number
  optional: boolean
  active: boolean
}

export type RecipeProductionRow = {
  recipeId: number
  buildingId: number
  buildingUnits: number
  queueShare: number
  timeMinutes: number
  adjustedTimeMinutes: number
  actualTimeMinutes: number
  nominalCyclesPerDayPerUnit: number
  cyclesPerDayPerUnit: number
  runsPerDay: number
  runsPerDayPerUnit: number
  outputMaterialId: number
  outputAmountPerCycle: number
  outputPerDay: number
  inputsPerDay: Array<{ materialId: number; amount: number }>
  workforce: Array<{ tier: 1 | 2 | 3 | 4; required: number; assigned: number }>
  abundanceFactor: number
  productivityFactor: number
  workforceFactor: number
  blockedByAbundance: boolean
  blockedReason: 'abundance' | 'fertility' | 'technology' | null
}

export type BaseReport = {
  summary: BaseDailySummary
  materials: MaterialBalance[]
  workers: WorkerConsumptionRow[]
  recipes: RecipeProductionRow[]
  workforceSummary: Array<{
    tier: 1 | 2 | 3 | 4
    required: number
    housing: number
    coverage: number
  }>
}

export type ComputeOptions = {
  theoretical?: boolean
  activeOptionalConsumables?: Set<number>
  technologyLevels?: Partial<Record<number, number>>
  startingBonus?: number
  priceResolver?: (materialId: number) => number
}

export type BaseProductionContext = {
  assignment: BaseAssignment
  horizonDays: Horizon
  options?: ComputeOptions
}

export type ProductionEngine = (
  gd: GameData,
  ctx: BaseProductionContext,
) => BaseReport
