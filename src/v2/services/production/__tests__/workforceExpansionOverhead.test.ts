import { describe, it, expect } from 'vitest'
import { computeBaseReport } from '../engine'
import type { GameData } from '../../gamedata/types'

/**
 * Integration test for workforce expansion overhead feature.
 * 
 * Specification:
 * Large workforce causes 1% extra consumption for every 1000 workforce burden above 2000 workforce.
 * 
 * Examples:
 * - 2000 workforce or less: No extra consumption (multiplier = 1.0)
 * - 3000 workforce: 1% extra consumption (multiplier = 1.01)
 * - 4000 workforce: 2% extra consumption (multiplier = 1.02)
 * - 2100 workforce: 0.1% extra consumption (multiplier = 1.001)
 */

// Minimal mock GameData for testing
const mockGameData: GameData = {
  systems: [],
  planets: [
    {
      id: 1,
      systemId: 1,
      name: 'Test Planet',
      fertility: 100,
      tier: 1,
      x: 0,
      y: 0,
      materials: [],
      type: 'test',
      size: 1,
    },
  ],
  materials: [
    {
      id: 100,
      name: 'Rations',
      calculatedPriceInCents: 1000, // $10.00
      tier: 1,
      weight: 1,
    },
    {
      id: 101,
      name: 'Drinking Water',
      calculatedPriceInCents: 500, // $5.00
      tier: 1,
      weight: 1,
    },
    {
      id: 102,
      name: 'Tools',
      calculatedPriceInCents: 2000, // $20.00
      tier: 1,
      weight: 1,
    },
  ],
  buildings: [
    {
      id: 10,
      name: 'Housing T1',
      description: 'Worker housing',
      constructionMaterials: [],
      specialization: 9, // Residential
      tier: 1,
      recipesIds: null,
      workersHousing: { worker: 100, technician: 0, engineer: 0, scientist: 0 },
      workersNeeded: null,
    },
    {
      id: 20,
      name: 'Factory',
      description: 'Production building',
      constructionMaterials: [],
      specialization: 6, // Manufacturing
      tier: 1,
      recipesIds: [1001],
      workersHousing: null,
      workersNeeded: { worker: 50, technician: 0, engineer: 0, scientist: 0 },
    },
  ],
  recipes: [
    {
      id: 1001,
      producedInId: 20,
      timeMinutes: 60,
      output: { id: 200, amount: 10 },
      inputs: [],
      reqTech: 0,
    },
  ],
  workers: [
    {
      type: 1, // Worker tier
      consumables: [
        { matId: 100, amount: 10, essential: true }, // Rations: 1 per 100 workers per day
        { matId: 101, amount: 10, essential: true }, // Water: 1 per 100 workers per day
        { matId: 102, amount: 10, essential: true }, // Tools: 1 per 100 workers per day
      ],
    },
    {
      type: 2, // Technician tier
      consumables: [],
    },
    {
      type: 3, // Engineer tier
      consumables: [],
    },
    {
      type: 4, // Scientist tier
      consumables: [],
    },
  ],
}

describe('Workforce Expansion Overhead', () => {
  it('should apply no overhead when workforce is at 2000', () => {
    // Setup: 40 factories × 50 workers = 2000 workforce
    const report = computeBaseReport(mockGameData, {
      assignment: {
        planetId: 1,
        buildings: [
          { buildingId: 10, level: 20, count: 1 }, // 2000 housing
          { buildingId: 20, level: 1, count: 40 }, // 40 factories × 50 workers = 2000 required
        ],
        recipes: [{ recipeId: 1001, count: 40 }],
      },
      horizonDays: 1,
      options: {
        globalWorkforceBurden: 2000,
      },
    })

    // Workforce should be 2000
    const workerSummary = report.workforceSummary.find((w) => w.tier === 1)
    expect(workerSummary?.required).toBeCloseTo(2000, 0)

    // Check worker consumption - should be base amount (no multiplier)
    // 2000 workers / 100 = 20 groups
    // Each consumable: 1 per group per day = 20 per day
    const rationConsumption = report.workers.find((w) => w.materialId === 100)
    expect(rationConsumption?.consumptionPerDay).toBeCloseTo(20, 1)
  })

  it('should apply 1% overhead when workforce is at 3000', () => {
    // Setup: 60 factories × 50 workers = 3000 workforce
    // Expected multiplier: 1 + ((3000 - 2000) / 1000) * 0.01 = 1.01
    const report = computeBaseReport(mockGameData, {
      assignment: {
        planetId: 1,
        buildings: [
          { buildingId: 10, level: 30, count: 1 }, // 3000 housing
          { buildingId: 20, level: 1, count: 60 }, // 60 factories × 50 workers = 3000 required
        ],
        recipes: [{ recipeId: 1001, count: 60 }],
      },
      horizonDays: 1,
      options: {
        globalWorkforceBurden: 3000,
      },
    })

    // Workforce should be 3000
    const workerSummary = report.workforceSummary.find((w) => w.tier === 1)
    expect(workerSummary?.required).toBeCloseTo(3000, 0)

    // Check worker consumption - should be base amount × 1.01
    // 3000 workers / 100 = 30 groups
    // Each consumable: 1 per group per day × 1.01 = 30.3 per day
    const rationConsumption = report.workers.find((w) => w.materialId === 100)
    expect(rationConsumption?.consumptionPerDay).toBeCloseTo(30.3, 1)
  })

  it('should apply 0.1% overhead when workforce is at 2100', () => {
    // Setup: 42 factories × 50 workers = 2100 workforce
    // Expected multiplier: 1 + ((2100 - 2000) / 1000) * 0.01 = 1.001
    const report = computeBaseReport(mockGameData, {
      assignment: {
        planetId: 1,
        buildings: [
          { buildingId: 10, level: 21, count: 1 }, // 2100 housing
          { buildingId: 20, level: 1, count: 42 }, // 42 factories × 50 workers = 2100 required
        ],
        recipes: [{ recipeId: 1001, count: 42 }],
      },
      horizonDays: 1,
      options: {
        globalWorkforceBurden: 2100,
      },
    })

    // Workforce should be 2100
    const workerSummary = report.workforceSummary.find((w) => w.tier === 1)
    expect(workerSummary?.required).toBeCloseTo(2100, 0)

    // Check worker consumption - should be base amount × 1.001
    // 2100 workers / 100 = 21 groups
    // Each consumable: 1 per group per day × 1.001 = 21.021 per day
    const rationConsumption = report.workers.find((w) => w.materialId === 100)
    expect(rationConsumption?.consumptionPerDay).toBeCloseTo(21.021, 2)
  })

  it('should apply 2% overhead when workforce is at 4000', () => {
    // Setup: 80 factories × 50 workers = 4000 workforce
    // Expected multiplier: 1 + ((4000 - 2000) / 1000) * 0.01 = 1.02
    const report = computeBaseReport(mockGameData, {
      assignment: {
        planetId: 1,
        buildings: [
          { buildingId: 10, level: 40, count: 1 }, // 4000 housing
          { buildingId: 20, level: 1, count: 80 }, // 80 factories × 50 workers = 4000 required
        ],
        recipes: [{ recipeId: 1001, count: 80 }],
      },
      horizonDays: 1,
      options: {
        globalWorkforceBurden: 4000,
      },
    })

    // Workforce should be 4000
    const workerSummary = report.workforceSummary.find((w) => w.tier === 1)
    expect(workerSummary?.required).toBeCloseTo(4000, 0)

    // Check worker consumption - should be base amount × 1.02
    // 4000 workers / 100 = 40 groups
    // Each consumable: 1 per group per day × 1.02 = 40.8 per day
    const rationConsumption = report.workers.find((w) => w.materialId === 100)
    expect(rationConsumption?.consumptionPerDay).toBeCloseTo(40.8, 1)
  })

  it('should apply no overhead when workforce is below 2000', () => {
    // Setup: 30 factories × 50 workers = 1500 workforce
    const report = computeBaseReport(mockGameData, {
      assignment: {
        planetId: 1,
        buildings: [
          { buildingId: 10, level: 15, count: 1 }, // 1500 housing
          { buildingId: 20, level: 1, count: 30 }, // 30 factories × 50 workers = 1500 required
        ],
        recipes: [{ recipeId: 1001, count: 30 }],
      },
      horizonDays: 1,
      options: {
        globalWorkforceBurden: 1500,
      },
    })

    // Workforce should be 1500
    const workerSummary = report.workforceSummary.find((w) => w.tier === 1)
    expect(workerSummary?.required).toBeCloseTo(1500, 0)

    // Check worker consumption - should be base amount (no multiplier)
    // 1500 workers / 100 = 15 groups
    // Each consumable: 1 per group per day = 15 per day
    const rationConsumption = report.workers.find((w) => w.materialId === 100)
    expect(rationConsumption?.consumptionPerDay).toBeCloseTo(15, 1)
  })

  it('should correctly calculate overhead across multiple bases', () => {
    // Simulate scenario: Base 1 has 1000 workers, Base 2 has 1100 workers
    // Total = 2100 workers, overhead = 0.1%
    
    // Base 1 report (with global workforce of 2100)
    const base1Report = computeBaseReport(mockGameData, {
      assignment: {
        planetId: 1,
        buildings: [
          { buildingId: 10, level: 10, count: 1 }, // 1000 housing
          { buildingId: 20, level: 1, count: 20 }, // 20 factories × 50 workers = 1000 required
        ],
        recipes: [{ recipeId: 1001, count: 20 }],
      },
      horizonDays: 1,
      options: {
        globalWorkforceBurden: 2100, // Total across all bases
      },
    })

    // Base 2 report (with same global workforce of 2100)
    const base2Report = computeBaseReport(mockGameData, {
      assignment: {
        planetId: 1,
        buildings: [
          { buildingId: 10, level: 11, count: 1 }, // 1100 housing
          { buildingId: 20, level: 1, count: 22 }, // 22 factories × 50 workers = 1100 required
        ],
        recipes: [{ recipeId: 1001, count: 22 }],
      },
      horizonDays: 1,
      options: {
        globalWorkforceBurden: 2100, // Total across all bases
      },
    })

    // Both bases should use the same multiplier: 1.001
    // Base 1: 1000 workers / 100 = 10 groups × 1.001 = 10.01 per day
    const base1Rations = base1Report.workers.find((w) => w.materialId === 100)
    expect(base1Rations?.consumptionPerDay).toBeCloseTo(10.01, 2)

    // Base 2: 1100 workers / 100 = 11 groups × 1.001 = 11.011 per day
    const base2Rations = base2Report.workers.find((w) => w.materialId === 100)
    expect(base2Rations?.consumptionPerDay).toBeCloseTo(11.011, 2)

    // Total consumption: 10.01 + 11.011 = 21.021
    const totalConsumption = (base1Rations?.consumptionPerDay ?? 0) + (base2Rations?.consumptionPerDay ?? 0)
    expect(totalConsumption).toBeCloseTo(21.021, 2)
  })
})
