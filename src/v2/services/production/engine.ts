import type { Building, GameData, Material, Recipe, Worker } from '../gamedata/types'
import { evaluateRecipeAvailability } from './availability'
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

function clampPositiveInt(value: number | undefined, fallback = 0): number {
  if (!value || Number.isNaN(value)) return fallback
  return Math.max(fallback, Math.floor(value))
}

function productionUnitsFromLevel(level: number): number {
  if (level <= 0 || Number.isNaN(level)) return 0
  return level
}

function addToMap(map: Map<number, number>, key: number, value: number) {
  const prev = map.get(key) ?? 0
  map.set(key, prev + value)
}

type WorkforceDemand = Map<number, number>

type WorkerConsumptionEntry = {
  tier: 1 | 2 | 3 | 4
  materialId: number
  consumptionPerDay: number
  costPerDay: number
  unitPrice: number
  optional: boolean
  active: boolean
}

type InterimRow = {
  recipe: Recipe
  buildingId: number
  buildingUnits: number
  queueShare: number
  nominalCyclesPerDayPerUnit: number
  adjustedTimeMinutes: number
  rawRunsPerDay: number
  rawOutputPerDay: number
  rawInputsPerDay: Array<{ materialId: number; amount: number }>
  workforceDemand: WorkforceDemand
  productivityFactor: number
  abundanceFactor: number
  blockedReason: 'abundance' | 'fertility' | 'technology' | null
  requiresFertility: boolean
}

export function computeBaseReport(gd: GameData, ctx: BaseProductionContext): BaseReport {
  const { assignment, options } = ctx

  const materialById = new Map<number, Material>(gd.materials.map((m) => [m.id, m]))
  const recipeById = new Map<number, Recipe>(gd.recipes.map((r) => [r.id, r]))
  const buildingById = new Map<number, Building>(gd.buildings.map((b) => [b.id, b]))
  const workerByType = new Map<number, Worker>(gd.workers.map((w) => [w.type, w]))
  const planet = gd.planets.find((pl) => pl.id === assignment.planetId)

  const activeOptional = options?.activeOptionalConsumables ?? new Set<number>()
  const priceResolver = options?.priceResolver

  const fallbackPrice = (material: Material | undefined): number => {
    if (!material) return 0
    const cents = material.calculatedPriceInCents ?? 0
    return cents / 100
  }

  const priceOf = (materialId: number): number => {
    const resolved = priceResolver?.(materialId)
    if (resolved != null && Number.isFinite(resolved) && resolved >= 0) {
      return resolved
    }
    return fallbackPrice(materialById.get(materialId))
  }

  const housingByTier = new Map<number, number>()
  const productionUnitsById = new Map<number, number>()
  const workforceUnitsById = new Map<number, number>()
  assignment.buildings.forEach((instance) => {
    const level = clampPositiveInt(instance.level, 1)
    const count = clampPositiveInt(instance.count, 1)
    const workforceUnits = level * count
    addToMap(workforceUnitsById, instance.buildingId, workforceUnits)
    const productionUnits = productionUnitsFromLevel(level) * count
    addToMap(productionUnitsById, instance.buildingId, productionUnits)
    const building = buildingById.get(instance.buildingId)
    if (building?.workersHousing) {
      TIER_CONFIG.forEach(({ tier, key }) => {
        const capacity = building.workersHousing?.[key] ?? 0
        if (capacity > 0) {
          addToMap(housingByTier, tier, capacity * workforceUnits)
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

  const materialBalance = new Map<number, number>()
  const materialStats = new Map<number, { produced: number; recipe: number; worker: number }>()
  const statsFor = (materialId: number) => {
    let stats = materialStats.get(materialId)
    if (!stats) {
      stats = { produced: 0, recipe: 0, worker: 0 }
      materialStats.set(materialId, stats)
    }
    return stats
  }
  const interimRows: InterimRow[] = []
  const workforceDemandTotals = new Map<number, number>()


  const startingBonusRaw = options?.startingBonus
  const startingBonus =
    typeof startingBonusRaw === 'number' && Number.isFinite(startingBonusRaw)
      ? Math.max(0.1, startingBonusRaw)
      : 1
  const technologyLevels = options?.technologyLevels ?? {}

  const buildingGroups = new Map<
    number,
    {
      building: Building
      productionUnits: number
      workforceUnits: number
      recipes: Recipe[]
      technologyBonus: number
      technologyLevel: number
    }
  >()

  assignment.recipes.forEach((selection) => {
    const recipe = recipeById.get(selection.recipeId)
    if (!recipe) return
    const building = buildingById.get(recipe.producedInId)
    if (!building) return
    const productionUnits = productionUnitsById.get(recipe.producedInId) ?? 0
    if (productionUnits <= 0) return
    const workforceUnits = workforceUnitsById.get(recipe.producedInId) ?? 0
    const countRaw = (selection as Record<string, unknown>).count
    const count = typeof countRaw === 'number' && Number.isFinite(countRaw) ? Math.max(1, Math.floor(countRaw)) : 1
    const group = buildingGroups.get(recipe.producedInId)
    if (group) {
      for (let i = 0; i < count; i++) group.recipes.push(recipe)
    } else {
      const techLevelRaw = technologyLevels[building.specialization] ?? 0
      const techLevel = typeof techLevelRaw === 'number' ? Math.max(0, Math.floor(techLevelRaw)) : 0
      const technologyBonus = 1 + techLevel * 0.05
      const recipesArr: Recipe[] = []
      for (let i = 0; i < count; i++) recipesArr.push(recipe)
      buildingGroups.set(recipe.producedInId, {
        building,
        productionUnits,
        workforceUnits,
        recipes: recipesArr,
        technologyBonus,
        technologyLevel: techLevel,
      })
    }
  })

  buildingGroups.forEach(
    ({ building, productionUnits, workforceUnits, recipes, technologyBonus, technologyLevel }) => {
    if (!recipes.length || productionUnits <= 0) return

    const tiersUsed = TIER_CONFIG.filter(({ key }) => (building.workersNeeded?.[key] ?? 0) > 0).map(
      ({ tier }) => tier,
    )
    const avgProductivity =
      tiersUsed.length > 0
        ? tiersUsed.reduce((acc, tier) => acc + (productivityByTier.get(tier) ?? 100), 0) /
          tiersUsed.length
        : 100
    const productivityFactor = avgProductivity / 100

    type Pending = {
      recipe: Recipe
      abundanceFactor: number
      blocked: boolean
      blockedReason: 'abundance' | 'fertility' | 'technology' | null
      requiresFertility: boolean
      adjustedTime: number
    }

    const pending: Pending[] = []
    let totalCycleTime = 0

    recipes.forEach((recipe) => {
      const material = materialById.get(recipe.output.id)
      const availability = evaluateRecipeAvailability({
        planet,
        building,
        material,
      })
      const requiresFertility = availability.requiresFertility
      const abundanceFactor = availability.abundanceFactor
      const requiredTech = recipe.reqTech ?? 0
      const technologySatisfied = technologyLevel >= requiredTech
      let blockedReason: Pending['blockedReason'] = null
      if (!technologySatisfied) {
        blockedReason = 'technology'
      } else if (availability.blocked) {
        blockedReason = availability.reason
      }
      const blocked = blockedReason !== null
      const workforceSatisfaction = Math.max(productivityFactor, 0)
      const buildingProductivity = 1
      const baseSpeed =
        workforceSatisfaction * buildingProductivity * technologyBonus * startingBonus
      const speedWithAbundance = blocked ? 0 : baseSpeed * abundanceFactor
      const adjustedTime = speedWithAbundance > 0 ? recipe.timeMinutes / speedWithAbundance : Infinity
      const timeContribution = !blocked ? adjustedTime : 0
      if (timeContribution > 0 && Number.isFinite(timeContribution)) {
        totalCycleTime += timeContribution
      }
      pending.push({
        recipe,
        abundanceFactor,
        blocked,
        blockedReason,
        adjustedTime,
        requiresFertility,
      })
    })

    const nominalCyclesPerDayPerUnit = totalCycleTime > 0 ? MINUTES_PER_DAY / totalCycleTime : 0
    const totalCyclesPerDay = nominalCyclesPerDayPerUnit * productionUnits

    pending.forEach(({ recipe, abundanceFactor, blocked, blockedReason, adjustedTime, requiresFertility }) => {
      const timeContribution = !blocked && Number.isFinite(adjustedTime) ? adjustedTime : 0
      const queueShare = totalCycleTime > 0 ? timeContribution / totalCycleTime : 0
      const rawRunsPerDay = blocked || totalCyclesPerDay <= 0 ? 0 : totalCyclesPerDay
      const rawOutputPerDay = rawRunsPerDay * recipe.output.amount
      const rawInputsPerDay = recipe.inputs.map((input) => ({
        materialId: input.id,
        amount: rawRunsPerDay * input.amount,
      }))

      const workforceDemand: WorkforceDemand = new Map()
      if (building.workersNeeded) {
        TIER_CONFIG.forEach(({ tier, key }) => {
          const perUnit = building.workersNeeded?.[key] ?? 0
          if (perUnit > 0 && queueShare > 0) {
            const required = perUnit * workforceUnits * queueShare
            addToMap(workforceDemand, tier, required)
            addToMap(workforceDemandTotals, tier, required)
          }
        })
      }

      interimRows.push({
        recipe,
        buildingId: building.id,
        buildingUnits: productionUnits,
        queueShare,
        nominalCyclesPerDayPerUnit,
        adjustedTimeMinutes: Number.isFinite(adjustedTime) ? adjustedTime : Infinity,
        rawRunsPerDay,
        rawOutputPerDay,
        rawInputsPerDay,
        workforceDemand,
        productivityFactor,
        abundanceFactor,
        blockedReason,
        requiresFertility,
      })
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

  // Aggregate interim rows by recipe id so multiple identical order-items are combined.
  // When a recipe appears N times (count=N), each interim row gets the same queue share and runs.
  // Aggregating them means: queueShare stays the same per instance, but rawRunsPerDay and rawOutputPerDay
  // are cumulative (N× the per-instance values).
  const aggregated = new Map<
    number,
    {
      recipe: Recipe
      buildingId: number
      buildingUnits: number
      nominalCyclesPerDayPerUnit: number
      adjustedTimeMinutes: number
      rawRunsPerDay: number
      rawOutputPerDay: number
      rawInputsById: Map<number, number>
      workforceDemand: WorkforceDemand
      productivityFactor: number
      abundanceFactor: number
      blockedReason: InterimRow['blockedReason']
      requiresFertility: boolean
      queueShare: number
      count: number
    }
  >()

  interimRows.forEach((raw) => {
    const id = raw.recipe.id
    const entry = aggregated.get(id)
    if (!entry) {
      const inputsMap = new Map<number, number>()
      raw.rawInputsPerDay.forEach((inp) => inputsMap.set(inp.materialId, inp.amount))
      const wf = new Map<number, number>()
      raw.workforceDemand.forEach((v, k) => wf.set(k, v))
      aggregated.set(id, {
        recipe: raw.recipe,
        buildingId: raw.buildingId,
        buildingUnits: raw.buildingUnits,
        nominalCyclesPerDayPerUnit: raw.nominalCyclesPerDayPerUnit,
        adjustedTimeMinutes: raw.adjustedTimeMinutes,
        rawRunsPerDay: raw.rawRunsPerDay,
        rawOutputPerDay: raw.rawOutputPerDay,
        rawInputsById: inputsMap,
        workforceDemand: wf,
        productivityFactor: raw.productivityFactor,
        abundanceFactor: raw.abundanceFactor,
        blockedReason: raw.blockedReason,
        requiresFertility: raw.requiresFertility,
        queueShare: raw.queueShare,
        count: 1,
      })
    } else {
      // accumulate sums: each duplicate instance contributes its runs and outputs
      entry.rawRunsPerDay += raw.rawRunsPerDay
      entry.rawOutputPerDay += raw.rawOutputPerDay
      raw.rawInputsPerDay.forEach((inp) =>
        entry.rawInputsById.set(inp.materialId, (entry.rawInputsById.get(inp.materialId) ?? 0) + inp.amount),
      )
      raw.workforceDemand.forEach((v, k) => addToMap(entry.workforceDemand, k, v))
      // Note: queueShare does NOT accumulate; it remains the same per instance.
      // The total queueShare contribution to the queue is: individual queueShare × count
      entry.count += 1
      // keep productivity/abundance/blocked/requiresFertility from the first occurrence (they should be identical)
    }
  })

  // Convert aggregated entries into recipe rows
  aggregated.forEach((raw) => {
    const tiersUsed = Array.from(raw.workforceDemand.keys())
    const workforceFactor =
      tiersUsed.length > 0
        ? Math.min(...tiersUsed.map((tier) => coverageByTier.get(tier) ?? 1))
        : 1

    const adjustedRuns = raw.rawRunsPerDay * workforceFactor
    const adjustedOutput = raw.rawOutputPerDay * workforceFactor

    const adjustedInputs = Array.from(raw.rawInputsById.entries()).map(([materialId, amount]) => ({
      materialId,
      amount: amount * workforceFactor,
    }))

    // cycles per unit should account for how many times the recipe appears in the queue
    const effectiveCyclesPerUnit = raw.nominalCyclesPerDayPerUnit * raw.count * workforceFactor
    const actualTimeMinutes =
      workforceFactor > 0 && Number.isFinite(raw.adjustedTimeMinutes)
        ? raw.adjustedTimeMinutes / workforceFactor
        : Number.isFinite(raw.adjustedTimeMinutes)
          ? raw.adjustedTimeMinutes
          : Infinity

    // When aggregating identical recipes (count > 1), recalculate queueShare
    // since each instance contributes its adjusted time to the total queue
    const finalQueueShare = raw.queueShare * raw.count

    const workforce = Array.from(raw.workforceDemand.keys()).map((tier) => {
      const required = raw.workforceDemand.get(tier) ?? 0
      const assigned = required * workforceFactor
      if (assigned > 0) addToMap(actualWorkersByTier, tier, assigned)
      return { tier: tier as 1 | 2 | 3 | 4, required, assigned }
    })

    const row: RecipeProductionRow = {
      recipeId: raw.recipe.id,
      buildingId: raw.buildingId,
      timeMinutes: raw.recipe.timeMinutes,
      buildingUnits: raw.buildingUnits,
      queueShare: finalQueueShare,
      adjustedTimeMinutes: raw.adjustedTimeMinutes,
      actualTimeMinutes,
      nominalCyclesPerDayPerUnit: raw.nominalCyclesPerDayPerUnit,
      cyclesPerDayPerUnit: effectiveCyclesPerUnit,
      runsPerDay: adjustedRuns,
      runsPerDayPerUnit: effectiveCyclesPerUnit,
      outputMaterialId: raw.recipe.output.id,
      outputAmountPerCycle: raw.recipe.output.amount,
      outputPerDay: adjustedOutput,
      inputsPerDay: adjustedInputs,
      workforce,
      abundanceFactor: raw.abundanceFactor,
      productivityFactor: raw.productivityFactor,
      workforceFactor,
      blockedByAbundance: raw.blockedReason === 'abundance',
      blockedReason: raw.blockedReason,
      requiresFertility: raw.requiresFertility,
    }
    recipeRows.push(row)

    if (adjustedOutput > 0) {
      addToMap(materialBalance, raw.recipe.output.id, adjustedOutput)
      statsFor(raw.recipe.output.id).produced += adjustedOutput
    }
    adjustedInputs.forEach((inp) => {
      if (inp.amount <= 0) return
      addToMap(materialBalance, inp.materialId, -inp.amount)
      statsFor(inp.materialId).recipe += inp.amount
    })
  })

  const workerConsumptions = new Map<string, WorkerConsumptionEntry>()

  const registerWorkerConsumption = (
    tier: 1 | 2 | 3 | 4,
    materialId: number,
    optional: boolean,
    active: boolean,
    amount: number,
    unitPrice: number,
  ) => {
    const key = `${tier}:${materialId}`
    const existing: WorkerConsumptionEntry = workerConsumptions.get(key) ?? {
      tier,
      materialId,
      consumptionPerDay: 0,
      costPerDay: 0,
      unitPrice,
      optional,
      active,
    }
    existing.optional = optional
    existing.active = active
    existing.unitPrice = unitPrice
    existing.consumptionPerDay += amount
    workerConsumptions.set(key, existing)
  }

  actualWorkersByTier.forEach((count, tier) => {
    const worker = workerByType.get(tier)
    if (!worker || count <= 0) return

    const groups = count / 100
    worker.consumables.forEach((consumable) => {
      const amountPerGroup = (consumable.amount ?? 0) / 10
      const baseAmount = amountPerGroup * groups
      if (baseAmount < 0) return
      const optional = !consumable.essential
      const active = !optional || activeOptional.has(consumable.matId)
      const consumed = active ? baseAmount : 0
      const price = priceOf(consumable.matId)
      registerWorkerConsumption(
        tier as 1 | 2 | 3 | 4,
        consumable.matId,
        optional,
        active,
        consumed,
        price,
      )
      if (consumed > 0) {
        addToMap(materialBalance, consumable.matId, -consumed)
        statsFor(consumable.matId).worker += consumed
      }
    })
  })

  const workerRowsByMaterial = new Map<number, WorkerConsumptionEntry[]>()
  workerConsumptions.forEach((row) => {
    row.costPerDay = 0
    const list = workerRowsByMaterial.get(row.materialId)
    if (list) {
      list.push(row)
    } else {
      workerRowsByMaterial.set(row.materialId, [row])
    }
  })

  const materialIds = new Set<number>([
    ...materialStats.keys(),
    ...materialBalance.keys(),
    ...Array.from(workerConsumptions.values(), (row) => row.materialId),
  ])

  let productionRevenue = 0
  let materialPurchaseCosts = 0
  let workerPurchaseCosts = 0

  materialIds.forEach((materialId) => {
    const stats = materialStats.get(materialId) ?? { produced: 0, recipe: 0, worker: 0 }
    const unitPrice = priceOf(materialId)
    const balance = materialBalance.get(materialId) ?? stats.produced - stats.recipe - stats.worker

    if (balance > 0) {
      productionRevenue += balance * unitPrice
    }

    const recipeShortfall = Math.max(0, stats.recipe - stats.produced)
    const leftoverForWorkers = Math.max(0, stats.produced - stats.recipe)
    const workerShortfall = Math.max(0, stats.worker - leftoverForWorkers)

    materialPurchaseCosts += recipeShortfall * unitPrice
    workerPurchaseCosts += workerShortfall * unitPrice

    const rows = workerRowsByMaterial.get(materialId)
    if (!rows || rows.length === 0) return
    const totalConsumption = rows.reduce((acc, row) => acc + row.consumptionPerDay, 0)
    rows.forEach((row) => {
      row.unitPrice = unitPrice
      if (workerShortfall <= 0 || totalConsumption <= 0) {
        row.costPerDay = 0
        return
      }
      const share = row.consumptionPerDay > 0 ? row.consumptionPerDay / totalConsumption : 0
      row.costPerDay = workerShortfall * share * unitPrice
    })
  })

  const materials = Array.from(materialBalance.entries())
    .filter(([, amount]) => Math.abs(amount) > 1e-6)
    .map(([materialId, balancePerDay]) => {
      const unitPrice = priceOf(materialId)
      return {
        materialId,
        balancePerDay,
        unitPrice,
        valuePerDay: balancePerDay * unitPrice,
      }
    })

  const workers = Array.from(workerConsumptions.values()).sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    if (a.optional !== b.optional) return a.optional ? 1 : -1
    return a.materialId - b.materialId
  })

  const net = productionRevenue - materialPurchaseCosts - workerPurchaseCosts

  return {
    summary: {
      productionRevenue,
      materialPurchaseCosts,
      workerPurchaseCosts,
      net,
    },
    materials,
    workers,
    recipes: recipeRows,
    workforceSummary,
  }
}

export type { RecipeProductionRow } from './types'
export { productionUnitsFromLevel }
