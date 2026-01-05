// src/v2/services/production/lostProfit.ts

import type { BaseReport } from './types'
import type { WorkforceProductivitySummary } from './workforceProductivity'
import type { GameData, GdIndex } from '../gamedata/types'
import { computeBaseReport } from './engine'

export type LostProfitResult = {
  lostProfitPerDay: number
  minHousingCoverage: number
  minSatisfaction: number
}

export type BaseAssignment = {
  planetId: number
  buildings: Array<{ buildingId: number; level: number }>
  recipes: Array<{ recipeId: number; count: number }>
}

/**
 * Calculate lost profit due to reduced workforce productivity.
 * 
 * This compares the current state with an optimal state where:
 * - All optional consumables are active
 * - Housing is at 100% capacity
 * 
 * The difference between optimal and current net profit is the "lost profit".
 * 
 * @param productivity - The workforce productivity summary
 * @param report - The current base report
 * @param gameData - Game data for recalculating optimal state
 * @param index - Game data index
 * @param assignment - Base assignment (buildings, recipes, planet)
 * @param priceResolver - Function to resolve material prices
 * @param technologyLevels - Technology levels
 * @param startingBonus - Starting bonus percentage
 * @param globalWorkforceBurden - Global workforce burden percentage
 * @returns Lost profit per day and minimum metrics
 */
export function calculateLostProfit(
  productivity: WorkforceProductivitySummary,
  report: BaseReport,
  gameData: GameData,
  index: GdIndex,
  assignment: BaseAssignment,
  priceResolver: (materialId: number) => number,
  technologyLevels: Record<number, number>,
  startingBonus: number,
  globalWorkforceBurden: number,
): LostProfitResult {
  const minHousingCoverage = Math.min(...productivity.tiers.map(t => t.housingCoverage))
  const minSatisfaction = Math.min(...productivity.tiers.map(t => t.satisfaction))

  if (productivity.overallProductivityPercent >= 100) {
    return {
      lostProfitPerDay: 0,
      minHousingCoverage,
      minSatisfaction,
    }
  }

  const hasHousingShortage = productivity.tiers.some(t => t.housingCoverage < 100)
  const hasConsumableShortage = productivity.tiers.some(t => t.missingEssentials > 0 || t.missingOptionals > 0)

  if (!hasHousingShortage && !hasConsumableShortage) {
    return {
      lostProfitPerDay: 0,
      minHousingCoverage,
      minSatisfaction,
    }
  }

  // Calculate optimal state with all optionals active
  let optimalReport = report
  if (hasConsumableShortage) {
    const allOptionalIds = new Set<number>()
    ;[1, 2, 3, 4].forEach((tier) => {
      const worker = index.workerByType.get(tier as 1 | 2 | 3 | 4)
      if (!worker) return
      worker.consumables
        .filter((c) => !c.essential)
        .forEach((c) => allOptionalIds.add(c.matId))
    })

    optimalReport = computeBaseReport(gameData, {
      assignment,
      horizonDays: 1,
      options: {
        activeOptionalConsumables: allOptionalIds,
        priceResolver,
        technologyLevels,
        startingBonus,
        globalWorkforceBurden,
      },
    })
  }

  // Scale to 100% housing if needed
  let netAtOptimal = optimalReport.summary.net

  if (hasHousingShortage) {
    const housingFactor = minHousingCoverage / 100

    if (housingFactor > 0) {
      const revenueOptimal = optimalReport.summary.productionRevenue / housingFactor
      const costsOptimal = (optimalReport.summary.workerPurchaseCosts +
                           optimalReport.summary.materialPurchaseCosts) / housingFactor
      netAtOptimal = revenueOptimal - costsOptimal
    }
  }

  const lostProfitPerDay = netAtOptimal - report.summary.net

  return {
    lostProfitPerDay,
    minHousingCoverage,
    minSatisfaction,
  }
}
