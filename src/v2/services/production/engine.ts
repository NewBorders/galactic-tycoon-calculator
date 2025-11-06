import type { Building, GameData, Material, Planet, Recipe, Worker } from '../gamedata/types'
import {
  type BaseProductionContext,
  type BaseReport,
  type RecipeProductionRow,
} from './types'

const MINUTES_PER_DAY = 60 * 24
const WORKER_BASE_PRODUCTIVITY = 70
const WORKER_OPTIONAL_BONUS = 10

const TIER_CONFIG: Array<{ tier: 1 | 2 | 3 | 4; key: 'worker' | 'technician' | 'engineer' | 'scientist' }> = [
  { tier: 1, key: 'worker' },
  { tier: 2, key: 'technician' },
  { tier: 3, key: 'engineer' },
  { tier: 4, key: 'scientist' },
]

function priceOf(material: Material | undefined): number {
  if (!material) return 0
  const cents = material.calculatedPriceInCents ?? 0
  return cents / 100
}

function clampPositiveInt(value: number | undefined, fallback = 0): number {
  if (!value || Number.isNaN(value)) return fallback
  return Math.max(fallback, Math.floor(value))
}

function addToMap(map: Map<number, number>, key: number, value: number) {
  const prev = map.get(key) ?? 0
  map.set(key, prev + value)
}

function allocateShare(
  availableByBuilding: Map<number, number>,
  usedByBuilding: Map<number, number>,
  recipe: Recipe,
  requested: number,
): { effective: number; overCapacity: boolean; capacity: number } {
  const buildingId = recipe.producedInId
  const maxShare = availableByBuilding.get(buildingId) ?? 0
  if (maxShare <= 0) {
    return { effective: 0, overCapacity: requested > 0, capacity: 0 }
  }
  const alreadyUsed = usedByBuilding.get(buildingId) ?? 0
  const remaining = Math.max(0, maxShare - alreadyUsed)
  const effective = Math.min(requested, remaining)
  const overCapacity = requested > remaining
  usedByBuilding.set(buildingId, alreadyUsed + effective)
  return { effective, overCapacity, capacity: maxShare }
}

function abundanceMultiplier(planet: Planet | undefined, materialId: number): number {
  if (!planet) return 1
  const entry = planet.materials.find((mat) => mat.id === materialId)
  if (!entry) return 1
  if (!entry.abundanceRating) return 0
  return entry.abundanceRating / 100
}

type WorkforceDemand = Map<number, number>

type InterimRow = {
  recipe: Recipe
  requestedShare: number
  effectiveShare: number
  capacityShare: number
  overCapacity: boolean
  perUnitCycles: number
  outputPerDay: number
  inputsPerDay: Array<{ materialId: number; amount: number }>
  workforceDemand: WorkforceDemand
  productivityFactor: number
  abundanceFactor: number
}

export function computeBaseReport(gd: GameData, ctx: BaseProductionContext): BaseReport {
  const { assignment, options } = ctx

  const materialById = new Map<number, Material>(gd.materials.map((m) => [m.id, m]))
  const recipeById = new Map<number, Recipe>(gd.recipes.map((r) => [r.id, r]))
  const buildingById = new Map<number, Building>(gd.buildings.map((b) => [b.id, b]))
  const workerByType = new Map<number, Worker>(gd.workers.map((w) => [w.type, w]))
  const planet = gd.planets.find((pl) => pl.id === assignment.planetId)

  const activeOptional = options?.activeOptionalConsumables ?? new Set<number>()

  const housingByTier = new Map<number, number>()
  const availableShare = new Map<number, number>()
  assignment.buildings.forEach((instance) => {
    const level = clampPositiveInt(instance.level, 1)
    const count = clampPositiveInt(instance.count, 1)
    const totalUnits = level * count
    addToMap(availableShare, instance.buildingId, totalUnits * 100)
    const building = buildingById.get(instance.buildingId)
    if (building?.workersHousing) {
      TIER_CONFIG.forEach(({ tier, key }) => {
        const capacity = building.workersHousing?.[key] ?? 0
        if (capacity > 0) {
          addToMap(housingByTier, tier, capacity * totalUnits)
        }
      })
    }
  })

  const productivityByTier = new Map<number, number>()
  TIER_CONFIG.forEach(({ tier }) => {
    const worker = workerByType.get(tier)
    if (!worker) {
      productivityByTier.set(tier, 100)
      return
    }
    const optionalActiveCount = worker.consumables.filter(
      (consumable) => !consumable.essential && activeOptional.has(consumable.matId),
    ).length
    const productivity = WORKER_BASE_PRODUCTIVITY + optionalActiveCount * WORKER_OPTIONAL_BONUS
    productivityByTier.set(tier, Math.min(150, Math.max(10, productivity)))
  })

  const usedShare = new Map<number, number>()
  const materialBalance = new Map<number, number>()
  const interimRows: InterimRow[] = []
  const workforceDemandTotals = new Map<number, number>()

  let materialCosts = 0
  let revenue = 0

  assignment.recipes.forEach((selection) => {
    const recipe = recipeById.get(selection.recipeId)
    if (!recipe) return

    const requested = Math.max(0, Number(selection.share) || 0)
    const { effective, overCapacity, capacity } = allocateShare(
      availableShare,
      usedShare,
      recipe,
      requested,
    )

    const perUnitCycles = recipe.timeMinutes > 0 ? MINUTES_PER_DAY / recipe.timeMinutes : 0
    const shareUnits = effective / 100
    const building = buildingById.get(recipe.producedInId)

    const tiersUsed = building
      ? TIER_CONFIG.filter(({ key }) => (building.workersNeeded?.[key] ?? 0) > 0).map(
          ({ tier }) => tier,
        )
      : []
    const avgProductivity =
      tiersUsed.length > 0
        ? tiersUsed.reduce(
            (acc, tier) => acc + (productivityByTier.get(tier) ?? 100),
            0,
          ) / tiersUsed.length
        : 100
    const productivityFactor = avgProductivity / 100
    const abundanceFactor = abundanceMultiplier(planet, recipe.output.id)

    const totalCycles = perUnitCycles * shareUnits * productivityFactor * abundanceFactor
    const outputPerDay = totalCycles * recipe.output.amount
    const inputsPerDay = recipe.inputs.map((input) => ({
      materialId: input.id,
      amount: totalCycles * input.amount,
    }))

    const workforceDemand: WorkforceDemand = new Map()
    if (building?.workersNeeded) {
      TIER_CONFIG.forEach(({ tier, key }) => {
        const perUnit = building.workersNeeded?.[key] ?? 0
        if (perUnit > 0 && shareUnits > 0) {
          const required = perUnit * shareUnits
          addToMap(workforceDemand, tier, required)
          addToMap(workforceDemandTotals, tier, required)
        }
      })
    }

    interimRows.push({
      recipe,
      requestedShare: requested,
      effectiveShare: effective,
      capacityShare: capacity,
      overCapacity,
      perUnitCycles,
      outputPerDay,
      inputsPerDay,
      workforceDemand,
      productivityFactor,
      abundanceFactor,
    })
  })

  const coverageByTier = new Map<number, number>()
  const workforceSummary = TIER_CONFIG.map(({ tier }) => {
    const required = workforceDemandTotals.get(tier) ?? 0
    const housing = housingByTier.get(tier) ?? 0
    const coverage = required <= 0 ? 1 : Math.min(1, housing / required)
    coverageByTier.set(tier, coverage)
    return {
      tier,
      required,
      housing,
      coverage,
    }
  })

  const recipeRows: RecipeProductionRow[] = []
  const actualWorkersByTier = new Map<number, number>()

  interimRows.forEach((raw) => {
    const tiersUsed = Array.from(raw.workforceDemand.keys())
    const workforceFactor =
      tiersUsed.length > 0
        ? Math.min(...tiersUsed.map((tier) => coverageByTier.get(tier) ?? 1))
        : 1
    const adjustedOutput = raw.outputPerDay * workforceFactor
    const adjustedInputs = raw.inputsPerDay.map((input) => ({
      materialId: input.materialId,
      amount: input.amount * workforceFactor,
    }))

    const workforce = tiersUsed.map((tier) => {
      const required = raw.workforceDemand.get(tier) ?? 0
      const assigned = required * workforceFactor
      if (assigned > 0) addToMap(actualWorkersByTier, tier, assigned)
      return { tier: tier as 1 | 2 | 3 | 4, required, assigned }
    })

    const row: RecipeProductionRow = {
      recipeId: raw.recipe.id,
      buildingId: raw.recipe.producedInId,
      requestedShare: raw.requestedShare,
      effectiveShare: raw.effectiveShare * workforceFactor,
      capacityShare: raw.capacityShare,
      timeMinutes: raw.recipe.timeMinutes,
      cyclesPerDayPerLine: raw.perUnitCycles,
      outputMaterialId: raw.recipe.output.id,
      outputAmountPerCycle: raw.recipe.output.amount,
      outputPerDay: adjustedOutput,
      inputsPerDay: adjustedInputs,
      overCapacity: raw.overCapacity || workforceFactor < 0.999,
      workforce,
      abundanceFactor: raw.abundanceFactor,
      productivityFactor: raw.productivityFactor,
    }
    recipeRows.push(row)

    if (adjustedOutput > 0) {
      addToMap(materialBalance, raw.recipe.output.id, adjustedOutput)
      const price = priceOf(materialById.get(raw.recipe.output.id))
      revenue += adjustedOutput * price
    }
    adjustedInputs.forEach((inp) => {
      if (inp.amount <= 0) return
      addToMap(materialBalance, inp.materialId, -inp.amount)
      const price = priceOf(materialById.get(inp.materialId))
      materialCosts += inp.amount * price
    })
  })

  const workerConsumptions = new Map<string, {
    tier: 1 | 2 | 3 | 4
    materialId: number
    consumptionPerDay: number
    costPerDay: number
    optional: boolean
    active: boolean
  }>()

  let workerMaterialCosts = 0
  let adminCostPerDay = 0

  const registerWorkerConsumption = (
    tier: 1 | 2 | 3 | 4,
    materialId: number,
    optional: boolean,
    active: boolean,
    amount: number,
    unitPrice: number,
  ) => {
    const key = `${tier}:${materialId}`
    const existing = workerConsumptions.get(key) ?? {
      tier,
      materialId,
      consumptionPerDay: 0,
      costPerDay: 0,
      optional,
      active,
    }
    existing.optional = optional
    existing.active = active
    existing.consumptionPerDay += amount
    if (amount > 0) {
      existing.costPerDay += amount * unitPrice
    }
    workerConsumptions.set(key, existing)
  }

  actualWorkersByTier.forEach((count, tier) => {
    const worker = workerByType.get(tier)
    if (!worker || count <= 0) return

    const groups = count / 100
    worker.consumables.forEach((consumable) => {
      const baseAmount = consumable.amount * groups
      if (baseAmount < 0) return
      const optional = !consumable.essential
      const active = !optional || activeOptional.has(consumable.matId)
      const consumed = active ? baseAmount : 0
      const price = priceOf(materialById.get(consumable.matId))
      registerWorkerConsumption(tier as 1 | 2 | 3 | 4, consumable.matId, optional, active, consumed, price)
      if (consumed > 0) {
        addToMap(materialBalance, consumable.matId, -consumed)
        workerMaterialCosts += consumed * price
      }
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
    workforceSummary,
  }
}

export type { RecipeProductionRow } from './types'
