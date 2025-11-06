// src/v2/services/production/types.ts
import type { GameData } from '../gamedata/service'

export type BaseAssignment = {
  planetId: number
  buildings: Array<{ buildingId: number; level: number; count?: number }>
  recipes: Array<{ recipeId: number }>
}

export type Horizon = 1 | 7 | 14 | 30

export type BaseDailySummary = {
  costs: number
  revenue: number
  net: number
}

export type MaterialBalance = {
  materialId: number
  balancePerDay: number
  valuePerDay: number
}

export type WorkerConsumptionRow = {
  tier: 1 | 2 | 3 | 4
  materialId: number
  consumptionPerDay: number
  costPerDay: number
  optional: boolean
  active: boolean
}

export type RecipeProductionRow = {
  recipeId: number
  buildingId: number
  buildingUnits: number
  queueShare: number
  timeMinutes: number
  effectiveTimeMinutes: number
  cyclesPerDayPerUnit: number
  runsPerDay: number
  outputMaterialId: number
  outputAmountPerCycle: number
  outputPerDay: number
  inputsPerDay: Array<{ materialId: number; amount: number }>
  workforce: Array<{ tier: 1 | 2 | 3 | 4; required: number; assigned: number }>
  abundanceFactor: number
  productivityFactor: number
  workforceFactor: number
  blockedByAbundance: boolean
}

export type BaseReport = {
  summary: BaseDailySummary
  materials: MaterialBalance[]
  workers: WorkerConsumptionRow[]
  recipes: RecipeProductionRow[]
  adminCostPerDay: number
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
