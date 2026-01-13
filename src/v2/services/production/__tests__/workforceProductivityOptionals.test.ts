/**
 * Tests for optional consumable handling in workforce productivity.
 * Rules (per latest requirements):
 * - Inactive optional consumables still reduce satisfaction (same as missing)
 * - Active + no stock also reduce satisfaction and should show warning context
 * - Active + stock available do not reduce satisfaction
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
      // Essentials
      { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 0, unitPrice: 2, optional: false, active: true },
      { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 0, unitPrice: 2, optional: false, active: true },
      { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 0, unitPrice: 3, optional: false, active: true },
      // Optionals
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

describe('Workforce Productivity - Optional consumables (active vs inactive)', () => {
  it('keeps 100% when all optionals active and in stock', () => {
    const { report, stock } = buildReport({ activeWorkwear: true, activeAle: true, stockWorkwear: 100, stockAle: 100 })

    const result = calculateWorkforceProductivity(report, stock)

    expect(result.tiers[0].satisfaction).toBe(100)
    expect(result.tiers[0].missingOptionals).toBe(0)
    expect(result.tiers[0].productivityPercent).toBe(100)
  })

  it('reduces satisfaction by 10% when an optional is inactive (even with stock)', () => {
    const { report, stock } = buildReport({ activeWorkwear: false, activeAle: true, stockWorkwear: 100, stockAle: 100 })

    const result = calculateWorkforceProductivity(report, stock)

    expect(result.tiers[0].satisfaction).toBe(90)
    expect(result.tiers[0].missingOptionals).toBe(1)
    expect(result.tiers[0].productivityPercent).toBe(90)
  })

  it('reduces satisfaction by 10% when optional is active but out of stock', () => {
    const { report, stock } = buildReport({ activeWorkwear: true, activeAle: true, stockWorkwear: 0, stockAle: 100 })

    const result = calculateWorkforceProductivity(report, stock)

    expect(result.tiers[0].satisfaction).toBe(90)
    expect(result.tiers[0].missingOptionals).toBe(1)
    expect(result.tiers[0].productivityPercent).toBe(90)
    expect(result.tiers[0].limitingMaterialId).toBe(4)
  })

  it('stacks penalties: inactive optional plus out-of-stock active optional = -20%', () => {
    const { report, stock } = buildReport({ activeWorkwear: false, activeAle: true, stockWorkwear: 0, stockAle: 0 })

    const result = calculateWorkforceProductivity(report, stock)

    expect(result.tiers[0].satisfaction).toBe(80)
    expect(result.tiers[0].missingOptionals).toBe(2)
    expect(result.tiers[0].productivityPercent).toBe(80)
  })
})
