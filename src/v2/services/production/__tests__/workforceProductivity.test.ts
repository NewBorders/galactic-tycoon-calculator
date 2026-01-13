// src/v2/services/production/__tests__/workforceProductivity.test.ts
import { describe, it, expect } from 'vitest'
import { calculateWorkforceProductivity } from '../workforceProductivity'
import type { BaseReport } from '../types'

/**
 * Integration tests for workforce productivity calculation
 * Tests satisfaction calculation based on Wiki mechanics:
 * https://wiki.galactictycoons.com/mechanics/workforce#satisfaction
 */
describe('Workforce Productivity - Satisfaction Calculation', () => {
  /**
   * Test Case from Wiki:
   * All Consumables Provided → 100% satisfaction
   */
  it('should calculate 100% satisfaction when all consumables are provided', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1.0 }],
      workers: [
        // Essential consumables (all available)
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true }, // rations
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true }, // water
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true }, // tools
        // Optional consumables (all available)
        { tier: 1, materialId: 4, consumptionPerDay: 8, costPerDay: 16, unitPrice: 2, optional: true, active: true }, // workwear
        { tier: 1, materialId: 5, consumptionPerDay: 7.2, costPerDay: 14.4, unitPrice: 2, optional: true, active: true }, // ale
        { tier: 1, materialId: 6, consumptionPerDay: 1.6, costPerDay: 3.2, unitPrice: 2, optional: true, active: true }, // pie
      ],
    }

    const stock = {
      1: 100, // rations
      2: 100, // water
      3: 100, // tools
      4: 100, // workwear
      5: 100, // ale
      6: 100, // pie
    }

    const result = calculateWorkforceProductivity(report, stock)

    expect(result.tiers[0].satisfaction).toBe(100)
    expect(result.tiers[0].missingEssentials).toBe(0)
    expect(result.tiers[0].missingOptionals).toBe(0)
    expect(result.tiers[0].productivityPercent).toBe(100)
  })

  /**
   * Debug test to check actual scenario from user
   */
  it('DEBUG: inactive optionals now penalize satisfaction per requirements', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1.0 }],
      workers: [
        // Essential consumables
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true },
        // Optional but INACTIVE (consumptionPerDay = 0)
        { tier: 1, materialId: 4, consumptionPerDay: 0, costPerDay: 0, unitPrice: 2, optional: true, active: false },
        { tier: 1, materialId: 5, consumptionPerDay: 0, costPerDay: 0, unitPrice: 2, optional: true, active: false },
        { tier: 1, materialId: 6, consumptionPerDay: 0, costPerDay: 0, unitPrice: 2, optional: true, active: false },
      ],
    }

    const stock = {
      1: 100,
      2: 100,
      3: 100,
      4: 0, // inactive optional, no stock (should not matter)
      5: 0, // inactive optional, no stock (should not matter)
      6: 0, // inactive optional, no stock (should not matter)
    }

    const result = calculateWorkforceProductivity(report, stock)

    console.log('DEBUG Test Results:', {
      satisfaction: result.tiers[0].satisfaction,
      missingEssentials: result.tiers[0].missingEssentials,
      missingOptionals: result.tiers[0].missingOptionals,
      productivity: result.tiers[0].productivityPercent,
      tierConsumption: report.workers.filter(w => w.tier === 1 && w.active),
    })

    // Inactive optionals now count as missing: 3 optionals -> -30%
    expect(result.tiers[0].satisfaction).toBe(70)
    expect(result.tiers[0].missingEssentials).toBe(0)
    expect(result.tiers[0].missingOptionals).toBe(3)
    expect(result.tiers[0].productivityPercent).toBe(70)
  })

  /**
   * Test case: Empty stock object (no materials at all)
   * This simulates when user hasn't entered any stock data
   */
  it('should handle empty stock object - all essentials missing', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1.0 }],
      workers: [
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true },
      ],
    }

    const stock = {} // Empty stock - all materials missing

    const result = calculateWorkforceProductivity(report, stock)

    console.log('Empty stock test:', {
      satisfaction: result.tiers[0].satisfaction,
      missingEssentials: result.tiers[0].missingEssentials,
    })

    // All essentials missing = 10% floor
    expect(result.tiers[0].satisfaction).toBe(10)
    expect(result.tiers[0].missingEssentials).toBe(3)
  })

  /**
   * Test Case from Wiki:
   * Missing 1 Optional → 100% - (10% * 1) = 90% satisfaction
   */
  it('should calculate 90% satisfaction when 1 optional consumable is missing', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1.0 }],
      workers: [
        // Essential consumables (all available)
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true },
        // Optional consumables (1 missing)
        { tier: 1, materialId: 4, consumptionPerDay: 8, costPerDay: 16, unitPrice: 2, optional: true, active: true }, // missing
        { tier: 1, materialId: 5, consumptionPerDay: 7.2, costPerDay: 14.4, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 6, consumptionPerDay: 1.6, costPerDay: 3.2, unitPrice: 2, optional: true, active: true },
      ],
    }

    const stock = {
      1: 100,
      2: 100,
      3: 100,
      // 4: missing
      5: 100,
      6: 100,
    }

    const result = calculateWorkforceProductivity(report, stock, 1)

    expect(result.tiers[0].satisfaction).toBe(90)
    expect(result.tiers[0].missingEssentials).toBe(0)
    expect(result.tiers[0].missingOptionals).toBe(1)
  })

  /**
   * Test Case from Wiki:
   * Missing 3 Optionals → 100% - (10% * 3) = 70% satisfaction
   */
  it('should calculate 70% satisfaction when all 3 optional consumables are missing', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1.0 }],
      workers: [
        // Essential consumables (all available)
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true },
        // Optional consumables (all missing)
        { tier: 1, materialId: 4, consumptionPerDay: 8, costPerDay: 16, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 5, consumptionPerDay: 7.2, costPerDay: 14.4, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 6, consumptionPerDay: 1.6, costPerDay: 3.2, unitPrice: 2, optional: true, active: true },
      ],
    }

    const stock = {
      1: 100,
      2: 100,
      3: 100,
      // 4, 5, 6: all missing
    }

    const result = calculateWorkforceProductivity(report, stock, 1)

    expect(result.tiers[0].satisfaction).toBe(70)
    expect(result.tiers[0].missingEssentials).toBe(0)
    expect(result.tiers[0].missingOptionals).toBe(3)
  })

  /**
   * Test Case from Wiki:
   * Missing 3 Optionals and 1 Essential → 70% * 0.6 = 42% satisfaction
   */
  it('should calculate 42% satisfaction when 3 optionals and 1 essential are missing', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1.0 }],
      workers: [
        // Essential consumables (1 missing)
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true }, // missing
        // Optional consumables (all missing)
        { tier: 1, materialId: 4, consumptionPerDay: 8, costPerDay: 16, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 5, consumptionPerDay: 7.2, costPerDay: 14.4, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 6, consumptionPerDay: 1.6, costPerDay: 3.2, unitPrice: 2, optional: true, active: true },
      ],
    }

    const stock = {
      1: 100,
      2: 100,
      // 3: missing
      // 4, 5, 6: all missing
    }

    const result = calculateWorkforceProductivity(report, stock, 1)

    expect(result.tiers[0].satisfaction).toBe(42)
    expect(result.tiers[0].missingEssentials).toBe(1)
    expect(result.tiers[0].missingOptionals).toBe(3)
  })

  /**
   * Test Case from Wiki:
   * Missing 3 Optionals and 2 Essentials → 70% * 0.6 * 0.6 = 25.2% satisfaction
   */
  it('should calculate 25.2% satisfaction when 3 optionals and 2 essentials are missing', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1.0 }],
      workers: [
        // Essential consumables (2 missing)
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true }, // missing
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true }, // missing
        // Optional consumables (all missing)
        { tier: 1, materialId: 4, consumptionPerDay: 8, costPerDay: 16, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 5, consumptionPerDay: 7.2, costPerDay: 14.4, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 6, consumptionPerDay: 1.6, costPerDay: 3.2, unitPrice: 2, optional: true, active: true },
      ],
    }

    const stock = {
      1: 100,
      // 2, 3: missing
      // 4, 5, 6: all missing
    }

    const result = calculateWorkforceProductivity(report, stock, 1)

    expect(result.tiers[0].satisfaction).toBe(25.2)
    expect(result.tiers[0].missingEssentials).toBe(2)
    expect(result.tiers[0].missingOptionals).toBe(3)
  })

  /**
   * Test Case from Wiki:
   * No Consumables Provided → Floored to 10% satisfaction
   * 
   * The Wiki states: "Satisfaction Floor: If no consumables are provided, satisfaction is set to 10%"
   * This is a special case: when ALL consumables (both essential and optional) are missing,
   * satisfaction is directly set to 10%, not calculated.
   */
  it('should set satisfaction to 10% when all consumables are missing', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1.0 }],
      workers: [
        // Essential consumables (all missing)
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true },
        // Optional consumables (all missing)
        { tier: 1, materialId: 4, consumptionPerDay: 8, costPerDay: 16, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 5, consumptionPerDay: 7.2, costPerDay: 14.4, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 6, consumptionPerDay: 1.6, costPerDay: 3.2, unitPrice: 2, optional: true, active: true },
      ],
    }

    const stock = {
      // All consumables missing
    }

    const result = calculateWorkforceProductivity(report, stock, 1)

    // Per Wiki: When ALL consumables are missing, satisfaction is set to 10%
    expect(result.tiers[0].satisfaction).toBe(10)
    expect(result.tiers[0].missingEssentials).toBe(3)
    expect(result.tiers[0].missingOptionals).toBe(3)
  })

  /**
   * Test the 10% satisfaction floor
   * With more missing essentials, the multiplier drives satisfaction below 10%
   * Example: 3 optionals + 5 essentials missing
   * Calculation: (100 - 30) * 0.6^5 = 70 * 0.07776 = 5.44% → floored to 10%
   */
  it('should apply 10% floor when calculation goes below minimum', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1.0 }],
      workers: [
        // Essential consumables (5 missing - hypothetical for test purposes)
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true },
        { tier: 1, materialId: 7, consumptionPerDay: 10, costPerDay: 20, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 8, consumptionPerDay: 15, costPerDay: 30, unitPrice: 2, optional: false, active: true },
        // Optional consumables (all missing)
        { tier: 1, materialId: 4, consumptionPerDay: 8, costPerDay: 16, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 5, consumptionPerDay: 7.2, costPerDay: 14.4, unitPrice: 2, optional: true, active: true },
        { tier: 1, materialId: 6, consumptionPerDay: 1.6, costPerDay: 3.2, unitPrice: 2, optional: true, active: true },
      ],
    }

    const stock = {
      // All consumables missing
    }

    const result = calculateWorkforceProductivity(report, stock, 1)

    // Mathematically: (100 - 30) * 0.6^5 = 70 * 0.07776 = 5.4432 → Math.max(10, 5.4432) = 10
    expect(result.tiers[0].satisfaction).toBe(10)
    expect(result.tiers[0].missingEssentials).toBe(5)
    expect(result.tiers[0].missingOptionals).toBe(3)
  })

  /**
   * Test housing limitation
   * Housing at 80% limits productivity even with 100% satisfaction
   */
  it('should limit productivity by housing coverage when satisfaction is higher', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 80, coverage: 0.8 }], // 80% housing
      workers: [
        // All consumables available
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true },
      ],
    }

    const stock = {
      1: 100,
      2: 100,
      3: 100,
    }

    const result = calculateWorkforceProductivity(report, stock, 1)

    expect(result.tiers[0].satisfaction).toBe(100)
    expect(result.tiers[0].housingCoverage).toBe(80)
    expect(result.tiers[0].productivityPercent).toBe(80) // Limited by housing
    expect(result.tiers[0].limitingFactor).toBe('housing')
  })

  /**
   * Test satisfaction limitation
   * 42% satisfaction limits productivity even with 100% housing
   */
  it('should limit productivity by satisfaction when housing is higher', () => {
    const report: BaseReport = {
      summary: { productionRevenue: 1000, materialPurchaseCosts: 100, workerPurchaseCosts: 200, net: 700 },
      materials: [],
      recipes: [],
      workforceSummary: [{ tier: 1, required: 100, housing: 100, coverage: 1.0 }], // 100% housing
      workers: [
        // 1 essential missing, 3 optionals missing → 42% satisfaction
        { tier: 1, materialId: 1, consumptionPerDay: 24, costPerDay: 48, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 2, consumptionPerDay: 32, costPerDay: 64, unitPrice: 2, optional: false, active: true },
        { tier: 1, materialId: 3, consumptionPerDay: 12, costPerDay: 36, unitPrice: 3, optional: false, active: true }, // missing
        { tier: 1, materialId: 4, consumptionPerDay: 8, costPerDay: 16, unitPrice: 2, optional: true, active: true }, // missing
        { tier: 1, materialId: 5, consumptionPerDay: 7.2, costPerDay: 14.4, unitPrice: 2, optional: true, active: true }, // missing
        { tier: 1, materialId: 6, consumptionPerDay: 1.6, costPerDay: 3.2, unitPrice: 2, optional: true, active: true }, // missing
      ],
    }

    const stock = {
      1: 100,
      2: 100,
      // 3, 4, 5, 6 missing
    }

    const result = calculateWorkforceProductivity(report, stock, 1)

    expect(result.tiers[0].satisfaction).toBe(42)
    expect(result.tiers[0].housingCoverage).toBe(100)
    expect(result.tiers[0].productivityPercent).toBe(42) // Limited by satisfaction
    expect(result.tiers[0].limitingFactor).toBe('consumption')
  })
})
