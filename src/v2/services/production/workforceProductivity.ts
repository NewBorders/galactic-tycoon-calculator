// src/v2/services/production/workforceProductivity.ts

import type { BaseReport } from './types'

export type WorkforceProductivityTier = {
  tier: 1 | 2 | 3 | 4
  productivityPercent: number // 0-100
  requiredWorkers: number
  housingCoverage: number // 0-100
  consumptionCoverage: number // 0-100, alias for satisfaction (for backwards compatibility)
  satisfaction: number // 0-100, calculated per Wiki: base 100%, -10% per missing optional, x0.6 per missing essential, floor 10%
  missingEssentials: number // count of missing essential consumables
  missingOptionals: number // count of missing optional consumables
  limitingFactor: 'housing' | 'consumption' | 'none'
  limitingMaterialId?: number // if limited by consumption
  daysOfConsumptionRemaining?: number
}

export type WorkforceProductivitySummary = {
  tiers: WorkforceProductivityTier[]
  overallProductivityPercent: number
  potentialLostProfitPerDay: number
  explanation: string
  hasStockData: boolean // Indicates if any stock data was provided
}

/**
 * Calculate workforce productivity based on housing coverage and worker satisfaction.
 *
 * Worker satisfaction is calculated per Wiki mechanics (https://wiki.galactictycoons.com/mechanics/workforce):
 * 1. Base Satisfaction: 100%
 * 2. Optional Consumables: Each missing optional reduces satisfaction by 10%
 * 3. Essential Consumables: Each missing essential applies a x0.6 multiplier
 * 4. Satisfaction Floor: Minimum 10% if no consumables provided
 *
 * Worker Productivity Formula (per Wiki):
 *   Worker Productivity = Satisfaction % × (Employed Workers / Required Jobs)
 *
 * Overall productivity is limited by:
 * 1. Housing coverage (workforce must be housed)
 * 2. Worker satisfaction (based on available consumables)
 *
 * The minimum of housing and satisfaction determines actual productivity.
 */
export function calculateWorkforceProductivity(
  report: BaseReport,
  stock: Record<number, number>
): WorkforceProductivitySummary {
  const tiers: WorkforceProductivityTier[] = []
  
  // Check if any stock data was provided
  const stockValues = Object.values(stock)
  const hasStockData = stockValues.length > 0 && stockValues.some(v => v > 0)

  for (const wf of report.workforceSummary) {
    const housingCoverage = wf.coverage * 100 // convert from decimal (0-1) to percent (0-100)

    // Find ALL consumption materials for this tier (including inactive optionals)
    // We need to check ALL optionals to warn user about missing/deactivated ones
    const tierConsumption = report.workers.filter(w => w.tier === wf.tier)

    // Calculate satisfaction based on Wiki mechanics
    // Base satisfaction: 100%
    // Missing optional: -10% per item (missing = not in stock OR deactivated)
    // Missing essential: x0.6 multiplier per item
    // Floor: 10% minimum

    let missingEssentials = 0
    let missingOptionals = 0
    let limitingMaterialId: number | undefined
    let daysRemaining: number | undefined

    for (const consumption of tierConsumption) {
      const currentStock = stock[consumption.materialId] ?? 0
      const consumptionPerDay = consumption.consumptionPerDay

      // Essential materials: always required
      if (!consumption.optional) {
        if (consumptionPerDay <= 0) continue // no consumption required

        // Check if material is in stock
        if (currentStock <= 0) {
          missingEssentials++
          // Track first missing material for limiting factor display
          if (limitingMaterialId === undefined) {
            limitingMaterialId = consumption.materialId
            daysRemaining = 0
          }
        } else {
          // Material is available, calculate days for info purposes
          const daysOfStock = currentStock / consumptionPerDay
          if (daysRemaining === undefined || daysOfStock < daysRemaining) {
            daysRemaining = daysOfStock
            limitingMaterialId = consumption.materialId
          }
        }
      } else {
        // Optional materials: now penalize even when deactivated
        if (!consumption.active) {
          missingOptionals++
          continue
        }

        // Active optional
        if (consumptionPerDay <= 0) continue // no need when amount is zero

        if (currentStock <= 0) {
          missingOptionals++
          // Missing active optional is the limiting factor (0 days remaining)
          limitingMaterialId = consumption.materialId
          daysRemaining = 0
        } else {
          // Optional is active and in stock, track days
          const daysOfStock = currentStock / consumptionPerDay
          if (daysRemaining === undefined || daysOfStock < daysRemaining) {
            daysRemaining = daysOfStock
            limitingMaterialId = consumption.materialId
          }
        }
      }
    }

    // Calculate satisfaction per Wiki formula
    let satisfaction = 100

    // Count total consumables (optionals counted even if inactive per requirements)
    // For essentials: all with consumptionPerDay > 0
    // For optionals: all with consumptionPerDay > 0 OR inactive
    const essentialCount = tierConsumption
      .filter(c => !c.optional && c.consumptionPerDay > 0)
      .length
    const optionalCount = tierConsumption
      .filter(c => c.optional && (c.consumptionPerDay > 0 || !c.active))
      .length
    const totalNeeded = essentialCount + optionalCount
    const totalMissing = missingEssentials + missingOptionals

    // Per Wiki: "If no consumables are provided, satisfaction is set to 10%"
    if (totalMissing === totalNeeded && totalNeeded > 0) {
      // All needed consumables missing → floor at 10%
      satisfaction = 10
    } else {
      // Apply optional consumables penalty: -10% per missing
      satisfaction -= (missingOptionals * 10)

      // Apply essential consumables multiplier: x0.6 per missing
      for (let i = 0; i < missingEssentials; i++) {
        satisfaction *= 0.6
      }

      // Apply floor: minimum 10% satisfaction
      satisfaction = Math.max(10, satisfaction)
    }

    // Satisfaction cannot exceed 100%
    satisfaction = Math.min(100, satisfaction)

    // Overall productivity is minimum of housing and satisfaction
    const productivityPercent = Math.min(housingCoverage, satisfaction)

    let limitingFactor: 'housing' | 'consumption' | 'none' = 'none'
    if (housingCoverage < satisfaction) {
      limitingFactor = 'housing'
    } else if (satisfaction < 100) {
      limitingFactor = 'consumption'
    }

    tiers.push({
      tier: wf.tier,
      productivityPercent,
      requiredWorkers: wf.required,
      housingCoverage,
      consumptionCoverage: satisfaction, // alias for backwards compatibility
      satisfaction,
      missingEssentials,
      missingOptionals,
      limitingFactor,
      limitingMaterialId,
      daysOfConsumptionRemaining: daysRemaining,
    })
  }

  // Calculate overall productivity (weighted by worker count)
  const totalWorkers = tiers.reduce((sum, t) => sum + t.requiredWorkers, 0)
  const weightedProductivity = tiers.reduce(
    (sum, t) => sum + (t.productivityPercent * t.requiredWorkers),
    0
  )
  const overallProductivityPercent = totalWorkers > 0 ? weightedProductivity / totalWorkers : 100

  // Calculate potential lost profit
  // Note: report.summary already reflects CURRENT productivity (not 100%)
  // We need to calculate what revenue/costs would be at 100% productivity
  
  const productionRevenueAtCurrent = report.summary.productionRevenue
  const workerCostsAtCurrent = report.summary.workerPurchaseCosts
  
  // Scale up to 100% (reverse the productivity reduction)
  const productivityFactor = overallProductivityPercent / 100
  const productionRevenueAt100 = productivityFactor > 0 
    ? productionRevenueAtCurrent / productivityFactor 
    : productionRevenueAtCurrent
  const workerCostsAt100 = productivityFactor > 0
    ? workerCostsAtCurrent / productivityFactor
    : workerCostsAtCurrent

  // Lost profit = what we would have made at 100% minus what we make at current productivity
  const netProfitAt100 = productionRevenueAt100 - workerCostsAt100
  const netProfitAtCurrent = productionRevenueAtCurrent - workerCostsAtCurrent
  const potentialLostProfitPerDay = netProfitAt100 - netProfitAtCurrent

  // Generate explanation
  let explanation = ''
  if (!hasStockData) {
    explanation = 'No stock data available - enter material stock to calculate productivity'
  } else if (overallProductivityPercent >= 100) {
    explanation = 'Workforce is operating at full capacity'
  } else if (overallProductivityPercent >= 90) {
    explanation = 'Workforce is operating near full capacity'
  } else if (overallProductivityPercent >= 75) {
    explanation = 'Workforce productivity is reduced due to missing housing or materials'
  } else if (overallProductivityPercent >= 50) {
    explanation = 'Significant workforce productivity loss due to housing or material shortages'
  } else {
    explanation = 'Critical workforce productivity issues - immediate attention needed'
  }

  return {
    tiers,
    overallProductivityPercent,
    potentialLostProfitPerDay,
    explanation,
    hasStockData,
  }
}
