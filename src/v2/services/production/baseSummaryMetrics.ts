/**
 * Service for calculating base summary metrics including export calculations and price trends
 */

import type { BaseReport } from './types'
import type { MarketOpportunity } from '../marketAnalysis/types'
import { getExportThresholdRatio } from '../config/exportThreshold'

export interface ExportMaterialsResult {
  exportMaterialIds: Set<number>
  exportRevenue: number
  exportNetProfit: number
}

export interface PriceTrendResult {
  netProfitPriceTrend7d: number
}

/**
 * Calculate which materials are considered exports based on local consumption ratio
 */
export function calculateExportMaterials(report: BaseReport): Set<number> {
  const threshold = getExportThresholdRatio()
  const exportIds = new Set<number>()

  // Build production and consumption maps
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

  // Determine export materials
  productionMap.forEach((production, materialId) => {
    const consumption = consumptionMap.get(materialId) || 0
    if (production > 0) {
      const localConsumptionRatio = consumption / production
      // Material is exported if less than threshold is consumed locally
      if (localConsumptionRatio < (1 - threshold)) {
        exportIds.add(materialId)
      }
    }
  })

  return exportIds
}

/**
 * Calculate export revenue and export net profit
 */
export function calculateExportMetrics(
  report: BaseReport,
  exportMaterialIds: Set<number>,
  periodFactor: number,
): ExportMaterialsResult {
  // Calculate export revenue (only from export materials)
  let exportRevenue = 0
  report.materials.forEach((mat) => {
    if (exportMaterialIds.has(mat.materialId) && mat.balancePerDay > 0) {
      exportRevenue += mat.valuePerDay
    }
  })
  exportRevenue *= periodFactor

  // Export net profit = export revenue - ALL costs
  const allCosts =
    report.summary.materialPurchaseCosts * periodFactor +
    report.summary.workerPurchaseCosts * periodFactor

  const exportNetProfit = exportRevenue - allCosts

  return {
    exportMaterialIds,
    exportRevenue,
    exportNetProfit,
  }
}

/**
 * Calculate weighted average 7d price trend for net profit
 * Weights all materials by their absolute value impact
 */
export function calculateNetProfitPriceTrend(
  report: BaseReport,
  marketOpportunities?: MarketOpportunity[],
): number {
  if (!marketOpportunities || marketOpportunities.length === 0) {
    return 0
  }

  const opportunityMap = new Map(
    marketOpportunities.map((o) => [o.materialId, o]),
  )
  let totalWeight = 0
  let weightedTrendSum = 0

  // Weight by absolute value (both production and consumption matter)
  report.materials.forEach((mat) => {
    const opportunity = opportunityMap.get(mat.materialId)
    if (opportunity) {
      const weight = Math.abs(mat.valuePerDay)
      totalWeight += weight
      weightedTrendSum += opportunity.priceTrend.changePercent7d * weight
    }
  })

  return totalWeight > 0 ? weightedTrendSum / totalWeight : 0
}
