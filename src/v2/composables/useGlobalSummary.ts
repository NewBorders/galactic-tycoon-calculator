import { computed, toValue, type MaybeRef } from 'vue'
import type { GameData, GdIndex } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import { computeBaseReport } from '@/v2/services/production/engine'
import type { BaseReport } from '@/v2/services/production/types'
import {
  calculateWorkforceProductivity,
  type WorkforceProductivitySummary
} from '@/v2/services/production/workforceProductivity'
import type { MarketOpportunity } from '@/v2/services/marketAnalysis/types'

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
  // Current values (from API)
  current: {
    netProfit: number
    exportNetProfit: number
    exportPriceTrend7d: number
    workerCosts: number
    materialPurchases: number
    revenue: number
    workforceDeficitCost: number
  }
  // Planned values (user configuration)
  planned: {
    netProfit: number
    exportNetProfit: number
    exportPriceTrend7d: number
    workerCosts: number
    materialPurchases: number
    revenue: number
    workforceDeficitCost: number
  }
  // Shared data
  materialsRunningOut: Array<{
    materialId: number
    daysUntilEmpty: number
    currentStock: number
    consumptionPerDay: number
  }>
  exportMaterials: ExportMaterial[]
  workforceCoverage: number // minimum coverage across all tiers
  workforceDeficit: number // total workers needed but not housed
  workforceProductivity: WorkforceProductivitySummary
  // Legacy compatibility (planned values)
  netProfit: number
  exportNetProfit: number
  exportPriceTrend7d: number
  workforceDeficitCost: number
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
  current: {
    totalNetProfit: number
    totalExportNetProfit: number
    totalWorkforceDeficitCost: number
  }
  planned: {
    totalNetProfit: number
    totalExportNetProfit: number
    totalWorkforceDeficitCost: number
  }
  totalConsumptionOverheadCost: number
  bases: BaseSummaryData[]
  materials: GlobalMaterialSummary[]
  // Legacy compatibility (planned values)
  totalNetProfit: number
  totalWorkforceDeficitCost: number
}

export function useGlobalSummary(
  bases: MaybeRef<PlayerBase[]>,
  gameData: MaybeRef<GameData>,
  index: MaybeRef<GdIndex>,
  priceResolver: MaybeRef<((materialId: number) => number) | undefined>,
  technologyLevels: MaybeRef<Partial<Record<number, number>>>,
  startingBonus: MaybeRef<number>,
  timeframeHours: MaybeRef<number>,
  globalWorkforceBurden: MaybeRef<number>,
  exportThreshold: MaybeRef<number>, // percentage threshold (0-100) to consider material as export
  marketOpportunities?: MaybeRef<MarketOpportunity[] | undefined>, // optional market analysis data
) {
  const resolvedPriceResolver = computed((): ((materialId: number) => number) => {
    const resolver = toValue(priceResolver)
    if (typeof resolver === 'function') {
      return resolver
    }
    // Fallback: Use game data prices
    const gd = toValue(gameData)
    const materialMap = new Map(gd.materials.map(m => [m.id, m]))
    return (materialId: number): number => {
      const material = materialMap.get(materialId)
      if (!material) return 0
      const cents = material.calculatedPriceInCents ?? 0
      return cents / 100
    }
  })

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

  // Helper to compute report for a base with specific buildings/recipes configuration
  const computeReport = (base: PlayerBase, useCurrent: boolean) => {
    const assignment = {
      planetId: base.planetId,
      buildings: useCurrent
        ? (base.currentBuildings ?? []).map((b) => ({
            buildingId: b.buildingId,
            level: b.level,
          }))
        : base.buildings.map((b) => ({
            buildingId: b.buildingId,
            level: b.level,
          })),
      recipes: useCurrent
        ? base.recipes
            .filter((r) => r.currentCount !== undefined)
            .map((r) => ({
              recipeId: r.recipeId,
              count: typeof r.currentCount === 'number' && Number.isFinite(r.currentCount) ? Math.max(0, Math.floor(r.currentCount)) : 0,
            }))
        : base.recipes.map((r) => ({
            recipeId: r.recipeId,
            count: typeof r.count === 'number' && Number.isFinite(r.count) ? Math.max(0, Math.floor(r.count)) : 1,
          })),
    }

    const activeOptionalConsumables = new Set(
      (base.optionalConsumables ?? []).filter((id): id is number => typeof id === 'number'),
    )

    return computeBaseReport(toValue(gameData), {
      assignment,
      horizonDays: 1,
      options: {
        activeOptionalConsumables,
        priceResolver: resolvedPriceResolver.value,
        technologyLevels: technologyLevelsOption.value,
        startingBonus: toValue(startingBonus),
        globalWorkforceBurden: toValue(globalWorkforceBurden),
      },
    })
  }

  // Planned reports (user configuration)
  const baseReports = computed(() => {
    return toValue(bases).map((base) => {
      const report = computeReport(base, false)
      return { base, report }
    })
  })

  // Current reports (API data)
  const currentBaseReports = computed(() => {
    return toValue(bases).map((base) => {
      const report = computeReport(base, true)
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
          count: typeof r.count === 'number' && Number.isFinite(r.count) ? Math.max(0, Math.floor(r.count)) : 1,
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
          priceResolver: resolvedPriceResolver.value,
          technologyLevels: technologyLevelsOption.value,
          startingBonus: toValue(startingBonus),
          globalWorkforceBurden: 2000,
        },
      })

      return { base, report }
    })
  })

  // Helper to calculate metrics from a report
  const calculateMetrics = (base: PlayerBase, report: BaseReport) => {
    // Calculate workforce deficit
    let totalDeficit = 0
    let minCoverage = 100
    report.workforceSummary.forEach((wf: { tier: 1 | 2 | 3 | 4; required: number; housing: number; coverage: number }) => {
      const deficit = Math.max(0, wf.required - wf.housing)
      totalDeficit += deficit
      minCoverage = Math.min(minCoverage, wf.coverage)
    })

    // Estimate deficit cost (assuming workers consume on average)
    const workerDeficitCost = report.summary.workerPurchaseCosts * (totalDeficit / (totalDeficit + 1))

    // Calculate export materials
    const exportMaterials: ExportMaterial[] = []

    // Build production and consumption maps from recipes and workers
    const productionMap = new Map<number, number>()
    const consumptionMap = new Map<number, number>()

    // Get production from recipe outputs
    report.recipes.forEach((recipe: { outputMaterialId: number; outputPerDay: number }) => {
      const current = productionMap.get(recipe.outputMaterialId) || 0
      productionMap.set(recipe.outputMaterialId, current + recipe.outputPerDay)
    })

    // Get consumption from recipe inputs
    report.recipes.forEach((recipe: { inputsPerDay: Array<{ materialId: number; amount: number }> }) => {
      recipe.inputsPerDay.forEach((input: { materialId: number; amount: number }) => {
        const current = consumptionMap.get(input.materialId) || 0
        consumptionMap.set(input.materialId, current + input.amount)
      })
    })

    // Add worker consumption
    report.workers.forEach((worker: { materialId: number; consumptionPerDay: number }) => {
      const current = consumptionMap.get(worker.materialId) || 0
      consumptionMap.set(worker.materialId, current + worker.consumptionPerDay)
    })

    // Calculate export materials
    productionMap.forEach((production, materialId) => {
      const consumption = consumptionMap.get(materialId) || 0

      if (production > 0) {
        const localConsumptionRatio = consumption / production
        const exportRatio = 1 - localConsumptionRatio

        if (localConsumptionRatio < (1 - exportThresholdDecimal.value)) {
          const exportAmount = production - consumption
          const resolver = resolvedPriceResolver.value
          exportMaterials.push({
            materialId,
            productionPerDay: production * periodFactor.value,
            consumptionPerDay: consumption * periodFactor.value,
            exportPerDay: exportAmount * periodFactor.value,
            exportRatio: exportRatio * 100,
            valuePerDay: exportAmount * resolver(materialId) * periodFactor.value,
          })
        }
      }
    })
    exportMaterials.sort((a, b) => b.valuePerDay - a.valuePerDay)

    // Calculate export revenue and profit
    const exportRevenue = exportMaterials.reduce((sum, m) => sum + m.valuePerDay, 0)
    const allCosts = (report.summary.materialPurchaseCosts + report.summary.workerPurchaseCosts) * periodFactor.value
    const exportNetProfit = exportRevenue - allCosts

    // Calculate weighted average 7d price trend for export materials
    let exportPriceTrend7d = 0
    if (exportMaterials.length > 0 && marketOpportunities) {
      const opportunities = toValue(marketOpportunities) ?? []
      const opportunityMap = new Map(opportunities.map(o => [o.materialId, o]))

      let totalWeight = 0
      let weightedTrendSum = 0

      exportMaterials.forEach(exportMat => {
        const opportunity = opportunityMap.get(exportMat.materialId)
        if (opportunity) {
          const weight = exportMat.valuePerDay
          totalWeight += weight
          weightedTrendSum += opportunity.priceTrend.changePercent7d * weight
        }
      })

      if (totalWeight > 0) {
        exportPriceTrend7d = weightedTrendSum / totalWeight
      }
    }

    return {
      netProfit: report.summary.net * periodFactor.value,
      exportNetProfit,
      exportPriceTrend7d,
      workerCosts: report.summary.workerPurchaseCosts * periodFactor.value,
      materialPurchases: report.summary.materialPurchaseCosts * periodFactor.value,
      revenue: exportRevenue,
      workforceDeficitCost: workerDeficitCost * periodFactor.value,
      exportMaterials,
      minCoverage,
      totalDeficit,
    }
  }

  const baseSummaries = computed((): BaseSummaryData[] => {
    return baseReports.value.map(({ base, report }, index) => {
      const currentReport = currentBaseReports.value[index]?.report

      // Calculate planned metrics
      const planned = calculateMetrics(base, report)

      // Calculate current metrics
      const current = currentReport ? calculateMetrics(base, currentReport) : {
        netProfit: 0,
        exportNetProfit: 0,
        exportPriceTrend7d: 0,
        workerCosts: 0,
        materialPurchases: 0,
        revenue: 0,
        workforceDeficitCost: 0,
        exportMaterials: [],
        minCoverage: 100,
        totalDeficit: 0,
      }

      // Find materials that will run out of stock within the configured timeframe
      const materialsRunningOut: BaseSummaryData['materialsRunningOut'] = []
      const baseStock = base.stock ?? {}
      const timeframeDays = periodFactor.value

      report.materials.forEach((material) => {
        if (material.balancePerDay >= 0) return
        const currentStock = baseStock[material.materialId] ?? 0
        if (currentStock <= 0) return
        const consumptionPerDay = Math.abs(material.balancePerDay)
        const daysUntilEmpty = currentStock / consumptionPerDay

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

      // Calculate workforce productivity with stock awareness
      const workforceProductivity = calculateWorkforceProductivity(report, baseStock)

      return {
        baseId: base.id,
        baseName: base.name || `Base ${base.id}`,
        planetId: base.planetId,
        current: {
          netProfit: current.netProfit,
          exportNetProfit: current.exportNetProfit,
          exportPriceTrend7d: current.exportPriceTrend7d,
          workerCosts: current.workerCosts,
          materialPurchases: current.materialPurchases,
          revenue: current.revenue,
          workforceDeficitCost: current.workforceDeficitCost,
        },
        planned: {
          netProfit: planned.netProfit,
          exportNetProfit: planned.exportNetProfit,
          exportPriceTrend7d: planned.exportPriceTrend7d,
          workerCosts: planned.workerCosts,
          materialPurchases: planned.materialPurchases,
          revenue: planned.revenue,
          workforceDeficitCost: planned.workforceDeficitCost,
        },
        materialsRunningOut,
        exportMaterials: planned.exportMaterials,
        workforceCoverage: planned.minCoverage,
        workforceDeficit: planned.totalDeficit,
        workforceProductivity,
        // Legacy compatibility (planned values)
        netProfit: planned.netProfit,
        exportNetProfit: planned.exportNetProfit,
        exportPriceTrend7d: planned.exportPriceTrend7d,
        workforceDeficitCost: planned.workforceDeficitCost,
      }
    })
  })

  const totalNetProfit = computed(() => {
    return {
      current: currentBaseReports.value.reduce((sum, { report }) => sum + report.summary.net * periodFactor.value, 0),
      planned: baseReports.value.reduce((sum, { report }) => sum + report.summary.net * periodFactor.value, 0),
    }
  })

  const totalWorkforceDeficitCost = computed(() => {
    return {
      current: baseSummaries.value.reduce((sum, base) => sum + base.current.workforceDeficitCost, 0),
      planned: baseSummaries.value.reduce((sum, base) => sum + base.planned.workforceDeficitCost, 0),
    }
  })

  const totalExportNetProfit = computed(() => {
    return {
      current: baseSummaries.value.reduce((sum, base) => sum + base.current.exportNetProfit, 0),
      planned: baseSummaries.value.reduce((sum, base) => sum + base.planned.exportNetProfit, 0),
    }
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

        const resolver = resolvedPriceResolver.value
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

  const summary = computed((): GlobalSummaryData => ({
    current: {
      totalNetProfit: totalNetProfit.value.current,
      totalExportNetProfit: totalExportNetProfit.value.current,
      totalWorkforceDeficitCost: totalWorkforceDeficitCost.value.current,
    },
    planned: {
      totalNetProfit: totalNetProfit.value.planned,
      totalExportNetProfit: totalExportNetProfit.value.planned,
      totalWorkforceDeficitCost: totalWorkforceDeficitCost.value.planned,
    },
    totalConsumptionOverheadCost: totalConsumptionOverheadCost.value,
    bases: baseSummaries.value,
    materials: globalMaterials.value,
    // Legacy compatibility
    totalNetProfit: totalNetProfit.value.planned,
    totalWorkforceDeficitCost: totalWorkforceDeficitCost.value.planned,
  }))

  return {
    summary,
    baseReports,
    baseSummaries,
    totalNetProfit,
    totalExportNetProfit,
    totalWorkforceDeficitCost,
    totalConsumptionOverheadCost,
    globalMaterials,
  }
}
