import { describe, it, expect } from 'vitest'
import { useGlobalSummary } from '../useGlobalSummary'
import type { PlayerBase } from '@/v2/services/playerBases'
import type { GameData, GdIndex } from '@/v2/services/gamedata/types'

describe('useGlobalSummary', () => {
  // Mock minimal game data
  const mockGameData: GameData = {
    materials: [
      { id: 1, name: 'Iron Ore', shortName: 'FeOre', calculatedPriceInCents: 1000 },
      { id: 2, name: 'Steel', shortName: 'Steel', calculatedPriceInCents: 2000 },
      { id: 3, name: 'Food', shortName: 'Food', calculatedPriceInCents: 500 },
    ],
    recipes: [
      {
        id: 1,
        producedInId: 1,
        output: { id: 2, amount: 1 },
        inputs: [{ id: 1, amount: 2 }],
        timeMinutes: 60,
      },
    ],
    buildings: [
      {
        id: 1,
        name: 'Steel Mill',
        specialization: 1,
        workersNeeded: { worker: 10 },
        workersHousing: { worker: 20 },
      },
    ],
    workers: [
      {
        type: 1,
        name: 'Worker',
        consumables: [
          { matId: 3, amount: 100, essential: true },
        ],
      },
    ],
    planets: [
      { id: 1, name: 'Planet A', fertility: 100, abundance: { 1: 100, 2: 100 } },
    ],
  } as unknown as GameData

  const mockIndex: GdIndex = {
    materials: new Map([[1, mockGameData.materials[0]], [2, mockGameData.materials[1]], [3, mockGameData.materials[2]]]),
    recipes: new Map([[1, mockGameData.recipes[0]]]),
    buildings: new Map([[1, mockGameData.buildings[0]]]),
    workers: new Map([[1, mockGameData.workers[0]]]),
    planets: new Map([[1, mockGameData.planets[0]]]),
  }

  const mockPriceResolver = (materialId: number) => {
    const material = mockGameData.materials.find(m => m.id === materialId)
    return material ? (material.calculatedPriceInCents ?? 0) / 100 : 0
  }

  it('calculates total net profit across all bases', () => {
    const bases: PlayerBase[] = [
      {
        id: 'base1',
        name: 'Base 1',
        planetId: 1,
        buildings: [{ id: 'b1', buildingId: 1, level: 1 }],
        recipes: [{ id: 'r1', recipeId: 1, count: 1 }],
        optionalConsumables: [],
        stock: {},
      },
    ]

    const { totalNetProfit } = useGlobalSummary(
      bases,
      mockGameData,
      mockIndex,
      mockPriceResolver,
      {},
      1,
      24,
      0,
      50
    )

    expect(totalNetProfit.value).toBeDefined()
    expect(typeof totalNetProfit.value).toBe('object')
    expect(typeof totalNetProfit.value.planned).toBe('number')
    expect(typeof totalNetProfit.value.current).toBe('number')
  })

  it('calculates workforce deficit cost', () => {
    const bases: PlayerBase[] = [
      {
        id: 'base1',
        name: 'Base 1',
        planetId: 1,
        buildings: [{ id: 'b1', buildingId: 1, level: 1 }],
        recipes: [{ id: 'r1', recipeId: 1, count: 1 }],
        optionalConsumables: [],
        stock: {},
      },
    ]

    const { totalWorkforceDeficitCost } = useGlobalSummary(
      bases,
      mockGameData,
      mockIndex,
      mockPriceResolver,
      {},
      1,
      24,
      0,
      50
    )

    expect(totalWorkforceDeficitCost.value).toBeDefined()
    expect(typeof totalWorkforceDeficitCost.value).toBe('object')
    expect(typeof totalWorkforceDeficitCost.value.planned).toBe('number')
    expect(typeof totalWorkforceDeficitCost.value.current).toBe('number')
    expect(totalWorkforceDeficitCost.value.planned).toBeGreaterThanOrEqual(0)
    expect(totalWorkforceDeficitCost.value.current).toBeGreaterThanOrEqual(0)
  })

  it('calculates consumption overhead cost for large workforce', () => {
    const bases: PlayerBase[] = [
      {
        id: 'base1',
        name: 'Base 1',
        planetId: 1,
        buildings: [{ id: 'b1', buildingId: 1, level: 1 }],
        recipes: [{ id: 'r1', recipeId: 1, count: 1 }],
        optionalConsumables: [],
        stock: {},
      },
    ]

    // Test with no overhead (below threshold)
    const { totalConsumptionOverheadCost: noOverhead } = useGlobalSummary(
      bases,
      mockGameData,
      mockIndex,
      mockPriceResolver,
      {},
      1,
      24,
      1000 // Below 2000 threshold
    )
    expect(noOverhead.value.current).toBe(0)
    expect(noOverhead.value.planned).toBe(0)

    // Test with overhead (above threshold)
    const { totalConsumptionOverheadCost: withOverhead } = useGlobalSummary(
      bases,
      mockGameData,
      mockIndex,
      mockPriceResolver,
      {},
      1,
      24,
      3000 // Above 2000 threshold
    )
    expect(withOverhead.value.current).toBeGreaterThanOrEqual(0)
    expect(withOverhead.value.planned).toBeGreaterThanOrEqual(0)
  })

  it('identifies materials running out of stock', () => {
    const bases: PlayerBase[] = [
      {
        id: 'base1',
        name: 'Base 1',
        planetId: 1,
        buildings: [{ id: 'b1', buildingId: 1, level: 1 }],
        recipes: [{ id: 'r1', recipeId: 1, count: 1 }],
        optionalConsumables: [],
        stock: {
          1: 100, // Iron Ore with limited stock
        },
      },
    ]

    const { baseSummaries } = useGlobalSummary(
      bases,
      mockGameData,
      mockIndex,
      mockPriceResolver,
      {},
      1,
      24,
      0,
      50
    )

    expect(baseSummaries.value).toHaveLength(1)
    const summary = baseSummaries.value[0]
    expect(summary.materialsRunningOut).toBeDefined()
    expect(Array.isArray(summary.materialsRunningOut)).toBe(true)
  })

  it('identifies materials for selling', () => {
    const bases: PlayerBase[] = [
      {
        id: 'base1',
        name: 'Base 1',
        planetId: 1,
        buildings: [{ id: 'b1', buildingId: 1, level: 1 }],
        recipes: [{ id: 'r1', recipeId: 1, count: 1 }],
        optionalConsumables: [],
        stock: {},
      },
    ]

    const { baseSummaries } = useGlobalSummary(
      bases,
      mockGameData,
      mockIndex,
      mockPriceResolver,
      {},
      1,
      24,
      0,
      50
    )

    expect(baseSummaries.value).toHaveLength(1)
    const summary = baseSummaries.value[0]
    expect(summary.exportMaterials).toBeDefined()
    expect(Array.isArray(summary.exportMaterials)).toBe(true)
    // Materials with positive balance and low local consumption should be for export
    summary.exportMaterials.forEach(material => {
      expect(material.exportPerDay).toBeGreaterThan(0)
    })
  })

  it('aggregates global material production and consumption', () => {
    const bases: PlayerBase[] = [
      {
        id: 'base1',
        name: 'Base 1',
        planetId: 1,
        buildings: [{ id: 'b1', buildingId: 1, level: 1 }],
        recipes: [{ id: 'r1', recipeId: 1, count: 1 }],
        optionalConsumables: [],
        stock: {},
      },
      {
        id: 'base2',
        name: 'Base 2',
        planetId: 1,
        buildings: [{ id: 'b2', buildingId: 1, level: 1 }],
        recipes: [{ id: 'r2', recipeId: 1, count: 1 }],
        optionalConsumables: [],
        stock: {},
      },
    ]

    const { globalMaterials } = useGlobalSummary(
      bases,
      mockGameData,
      mockIndex,
      mockPriceResolver,
      {},
      1,
      24,
      0,
      50
    )

    expect(Array.isArray(globalMaterials.value)).toBe(true)
    globalMaterials.value.forEach(material => {
      expect(material.materialId).toBeDefined()
      expect(material.totalProduction).toBeGreaterThanOrEqual(0)
      expect(material.totalConsumption).toBeGreaterThanOrEqual(0)
      expect(material.netBalance).toBeDefined()
      expect(Array.isArray(material.perBaseBreakdown)).toBe(true)
      expect(material.perBaseBreakdown.length).toBeGreaterThan(0)
    })
  })

  it('applies timeframe factor correctly', () => {
    const bases: PlayerBase[] = [
      {
        id: 'base1',
        name: 'Base 1',
        planetId: 1,
        buildings: [{ id: 'b1', buildingId: 1, level: 1 }],
        recipes: [{ id: 'r1', recipeId: 1, count: 1 }],
        optionalConsumables: [],
        stock: {},
      },
    ]

    const result24h = useGlobalSummary(
      bases,
      mockGameData,
      mockIndex,
      mockPriceResolver,
      {},
      1,
      24,
      0,
      50
    )

    const result48h = useGlobalSummary(
      bases,
      mockGameData,
      mockIndex,
      mockPriceResolver,
      {},
      1,
      48,
      0,
      50
    )

    // 48h should be approximately 2x the 24h values
    const ratio = result48h.totalNetProfit.value.planned / result24h.totalNetProfit.value.planned
    expect(ratio).toBeCloseTo(2, 0)
  })
})
