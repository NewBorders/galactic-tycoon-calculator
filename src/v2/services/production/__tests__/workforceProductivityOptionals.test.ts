/**
 * Tests for optional consumable handling in workforce productivity.
 * 
 * Simplified Rules:
 * - Optionals only penalize if DEACTIVATED (active=false)
 * - Stock is IGNORED (checked separately in "Materials Running Out")
 * - Essentials never penalize (always assumed in stock)
 */

import { describe, expect, it } from 'vitest'
import { calculateWorkforceProductivity } from '../workforceProductivity'
import type { BaseReport } from '../types'

type ScenarioOptions = {
  activeWorkwear: boolean
  activeAle: boolean
  stockWorkwear: number
  stockAle: number
}

function buildReport(options: ScenarioOptions): { report: BaseReport; stock: Record<number, number> } {
  const { activeWorkwear, activeAle, stockWorkwear, stockAle } = options

  const report: BaseReport = {
    summary: { productionRevenue: 1000, materialPurchaseCosts: 0, workerPurchaseCosts: 0, net: 1000 },
    materials: [],
    recipes: [],
    workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1 }],
    workers: [
      // Essentials (stock ignored, always assumed available)
      { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 0, unitPrice: 2, optional: false, active: true },
      { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 0, unitPrice: 2, optional: false, active: true },
      { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 0, unitPrice: 3, optional: false, active: true },
      // Optionals (deactivation state matters, stock is ignored)
      { tier: 1, materialId: 4, consumptionPerDay: 8, costPerDay: 0, unitPrice: 2, optional: true, active: activeWorkwear },
      { tier: 1, materialId: 5, consumptionPerDay: 7, costPerDay: 0, unitPrice: 2, optional: true, active: activeAle },
    ],
  }

  const stock = {
    1: 100,
    2: 100,
    3: 100,
    4: stockWorkwear,
    5: stockAle,
  }

  return { report, stock }
}

describe('Workforce Productivity - Optional consumables (deactivation only)', () => {
  it('keeps 100% when all optionals active', () => {
    const { report, stock } = buildReport({ activeWorkwear: true, activeAle: true, stockWorkwear: 100, stockAle: 100 })

    const result = calculateWorkforceProductivity(report, stock)

    expect(result.tiers[0].satisfaction).toBe(100)
    expect(result.tiers[0].missingOptionals).toBe(0)
    expect(result.tiers[0].productivityPercent).toBe(100)
  })

  it('reduces satisfaction by 10% when an optional is DEACTIVATED', () => {
    const { report, stock } = buildReport({ activeWorkwear: false, activeAle: true, stockWorkwear: 100, stockAle: 100 })

    const result = calculateWorkforceProductivity(report, stock)

    // 100% - 10% = 90%
    expect(result.tiers[0].satisfaction).toBe(90)
    expect(result.tiers[0].missingOptionals).toBe(1)
    expect(result.tiers[0].missingEssentials).toBe(0) // Essentials never penalize
    expect(result.tiers[0].productivityPercent).toBe(90)
  })

  it('stock is IGNORED - out-of-stock actives do NOT reduce satisfaction', () => {
    const { report, stock } = buildReport({ activeWorkwear: true, activeAle: true, stockWorkwear: 0, stockAle: 0 })

    const result = calculateWorkforceProductivity(report, stock)

    // Stock doesn't matter - all optionals are active
    expect(result.tiers[0].satisfaction).toBe(100)
    expect(result.tiers[0].missingOptionals).toBe(0)
    expect(result.tiers[0].productivityPercent).toBe(100)
  })

  it('deactivated optional penalizes even when in stock, active with no stock does NOT penalize', () => {
    const { report, stock } = buildReport({ activeWorkwear: false, activeAle: true, stockWorkwear: 100, stockAle: 0 })

    const result = calculateWorkforceProductivity(report, stock)

    // Only deactivated optional counts: -10%
    expect(result.tiers[0].satisfaction).toBe(90)
    expect(result.tiers[0].missingOptionals).toBe(1)
    expect(result.tiers[0].productivityPercent).toBe(90)
  })

  it('multiple deactivated optionals stack penalties', () => {
    const { report, stock } = buildReport({ activeWorkwear: false, activeAle: false, stockWorkwear: 100, stockAle: 100 })

    const result = calculateWorkforceProductivity(report, stock)

    // Both optionals deactivated: 100% - 10% - 10% = 80%
    expect(result.tiers[0].satisfaction).toBe(80)
    expect(result.tiers[0].missingOptionals).toBe(2)
    expect(result.tiers[0].productivityPercent).toBe(80)
  })
})
