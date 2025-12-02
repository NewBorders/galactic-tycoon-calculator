import { computed, toValue, type MaybeRef } from 'vue'
import type { GameData, GdIndex } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import { computeBaseReport } from '@/v2/services/production/engine'

export type ExportMaterial = {
  materialId: number
  productionPerDay: number
  consumptionPerDay: number
  exportPerDay: number
  exportRatio: number // percentage exported (0-100)
  valuePerDay: number
}

export type BaseSummaryData = {
  baseId: string
  baseName: string
  planetId: number
  materialsRunningOut: Array<{
    materialId: number
    daysUntilEmpty: number
    currentStock: number
    consumptionPerDay: number
  }>
  exportMaterials: ExportMaterial[]
  workforceCoverage: number // minimum coverage across all tiers
  workforceDeficit: number // total workers needed but not housed
  workforceDeficitCost: number // cost of deficit in $/day
}

export type GlobalMaterialSummary = {
  materialId: number
  totalProduction: number
  totalConsumption: number
  netBalance: number
  totalValue: number // dollar value of net balance
  perBaseBreakdown: Array<{
    baseId: string
    baseName: string
    production: number
    consumption: number
    productionValue: number
    consumptionValue: number
  }>
}

export type GlobalSummaryData = {
  totalNetProfit: number
  totalWorkforceDeficitCost: number
  totalConsumptionOverheadCost: number
  bases: BaseSummaryData[]
  materials: GlobalMaterialSummary[]
}

export function useGlobalSummary(
  bases: MaybeRef<PlayerBase[]>,
  gameData: MaybeRef<GameData>,
  index: MaybeRef<GdIndex>,
  priceResolver: MaybeRef<(materialId: number) => number>,
  technologyLevels: MaybeRef<Partial<Record<number, number>>>,
  startingBonus: MaybeRef<number>,
  timeframeHours: MaybeRef<number>,
  globalWorkforceBurden: MaybeRef<number>,
  exportThreshold: MaybeRef<number>, // percentage threshold (0-100) to consider material as export
) {
  const periodFactor = computed(() => {
    const hours = Number(toValue(timeframeHours))
    if (!Number.isFinite(hours)) return 1
    const clamped = Math.min(336, Math.max(1, Math.round(hours)))
    return clamped / 24
  })

  const exportThresholdDecimal = computed(() => {
    const threshold = Number(toValue(exportThreshold))
    if (!Number.isFinite(threshold)) return 0.5
    return Math.min(100, Math.max(0, threshold)) / 100
  })

  const technologyLevelsOption = computed(() => {
    const obj: Record<number, number> = {}
    Object.entries(toValue(technologyLevels) ?? {}).forEach(([key, value]) => {
      const spec = Number(key)
      const level = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(spec) || Number.isNaN(level)) return
      obj[spec] = Math.max(0, Math.floor(level))
    })
    return obj
  })

  const baseReports = computed(() => {
    return toValue(bases).map((base) => {
      const assignment = {
        planetId: base.planetId,
        buildings: base.buildings.map((b) => ({
          buildingId: b.buildingId,
          level: b.level,
        })),
        recipes: base.recipes.map((r) => ({
          recipeId: r.recipeId,
          count: typeof r.count === 'number' && Number.isFinite(r.count) ? Math.max(1, Math.floor(r.count)) : 1,
        })),
      }

      const activeOptionalConsumables = new Set(
        (base.optionalConsumables ?? []).filter((id): id is number => typeof id === 'number'),
      )

      const report = computeBaseReport(toValue(gameData), {
        assignment,
        horizonDays: 1,
        options: {
          activeOptionalConsumables,
          priceResolver: toValue(priceResolver),
          technologyLevels: technologyLevelsOption.value,
          startingBonus: toValue(startingBonus),
          globalWorkforceBurden: toValue(globalWorkforceBurden),
        },
      })

      return { base, report }
    })
  })

  // Calculate consumption overhead: difference between current net (with expansion overhead)
  // vs net with 0% expansion overhead
  const baseReportsWithoutOverhead = computed(() => {
    // Only calculate if we have expansion overhead (> 2000 workers)
    if (toValue(globalWorkforceBurden) <= 2000) return []

    return toValue(bases).map((base) => {
      const assignment = {
        planetId: base.planetId,
        buildings: base.buildings.map((b) => ({
          buildingId: b.buildingId,
          level: b.level,
        })),
        recipes: base.recipes.map((r) => ({
          recipeId: r.recipeId,
          count: typeof r.count === 'number' && Number.isFinite(r.count) ? Math.max(1, Math.floor(r.count)) : 1,
        })),
      }

      const activeOptionalConsumables = new Set(
        (base.optionalConsumables ?? []).filter((id): id is number => typeof id === 'number'),
      )

      // Calculate with globalWorkforceBurden set to 2000 (threshold, no overhead)
      const report = computeBaseReport(toValue(gameData), {
        assignment,
        horizonDays: 1,
        options: {
          activeOptionalConsumables,
          priceResolver: toValue(priceResolver),
          technologyLevels: technologyLevelsOption.value,
          startingBonus: toValue(startingBonus),
          globalWorkforceBurden: 2000,
        },
      })

      return { base, report }
    })
  })

  const baseSummaries = computed((): BaseSummaryData[] => {
    return baseReports.value.map(({ base, report }) => {
      // Calculate workforce deficit
      let totalDeficit = 0
      let minCoverage = 100
      report.workforceSummary.forEach((wf) => {
        const deficit = Math.max(0, wf.required - wf.housing)
        totalDeficit += deficit
        minCoverage = Math.min(minCoverage, wf.coverage)
      })

      // Estimate deficit cost (assuming workers consume on average)
      const workerDeficitCost = report.summary.workerPurchaseCosts * (totalDeficit / (totalDeficit + 1))

      // Find materials that will run out of stock within the configured timeframe
      const materialsRunningOut: BaseSummaryData['materialsRunningOut'] = []
      const stock = base.stock ?? {}
      const timeframeDays = periodFactor.value

      report.materials.forEach((material) => {
        if (material.balancePerDay >= 0) return // producing or balanced
        const currentStock = stock[material.materialId] ?? 0
        if (currentStock <= 0) return // already empty
        const consumptionPerDay = Math.abs(material.balancePerDay)
        const daysUntilEmpty = currentStock / consumptionPerDay

        // Warn if material will run out within the configured timeframe
        if (daysUntilEmpty <= timeframeDays) {
          materialsRunningOut.push({
            materialId: material.materialId,
            daysUntilEmpty,
            currentStock,
            consumptionPerDay,
          })
        }
      })
      materialsRunningOut.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty)

      // Find export materials: materials where less than threshold% is consumed locally
      const exportMaterials: ExportMaterial[] = []

      // Build production and consumption maps from recipes and workers
      const productionMap = new Map<number, number>()
      const consumptionMap = new Map<number, number>()

      // Get production from recipe outputs
      report.recipes.forEach((recipe) => {
        const current = productionMap.get(recipe.outputMaterialId) || 0
        productionMap.set(recipe.outputMaterialId, current + recipe.outputPerDay)
      })

      // Get consumption from recipe inputs
      report.recipes.forEach((recipe) => {
        recipe.inputsPerDay.forEach((input) => {
          const current = consumptionMap.get(input.materialId) || 0
          consumptionMap.set(input.materialId, current + input.amount)
        })
      })

      // Add worker consumption
      report.workers.forEach((worker) => {
        const current = consumptionMap.get(worker.materialId) || 0
        consumptionMap.set(worker.materialId, current + worker.consumptionPerDay)
      })

      // Calculate export materials
      productionMap.forEach((production, materialId) => {
        const consumption = consumptionMap.get(materialId) || 0

        if (production > 0) {
          const localConsumptionRatio = consumption / production
          const exportRatio = 1 - localConsumptionRatio

          // Material is exported if less than threshold is consumed locally
          // exportRatio > threshold means: (1 - consumption/production) > threshold
          // which means: consumption/production < (1 - threshold)
          if (localConsumptionRatio < (1 - exportThresholdDecimal.value)) {
            const exportAmount = production - consumption
            const resolver = toValue(priceResolver)
            exportMaterials.push({
              materialId,
              productionPerDay: production * periodFactor.value,
              consumptionPerDay: consumption * periodFactor.value,
              exportPerDay: exportAmount * periodFactor.value,
              exportRatio: exportRatio * 100, // as percentage
              valuePerDay: exportAmount * resolver(materialId) * periodFactor.value,
            })
          }
        }
      })
      exportMaterials.sort((a, b) => b.valuePerDay - a.valuePerDay)

      return {
        baseId: base.id,
        baseName: base.name || `Base ${base.id}`,
        planetId: base.planetId,
        materialsRunningOut,
        exportMaterials,
        workforceCoverage: minCoverage,
        workforceDeficit: totalDeficit,
        workforceDeficitCost: workerDeficitCost * periodFactor.value,
      }
    })
  })

  const totalNetProfit = computed(() => {
    return baseReports.value.reduce((sum, { report }) => sum + report.summary.net * periodFactor.value, 0)
  })

  const totalWorkforceDeficitCost = computed(() => {
    return baseSummaries.value.reduce((sum, base) => sum + base.workforceDeficitCost, 0)
  })

  const totalExportNetProfit = computed(() => {
    return baseSummaries.value.reduce((sum, base) => {
      return sum + base.exportMaterials.reduce((exportSum, material) => exportSum + material.valuePerDay, 0)
    }, 0)
  })

  // Calculate consumption overhead cost: difference between actual net and net without overhead
  const totalConsumptionOverheadCost = computed(() => {
    if (toValue(globalWorkforceBurden) <= 2000) return 0

    const actualNet = baseReports.value.reduce((sum, { report }) => sum + report.summary.net, 0)
    const netWithoutOverhead = baseReportsWithoutOverhead.value.reduce((sum, { report }) => sum + report.summary.net, 0)

    // Overhead cost is the difference (should be negative, meaning we pay more)
    const overheadCost = netWithoutOverhead - actualNet

    return overheadCost * periodFactor.value
  })

  // Global material summary with per-base breakdown
  const globalMaterials = computed((): GlobalMaterialSummary[] => {
    const materialMap = new Map<number, GlobalMaterialSummary>()

    baseReports.value.forEach(({ base, report }) => {
      // Build production and consumption maps from recipes and workers for this base
      const productionMap = new Map<number, number>()
      const consumptionMap = new Map<number, number>()

      // Get production from recipe outputs
      report.recipes.forEach((recipe) => {
        const current = productionMap.get(recipe.outputMaterialId) || 0
        productionMap.set(recipe.outputMaterialId, current + recipe.outputPerDay)
      })

      // Get consumption from recipe inputs
      report.recipes.forEach((recipe) => {
        recipe.inputsPerDay.forEach((input) => {
          const current = consumptionMap.get(input.materialId) || 0
          consumptionMap.set(input.materialId, current + input.amount)
        })
      })

      // Add worker consumption
      report.workers.forEach((worker) => {
        const current = consumptionMap.get(worker.materialId) || 0
        consumptionMap.set(worker.materialId, current + worker.consumptionPerDay)
      })

      // Process all materials that have either production or consumption
      const allMaterialIds = new Set([...productionMap.keys(), ...consumptionMap.keys()])

      allMaterialIds.forEach((materialId) => {
        const production = productionMap.get(materialId) || 0
        const consumption = consumptionMap.get(materialId) || 0

        // Skip if neither production nor consumption
        if (production === 0 && consumption === 0) return

        let summary = materialMap.get(materialId)
        if (!summary) {
          summary = {
            materialId,
            totalProduction: 0,
            totalConsumption: 0,
            netBalance: 0,
            totalValue: 0,
            perBaseBreakdown: [],
          }
          materialMap.set(materialId, summary)
        }

        const resolver = toValue(priceResolver)
        const price = resolver(materialId)
        const netBalance = production - consumption

        summary.totalProduction += production
        summary.totalConsumption += consumption
        summary.netBalance += netBalance
        summary.totalValue += netBalance * price

        summary.perBaseBreakdown.push({
          baseId: base.id,
          baseName: base.name || `Base ${base.id}`,
          production: production * periodFactor.value,
          consumption: consumption * periodFactor.value,
          productionValue: production * price * periodFactor.value,
          consumptionValue: consumption * price * periodFactor.value,
        })
      })
    })

    const result = Array.from(materialMap.values())
      .filter((m) => Math.abs(m.netBalance) > 0.01) // filter out negligible amounts
      .map((m) => ({
        ...m,
        totalProduction: m.totalProduction * periodFactor.value,
        totalConsumption: m.totalConsumption * periodFactor.value,
        netBalance: m.netBalance * periodFactor.value,
        totalValue: m.totalValue * periodFactor.value,
      }))
      .sort((a, b) => Math.abs(b.totalValue) - Math.abs(a.totalValue)) // sort by dollar value

    return result
  })

  return {
    baseSummaries,
    totalNetProfit,
    totalExportNetProfit,
    totalWorkforceDeficitCost,
    totalConsumptionOverheadCost,
    globalMaterials,
  }
}
