import type { Building, GameData, Material, Recipe, Worker } from '../gamedata/types'
import {
  type BaseProductionContext,
  type BaseReport,
  type RecipeProductionRow,
} from './types'

const MINUTES_PER_DAY = 60 * 24

function priceOf(material: Material | undefined): number {
  if (!material) return 0
  const cents = material.calculatedPriceInCents ?? 0
  return cents / 100
}

function clampPositiveInt(value: number | undefined, fallback = 0): number {
  if (!value || Number.isNaN(value)) return fallback
  return Math.max(fallback, Math.floor(value))
}

type WorkerTotals = Map<number, number>

function addToMap(map: Map<number, number>, key: number, value: number) {
  const prev = map.get(key) ?? 0
  map.set(key, prev + value)
}

function allocateLines(
  availableByBuilding: Map<number, number>,
  usedByBuilding: Map<number, number>,
  recipe: Recipe,
  requested: number,
): { effective: number; overCapacity: boolean; maxLines: number } {
  const buildingId = recipe.producedInId
  const maxLines = availableByBuilding.get(buildingId) ?? 0
  if (maxLines <= 0) {
    return { effective: 0, overCapacity: requested > 0, maxLines }
  }
  const alreadyUsed = usedByBuilding.get(buildingId) ?? 0
  const remaining = Math.max(0, maxLines - alreadyUsed)
  const effective = Math.min(requested, remaining)
  const overCapacity = requested > remaining
  usedByBuilding.set(buildingId, alreadyUsed + effective)
  return { effective, overCapacity, maxLines }
}

function computeRecipeRow(
  recipe: Recipe,
  requestedLines: number,
  effectiveLines: number,
  overCapacity: boolean,
  maxLines: number,
): RecipeProductionRow {
  const perLineCycles = recipe.timeMinutes > 0 ? MINUTES_PER_DAY / recipe.timeMinutes : 0
  const totalCycles = perLineCycles * effectiveLines
  const outputPerDay = totalCycles * recipe.output.amount
  const inputsPerDay = recipe.inputs.map((input) => ({
    materialId: input.id,
    amount: totalCycles * input.amount,
  }))

  return {
    recipeId: recipe.id,
    buildingId: recipe.producedInId,
    requestedLines,
    effectiveLines,
    maxLines,
    timeMinutes: recipe.timeMinutes,
    cyclesPerDayPerLine: perLineCycles,
    outputMaterialId: recipe.output.id,
    outputAmountPerCycle: recipe.output.amount,
    outputPerDay,
    inputsPerDay,
    overCapacity,
  }
}

export function computeBaseReport(gd: GameData, ctx: BaseProductionContext): BaseReport {
  const { assignment } = ctx

  const materialById = new Map<number, Material>(gd.materials.map((m) => [m.id, m]))
  const recipeById = new Map<number, Recipe>(gd.recipes.map((r) => [r.id, r]))
  const buildingById = new Map<number, Building>(gd.buildings.map((b) => [b.id, b]))
  const workerByType = new Map<number, Worker>(gd.workers.map((w) => [w.type, w]))

  const availableLines = new Map<number, number>()
  assignment.buildings.forEach((b) => {
    const level = clampPositiveInt(b.level, 1)
    const count = clampPositiveInt(b.count, 1)
    addToMap(availableLines, b.buildingId, level * count)
  })

  const usedLines = new Map<number, number>()
  const materialBalance = new Map<number, number>()
  let materialCosts = 0
  let revenue = 0

  const recipeRows: RecipeProductionRow[] = []
  const workerTotals: WorkerTotals = new Map()

  assignment.recipes.forEach((selection) => {
    const recipe = recipeById.get(selection.recipeId)
    if (!recipe) return

    const requested = Math.max(0, Math.floor(selection.lines ?? 0))
    const { effective, overCapacity, maxLines } = allocateLines(
      availableLines,
      usedLines,
      recipe,
      requested,
    )

    const row = computeRecipeRow(recipe, requested, effective, overCapacity, maxLines)
    recipeRows.push(row)

    if (row.outputPerDay > 0) {
      addToMap(materialBalance, recipe.output.id, row.outputPerDay)
      const matPrice = priceOf(materialById.get(recipe.output.id))
      revenue += row.outputPerDay * matPrice
    }

    row.inputsPerDay.forEach((inp) => {
      if (inp.amount <= 0) return
      addToMap(materialBalance, inp.materialId, -inp.amount)
      const matPrice = priceOf(materialById.get(inp.materialId))
      materialCosts += inp.amount * matPrice
    })

    if (effective > 0) {
      const building = buildingById.get(recipe.producedInId)
      if (building) {
        const req = building.workersNeeded
        if (req) {
          if (req.worker) addToMap(workerTotals, 1, req.worker * effective)
          if (req.technician) addToMap(workerTotals, 2, req.technician * effective)
          if (req.engineer) addToMap(workerTotals, 3, req.engineer * effective)
          if (req.scientist) addToMap(workerTotals, 4, req.scientist * effective)
        }
      }
    }
  })

  const workerConsumptions = new Map<
    string,
    { tier: 1 | 2 | 3 | 4; materialId: number; consumptionPerDay: number; costPerDay: number }
  >()
  let workerMaterialCosts = 0
  let adminCostPerDay = 0

  const registerWorkerConsumption = (
    tier: 1 | 2 | 3 | 4,
    materialId: number,
    amount: number,
    unitPrice: number,
  ) => {
    const key = `${tier}:${materialId}`
    const existing = workerConsumptions.get(key) ?? {
      tier,
      materialId,
      consumptionPerDay: 0,
      costPerDay: 0,
    }
    existing.consumptionPerDay += amount
    existing.costPerDay += amount * unitPrice
    workerConsumptions.set(key, existing)
  }

  workerTotals.forEach((count, tier) => {
    const worker = workerByType.get(tier)
    if (!worker || count <= 0) return

    const groups = count / 100
    worker.consumables.forEach((cons: Worker['consumables'][number]) => {
      const amount = cons.amount * groups
      if (amount <= 0) return
      const price = priceOf(materialById.get(cons.matId))
      registerWorkerConsumption(tier as 1 | 2 | 3 | 4, cons.matId, amount, price)
      addToMap(materialBalance, cons.matId, -amount)
      workerMaterialCosts += amount * price
    })

    if (worker.adminCost) {
      adminCostPerDay += worker.adminCost * groups
    }
  })

  const materials = Array.from(materialBalance.entries())
    .filter(([, amount]) => Math.abs(amount) > 1e-6)
    .map(([materialId, balancePerDay]) => ({
      materialId,
      balancePerDay,
      valuePerDay: balancePerDay * priceOf(materialById.get(materialId)),
    }))

  const workers = Array.from(workerConsumptions.values()).sort((a, b) => {
    if (a.tier === b.tier) return a.materialId - b.materialId
    return a.tier - b.tier
  })

  const totalCosts = materialCosts + workerMaterialCosts + adminCostPerDay
  const net = revenue - totalCosts

  return {
    summary: {
      costs: totalCosts,
      revenue,
      net,
    },
    materials,
    workers,
    recipes: recipeRows,
    adminCostPerDay,
  }
}

export type { RecipeProductionRow } from './types'
