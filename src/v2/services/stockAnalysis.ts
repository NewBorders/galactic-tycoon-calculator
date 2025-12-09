/**
 * Stock Analysis Service
 * 
 * Analyzes material stock levels across all bases and categorizes them into:
 * - Export materials that need redistribution between bases
 * - Input materials that need to be purchased from the exchange
 */

import type { GameData, GdIndex } from './gamedata/types'
import type { BaseSummaryData } from '@/v2/composables/useGlobalSummary'

export interface MaterialStockWarning {
  materialId: number
  materialName: string
  baseId: string
  baseName: string
  daysUntilEmpty: number
  currentStock: number
  consumptionPerDay: number
  toBuy: number // Amount needed for timeframe
  weight: number // Total weight of toBuy amount
  value: number // Total value of toBuy amount
}

export interface MaterialStockGroup {
  materialId: number
  materialName: string
  totalToBuy: number
  totalWeight: number
  totalValue: number
  urgency: number // Minimum daysUntilEmpty across all bases
  bases: Array<{
    baseId: string
    baseName: string
    daysUntilEmpty: number
    currentStock: number
    consumptionPerDay: number
    toBuy: number
    weight: number
    value: number
  }>
}

export interface StockAnalysisResult {
  // Export materials produced in at least one base but needed in others
  redistributionNeeded: MaterialStockGroup[]
  // Input materials not produced anywhere, need to be bought
  purchaseNeeded: MaterialStockGroup[]
  // All warnings in flat list for "by base" view
  allWarnings: MaterialStockWarning[]
}

export interface StockAnalysisOptions {
  timeframeDays: number
  priceResolver: (materialId: number) => number
}

/**
 * Analyzes stock warnings across all bases
 */
export function analyzeStockSituation(
  baseSummaries: BaseSummaryData[],
  gameData: GameData,
  index: GdIndex,
  options: StockAnalysisOptions,
): StockAnalysisResult {
  const { timeframeDays, priceResolver } = options

  // Collect all materials running out with details
  const allWarnings: MaterialStockWarning[] = []
  const materialsByBase = new Map<number, Map<string, MaterialStockWarning>>()

  baseSummaries.forEach((base) => {
    base.materialsRunningOut.forEach((material) => {
      const materialData = index.materialById.get(material.materialId)
      if (!materialData) return

      const toBuy = material.consumptionPerDay * timeframeDays
      const weight = 0 // TODO: Add weight calculation when material weight is available
      const value = toBuy * priceResolver(material.materialId)

      const warning: MaterialStockWarning = {
        materialId: material.materialId,
        materialName: materialData.name,
        baseId: base.baseId,
        baseName: base.baseName,
        daysUntilEmpty: material.daysUntilEmpty,
        currentStock: material.currentStock,
        consumptionPerDay: material.consumptionPerDay,
        toBuy,
        weight,
        value,
      }

      allWarnings.push(warning)

      // Group by material
      if (!materialsByBase.has(material.materialId)) {
        materialsByBase.set(material.materialId, new Map())
      }
      materialsByBase.get(material.materialId)!.set(base.baseId, warning)
    })
  })

  // Determine which materials are produced (exports) vs need to be bought
  const exportMaterialIds = new Set<number>()
  baseSummaries.forEach((base) => {
    base.exportMaterials.forEach((exp) => {
      exportMaterialIds.add(exp.materialId)
    })
  })

  // Categorize materials
  const redistributionNeeded: MaterialStockGroup[] = []
  const purchaseNeeded: MaterialStockGroup[] = []

  materialsByBase.forEach((baseMap, materialId) => {
    const materialData = index.materialById.get(materialId)
    if (!materialData) return

    const bases = Array.from(baseMap.values()).map((warning) => ({
      baseId: warning.baseId,
      baseName: warning.baseName,
      daysUntilEmpty: warning.daysUntilEmpty,
      currentStock: warning.currentStock,
      consumptionPerDay: warning.consumptionPerDay,
      toBuy: warning.toBuy,
      weight: warning.weight,
      value: warning.value,
    }))

    const group: MaterialStockGroup = {
      materialId,
      materialName: materialData.name,
      totalToBuy: bases.reduce((sum, b) => sum + b.toBuy, 0),
      totalWeight: bases.reduce((sum, b) => sum + b.weight, 0),
      totalValue: bases.reduce((sum, b) => sum + b.value, 0),
      urgency: Math.min(...bases.map((b) => b.daysUntilEmpty)),
      bases,
    }

    // If this material is exported by any base, it needs redistribution
    // Otherwise it needs to be purchased
    if (exportMaterialIds.has(materialId)) {
      redistributionNeeded.push(group)
    } else {
      purchaseNeeded.push(group)
    }
  })

  // Sort by urgency (shortest time first)
  redistributionNeeded.sort((a, b) => a.urgency - b.urgency)
  purchaseNeeded.sort((a, b) => a.urgency - b.urgency)
  allWarnings.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty)

  return {
    redistributionNeeded,
    purchaseNeeded,
    allWarnings,
  }
}
