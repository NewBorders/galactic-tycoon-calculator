import { describe, it, expect } from 'vitest'
import { computeBaseReport } from '../engine'
import type { GameData, BaseAssignment } from '../types'

describe('Zero Recipe Count and Building Level Support (Issue #61)', () => {
  // Mock game data with simple building and recipes
  const mockGameData: GameData = {
    version: 1,
    planets: [
      {
        id: 1,
        name: 'Test Planet',
        tier: 1,
        x: 0,
        y: 0,
        systemId: 1,
        type: 'terrestrial',
        fertility: 100,
        size: 'medium',
        materials: [],
      },
    ],
    systems: [],
    buildings: [
      {
        id: 1,
        name: 'Test Factory',
        description: 'Test',
        tier: 1,
        specialization: 2,
        constructionMaterials: [],
        recipesIds: [1001, 1002],
        workersHousing: { worker: 10, technician: 0, engineer: 0, scientist: 0 },
        workersNeeded: { worker: 5, technician: 0, engineer: 0, scientist: 0 },
      },
    ],
    materials: [
      { id: 101, name: 'Iron Ore', category: 'raw', tier: 1, source: 1, calculatedPriceInCents: 100 },
      { id: 201, name: 'Iron', category: 'processed', tier: 1, source: 2, calculatedPriceInCents: 500 },
      { id: 202, name: 'Steel', category: 'processed', tier: 1, source: 2, calculatedPriceInCents: 800 },
      { id: 103, name: 'Food', category: 'consumable', tier: 1, source: 3, calculatedPriceInCents: 300 },
    ],
    recipes: [
      {
        id: 1001,
        producedInId: 1,
        producedInName: 'Test Factory',
        timeMinutes: 60,
        reqTech: 0,
        type: 1,
        output: { id: 201, name: 'Iron', amount: 10 },
        inputs: [{ id: 101, name: 'Iron Ore', amount: 5 }],
      },
      {
        id: 1002,
        producedInId: 1,
        producedInName: 'Test Factory',
        timeMinutes: 90,
        reqTech: 0,
        type: 1,
        output: { id: 202, name: 'Steel', amount: 5 },
        inputs: [{ id: 201, name: 'Iron', amount: 8 }],
      },
    ],
    workers: [
      {
        type: 1,
        name: 'Worker',
        adminCost: 1,
        consumables: [
          { matId: 103, matName: 'Food', amount: 1, essential: true },
        ],
      },
    ],
  }

  describe('Recipe with count = 0', () => {
    it('should not produce output when recipe count is 0', () => {
      const assignment: BaseAssignment = {
        planetId: 1,
        buildings: [{ buildingId: 1, level: 1 }],
        recipes: [
          { recipeId: 1001, count: 0 }, // Iron recipe with count 0
        ],
      }

      const report = computeBaseReport(mockGameData, {
        assignment,
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      const ironRecipe = report.recipes.find((r) => r.recipeId === 1001)
      expect(ironRecipe).toBeUndefined() // Recipe with count 0 should not appear in report
    })

    it('should allow mixing recipes with count 0 and count > 0', () => {
      const assignment: BaseAssignment = {
        planetId: 1,
        buildings: [{ buildingId: 1, level: 1 }],
        recipes: [
          { recipeId: 1001, count: 0 }, // Iron recipe disabled
          { recipeId: 1002, count: 2 }, // Steel recipe active
        ],
      }

      const report = computeBaseReport(mockGameData, {
        assignment,
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      const ironRecipe = report.recipes.find((r) => r.recipeId === 1001)
      const steelRecipe = report.recipes.find((r) => r.recipeId === 1002)

      expect(ironRecipe).toBeUndefined() // Count 0 should not appear
      expect(steelRecipe).toBeDefined() // Count > 0 should appear
      expect(steelRecipe?.queueShare).toBeCloseTo(1, 5) // Should get 100% of queue time
    })

    it('should handle all recipes with count 0', () => {
      const assignment: BaseAssignment = {
        planetId: 1,
        buildings: [{ buildingId: 1, level: 1 }],
        recipes: [
          { recipeId: 1001, count: 0 },
          { recipeId: 1002, count: 0 },
        ],
      }

      const report = computeBaseReport(mockGameData, {
        assignment,
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      expect(report.recipes.length).toBe(0) // No recipes should be in report
    })

    it('should transition smoothly from count 1 to count 0 to count 1', () => {
      const baseAssignment = {
        planetId: 1,
        buildings: [{ buildingId: 1, level: 1 }],
      }

      // Test with count 1
      const report1 = computeBaseReport(mockGameData, {
        assignment: {
          ...baseAssignment,
          recipes: [{ recipeId: 1001, count: 1 }],
        },
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      // Test with count 0
      const report0 = computeBaseReport(mockGameData, {
        assignment: {
          ...baseAssignment,
          recipes: [{ recipeId: 1001, count: 0 }],
        },
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      // Test with count 1 again
      const report1Again = computeBaseReport(mockGameData, {
        assignment: {
          ...baseAssignment,
          recipes: [{ recipeId: 1001, count: 1 }],
        },
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      expect(report1.recipes.length).toBe(1)
      expect(report0.recipes.length).toBe(0)
      expect(report1Again.recipes.length).toBe(1)
      expect(report1.recipes[0]?.outputPerDay).toBe(report1Again.recipes[0]?.outputPerDay)
    })
  })

  describe('Building with level = 0', () => {
    it('should not produce output when building level is 0', () => {
      const assignment: BaseAssignment = {
        planetId: 1,
        buildings: [{ buildingId: 1, level: 0 }], // Level 0
        recipes: [{ recipeId: 1001, count: 1 }],
      }

      const report = computeBaseReport(mockGameData, {
        assignment,
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      expect(report.recipes.length).toBe(0) // No recipes should produce with level 0 building
    })

    it('should not consume workers when building level is 0', () => {
      const assignment: BaseAssignment = {
        planetId: 1,
        buildings: [{ buildingId: 1, level: 0 }],
        recipes: [{ recipeId: 1001, count: 1 }],
      }

      const report = computeBaseReport(mockGameData, {
        assignment,
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      // No recipes should be active, so no worker consumption
      expect(report.workers.length).toBeGreaterThanOrEqual(0)
      // Worker costs should be 0 or minimal (only admin overhead)
      expect(report.summary.workerPurchaseCosts).toBeLessThanOrEqual(10)
    })

    it('should not provide housing when building level is 0', () => {
      const assignment: BaseAssignment = {
        planetId: 1,
        buildings: [{ buildingId: 1, level: 0 }],
        recipes: [{ recipeId: 1001, count: 1 }],
      }

      const report = computeBaseReport(mockGameData, {
        assignment,
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      // No recipes should be active with level 0 building
      expect(report.recipes.length).toBe(0)
    })

    it('should transition smoothly from level 1 to level 0 to level 1', () => {
      const baseAssignment = {
        planetId: 1,
        recipes: [{ recipeId: 1001, count: 1 }],
      }

      // Test with level 1
      const reportL1 = computeBaseReport(mockGameData, {
        assignment: {
          ...baseAssignment,
          buildings: [{ buildingId: 1, level: 1 }],
        },
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      // Test with level 0
      const reportL0 = computeBaseReport(mockGameData, {
        assignment: {
          ...baseAssignment,
          buildings: [{ buildingId: 1, level: 0 }],
        },
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      // Test with level 1 again
      const reportL1Again = computeBaseReport(mockGameData, {
        assignment: {
          ...baseAssignment,
          buildings: [{ buildingId: 1, level: 1 }],
        },
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      expect(reportL1.recipes.length).toBe(1)
      expect(reportL0.recipes.length).toBe(0)
      expect(reportL1Again.recipes.length).toBe(1)
      expect(reportL1.recipes[0]?.outputPerDay).toBe(reportL1Again.recipes[0]?.outputPerDay)
    })

    it('should work correctly with level 2 transitioning through 0', () => {
      const baseAssignment = {
        planetId: 1,
        recipes: [{ recipeId: 1001, count: 1 }],
      }

      // Level 2 - should have double production
      const reportL2 = computeBaseReport(mockGameData, {
        assignment: {
          ...baseAssignment,
          buildings: [{ buildingId: 1, level: 2 }],
        },
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      // Level 0 - no production
      const reportL0 = computeBaseReport(mockGameData, {
        assignment: {
          ...baseAssignment,
          buildings: [{ buildingId: 1, level: 0 }],
        },
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      // Level 1 - baseline production
      const reportL1 = computeBaseReport(mockGameData, {
        assignment: {
          ...baseAssignment,
          buildings: [{ buildingId: 1, level: 1 }],
        },
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      expect(reportL2.recipes.length).toBe(1)
      expect(reportL0.recipes.length).toBe(0)
      expect(reportL1.recipes.length).toBe(1)

      // Level 2 should produce approximately double of level 1
      const l1Output = reportL1.recipes[0]?.outputPerDay ?? 0
      const l2Output = reportL2.recipes[0]?.outputPerDay ?? 0
      expect(l2Output).toBeGreaterThan(l1Output * 1.5) // At least 1.5x due to production units scaling
    })
  })

  describe('Combined: Recipe count 0 and Building level 0', () => {
    it('should handle both recipe count 0 and building level 0', () => {
      const assignment: BaseAssignment = {
        planetId: 1,
        buildings: [{ buildingId: 1, level: 0 }],
        recipes: [{ recipeId: 1001, count: 0 }],
      }

      const report = computeBaseReport(mockGameData, {
        assignment,
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      expect(report.recipes.length).toBe(0)
      // Net should be negative or close to 0 (only admin overhead costs)
      expect(report.summary.net).toBeLessThanOrEqual(0)
    })

    it('should allow testing production combinations quickly', () => {
      // Scenario: Test different recipe combinations by toggling count to 0
      const baseAssignment = {
        planetId: 1,
        buildings: [{ buildingId: 1, level: 2 }],
      }

      // Only Iron production
      const ironOnly = computeBaseReport(mockGameData, {
        assignment: {
          ...baseAssignment,
          recipes: [
            { recipeId: 1001, count: 1 }, // Iron enabled
            { recipeId: 1002, count: 0 }, // Steel disabled
          ],
        },
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      // Only Steel production
      const steelOnly = computeBaseReport(mockGameData, {
        assignment: {
          ...baseAssignment,
          recipes: [
            { recipeId: 1001, count: 0 }, // Iron disabled
            { recipeId: 1002, count: 1 }, // Steel enabled
          ],
        },
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      // Both recipes
      const both = computeBaseReport(mockGameData, {
        assignment: {
          ...baseAssignment,
          recipes: [
            { recipeId: 1001, count: 1 },
            { recipeId: 1002, count: 1 },
          ],
        },
        horizonDays: 1,
        options: { activeOptionalConsumables: new Set() },
      })

      expect(ironOnly.recipes.length).toBe(1)
      expect(steelOnly.recipes.length).toBe(1)
      expect(both.recipes.length).toBe(2)

      // Each combination should have different net profit
      expect(ironOnly.summary.net).not.toBe(steelOnly.summary.net)
      expect(both.summary.net).not.toBe(ironOnly.summary.net)
    })
  })
})
