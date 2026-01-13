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
 * Simplified satisfaction logic:
 * - Essentials: Always assumed to be in stock (no penalty applied)
 * - Optionals: Penalized by -10% per deactivated optional
 * - Stock shortages are tracked separately in "Materials Running Out"
 *
 * Worker Productivity Formula (per Wiki):
 *   Worker Productivity = Satisfaction % × (Employed Workers / Required Jobs)
 *
 * Overall productivity is limited by:
 * 1. Housing coverage (workforce must be housed)
 * 2. Worker satisfaction (based on deactivated optionals)
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

    // Find ALL consumption materials for this tier
    const tierConsumption = report.workers.filter(w => w.tier === wf.tier)

    // Calculate satisfaction based on deactivated optionals only
    // Essentials: Always assumed in stock
    // Optionals: -10% per deactivated optional
    // Stock status handled separately via "Materials Running Out"

    const missingEssentials = 0
    let missingOptionals = 0

    for (const consumption of tierConsumption) {
      // Optional materials: penalize only if deactivated (not active)
      if (consumption.optional) {
        if (consumption.consumptionPerDay > 0 && !consumption.active) {
          missingOptionals++
        }
      }
      // Essentials: never penalize (assume stock is available)
      // Stock shortages are visible in "Materials Running Out" section
    }

    // Calculate satisfaction
    let satisfaction = 100
    
    // Apply optional consumables penalty: -10% per deactivated optional
    satisfaction -= (missingOptionals * 10)

    // Satisfaction has a floor at 10% (per Wiki)
    satisfaction = Math.max(10, satisfaction)
    
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
      limitingMaterialId: undefined, // Not tracking individual materials anymore
      daysOfConsumptionRemaining: undefined, // Stock tracking moved to "Materials Running Out"
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
