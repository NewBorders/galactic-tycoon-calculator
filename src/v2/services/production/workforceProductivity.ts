// src/v2/services/production/workforceProductivity.ts

import type { BaseReport } from './types'

export type WorkforceProductivityTier = {
  tier: 1 | 2 | 3 | 4
  productivityPercent: number // 0-100
  requiredWorkers: number
  housingCoverage: number // 0-100
  consumptionCoverage: number // 0-100, based on stock materials
  limitingFactor: 'housing' | 'consumption' | 'none'
  limitingMaterialId?: number // if limited by consumption
  daysOfConsumptionRemaining?: number
}

export type WorkforceProductivitySummary = {
  tiers: WorkforceProductivityTier[]
  overallProductivityPercent: number
  potentialLostProfitPerDay: number
  explanation: string
}

/**
 * Calculate workforce productivity based on housing coverage and material stock.
 * 
 * Productivity is limited by:
 * 1. Housing coverage (workforce must be housed)
 * 2. Material availability (workers need materials to be productive - simple YES/NO check)
 * 
 * The minimum of these two factors determines actual productivity.
 * Note: planDays parameter is kept for compatibility but not used - we only check if materials are in stock NOW.
 */
export function calculateWorkforceProductivity(
  report: BaseReport,
  stock: Record<number, number>,
  planDays: number,
): WorkforceProductivitySummary {
  const tiers: WorkforceProductivityTier[] = []

  for (const wf of report.workforceSummary) {
    const housingCoverage = wf.coverage * 100 // convert from decimal (0-1) to percent (0-100)
    
    // Find consumption materials for this tier
    const tierConsumption = report.workers.filter(w => w.tier === wf.tier && w.active)
    
    // Calculate consumption coverage based on stock availability
    // Simple check: Are all required materials in stock? (>0)
    let consumptionCoverage = 100
    let limitingMaterialId: number | undefined
    let daysRemaining: number | undefined
    
    for (const consumption of tierConsumption) {
      const currentStock = stock[consumption.materialId] ?? 0
      const consumptionPerDay = consumption.consumptionPerDay
      
      if (consumptionPerDay <= 0) continue // no consumption required
      
      // Simple IST check: Is material available?
      if (currentStock <= 0) {
        // No stock = 0% coverage for this material
        consumptionCoverage = 0
        limitingMaterialId = consumption.materialId
        daysRemaining = 0
        break // One missing material is enough to stop production
      }
      
      // Material is available, calculate days for info purposes
      const daysOfStock = currentStock / consumptionPerDay
      if (daysRemaining === undefined || daysOfStock < daysRemaining) {
        daysRemaining = daysOfStock
        limitingMaterialId = consumption.materialId
      }
    }
    
    // Overall productivity is minimum of housing and consumption
    const productivityPercent = Math.min(housingCoverage, consumptionCoverage)
    
    let limitingFactor: 'housing' | 'consumption' | 'none' = 'none'
    if (housingCoverage < consumptionCoverage) {
      limitingFactor = 'housing'
    } else if (consumptionCoverage < 100) {
      limitingFactor = 'consumption'
    }
    
    tiers.push({
      tier: wf.tier,
      productivityPercent,
      requiredWorkers: wf.required,
      housingCoverage,
      consumptionCoverage,
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
  // Lost profit = (production value at 100%) - (production value at current productivity)
  // - (workforce costs at 100%) + (workforce costs saved at current productivity)
  
  const productionRevenueAt100 = report.summary.productionRevenue
  const workerCostsAt100 = report.summary.workerPurchaseCosts
  
  // Assume production scales linearly with productivity (simplified)
  const productionRevenueAtCurrent = productionRevenueAt100 * (overallProductivityPercent / 100)
  const workerCostsAtCurrent = workerCostsAt100 * (overallProductivityPercent / 100)
  
  const potentialLostProfitPerDay = 
    (productionRevenueAt100 - workerCostsAt100) - 
    (productionRevenueAtCurrent - workerCostsAtCurrent)
  
  // Generate explanation
  let explanation = ''
  if (overallProductivityPercent >= 100) {
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
  }
}
