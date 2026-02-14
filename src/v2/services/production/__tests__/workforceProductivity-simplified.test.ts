// src/v2/services/production/__tests__/workforceProductivity-simplified.test.ts
import { describe, it, expect } from 'vitest'
import { calculateWorkforceProductivity } from '../workforceProductivity'
import type { BaseReport } from '../types'

/**
 * Simplified workforce productivity calculation tests
 * 
 * New Logic:
 * - Essentials: Always assumed in stock (no penalty)
 * - Optionals: -10% per DEACTIVATED optional
 * - Stock shortages shown in "Materials Running Out" section
 */
describe('Workforce Productivity - Simplified Logic', () => {
  /**
   * All optionals active → 100% satisfaction
   */
  it('should calculate 100% satisfaction when all optionals are active', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1.0 }],
      workers: [
        // Essentials (assumed in stock, never penalize)
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true },
        // Optionals (all ACTIVE)
        { tier: 1, materialId: 4, consumptionPerDay: 8, costPerDay: 16, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 5, consumptionPerDay: 7.2, costPerDay: 14.4, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 6, consumptionPerDay: 1.6, costPerDay: 3.2, unitPrice: 2, optional: true, active: true },
      ],
    }

    const stock = {} // Stock doesn't matter with new logic

    const result = calculateWorkforceProductivity(report, stock)

    expect(result.tiers[0].satisfaction).toBe(100)
    expect(result.tiers[0].missingEssentials).toBe(0)
    expect(result.tiers[0].missingOptionals).toBe(0)
    expect(result.tiers[0].productivityPercent).toBe(100)
  })

  /**
   * 1 optional deactivated → 100% - 10% = 90% satisfaction
   */
  it('should calculate 90% satisfaction when 1 optional is deactivated', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1.0 }],
      workers: [
        // Essentials
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true },
        // Optionals (1 INACTIVE)
        { tier: 1, materialId: 4, consumptionPerDay: 8, costPerDay: 16, unitPrice: 2, optional: true, active: false }, // inactive
        { tier: 1, materialId: 5, consumptionPerDay: 7.2, costPerDay: 14.4, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 6, consumptionPerDay: 1.6, costPerDay: 3.2, unitPrice: 2, optional: true, active: true },
      ],
    }

    const stock = {}

    const result = calculateWorkforceProductivity(report, stock)

    expect(result.tiers[0].satisfaction).toBe(90)
    expect(result.tiers[0].missingEssentials).toBe(0)
    expect(result.tiers[0].missingOptionals).toBe(1)
  })

  /**
   * All 3 optionals deactivated → 100% - (10% * 3) = 70% satisfaction
   */
  it('should calculate 70% satisfaction when all 3 optionals are deactivated', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1.0 }],
      workers: [
        // Essentials
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true },
        // Optionals (all INACTIVE)
        { tier: 1, materialId: 4, consumptionPerDay: 8, costPerDay: 16, unitPrice: 2, optional: true, active: false },
        { tier: 1, materialId: 5, consumptionPerDay: 7.2, costPerDay: 14.4, unitPrice: 2, optional: true, active: false },
        { tier: 1, materialId: 6, consumptionPerDay: 1.6, costPerDay: 3.2, unitPrice: 2, optional: true, active: false },
      ],
    }

    const stock = {}

    const result = calculateWorkforceProductivity(report, stock)

    expect(result.tiers[0].satisfaction).toBe(70)
    expect(result.tiers[0].missingEssentials).toBe(0)
    expect(result.tiers[0].missingOptionals).toBe(3)
  })

  /**
   * Stock is now ignored - essentials always assumed in stock
   */
  it('should ignore empty stock for essentials', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1.0 }],
      workers: [
        // Essentials with NO stock
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true },
        // Optionals (all active)
        { tier: 1, materialId: 4, consumptionPerDay: 8, costPerDay: 16, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 5, consumptionPerDay: 7.2, costPerDay: 14.4, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 6, consumptionPerDay: 1.6, costPerDay: 3.2, unitPrice: 2, optional: true, active: true },
      ],
    }

    const stock = {
      1: 0, // missing - BUT essentials are always assumed available
      2: 0, // missing - BUT essentials are always assumed available
      3: 0, // missing - BUT essentials are always assumed available
      4: 100,
      5: 100,
      6: 100,
    }

    const result = calculateWorkforceProductivity(report, stock)

    // Should still be 100% - essentials don't penalize even if stock is 0
    expect(result.tiers[0].satisfaction).toBe(100)
    expect(result.tiers[0].missingEssentials).toBe(0)
    expect(result.tiers[0].missingOptionals).toBe(0)
  })

  /**
   * Multiple tiers with different deactivated optionals
   */
  it('should handle multiple tiers with different deactivation states', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [
        { tier: 1, required: 100, housing: 100, coverage: 1.0 },
        { tier: 2, required: 50, housing: 50, coverage: 1.0 },
      ],
      workers: [
        // Tier 1
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 4, consumptionPerDay: 8, costPerDay: 16, unitPrice: 2, optional: true, active: false }, // inactive
        // Tier 2
        { tier: 2, materialId: 1, consumptionPerDay: 48, costPerDay: 96, unitPrice: 2, optional: false, active: true },
        { tier: 2, materialId: 5, consumptionPerDay: 10, costPerDay: 20, unitPrice: 2, optional: true, active: true }, // active
      ],
    }

    const stock = {}

    const result = calculateWorkforceProductivity(report, stock)

    // Tier 1: 1 deactivated optional = 90%
    expect(result.tiers[0].satisfaction).toBe(90)
    expect(result.tiers[0].missingOptionals).toBe(1)

    // Tier 2: all active = 100%
    expect(result.tiers[1].satisfaction).toBe(100)
    expect(result.tiers[1].missingOptionals).toBe(0)
  })
})
