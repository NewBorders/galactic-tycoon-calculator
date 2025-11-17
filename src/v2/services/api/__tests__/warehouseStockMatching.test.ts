import { describe, it, expect } from 'vitest'
import type { PlayerBase } from '@/v2/services/playerBases'
import type { WarehouseStockResponse } from '../types'

describe('Warehouse Stock Matching (warehouseId → gameBaseId)', () => {
  /**
   * Test the mapping logic between warehouse responses and player bases
   * Uses gameWarehouseId to match stocks to the correct base
   */
  it('should correctly match warehouse stocks to bases using gameWarehouseId', () => {
    // Setup: player bases with gameWarehouseId
    const bases: PlayerBase[] = [
      {
        id: 'local-base-1',
        planetId: 1,
        name: 'Base 1',
        buildings: [],
        recipes: [],
        gameBaseId: 101,
        gameWarehouseId: 201,
      },
      {
        id: 'local-base-2',
        planetId: 2,
        name: 'Base 2',
        buildings: [],
        recipes: [],
        gameBaseId: 102,
        gameWarehouseId: 202,
      },
    ]

    // Setup: warehouse responses from API (transformed to internal format)
    const warehouseResponses: Array<{ data: WarehouseStockResponse; source: 'api' | 'cache' }> = [
      {
        data: {
          warehouseId: 201, // matches base 1
          items: [
            { materialId: 1, quantity: 100 },
            { materialId: 2, quantity: 200 },
          ],
        },
        source: 'api',
      },
      {
        data: {
          warehouseId: 202, // matches base 2
          items: [
            { materialId: 3, quantity: 300 },
            { materialId: 4, quantity: 400 },
          ],
        },
        source: 'api',
      },
    ]

    // Process: Create mapping from warehouseId to gameBaseId
    const warehouseToBaseId: Record<number, number> = {}
    bases.forEach((b) => {
      if (b.gameWarehouseId && b.gameBaseId) {
        warehouseToBaseId[b.gameWarehouseId] = b.gameBaseId
      }
    })

    // Process: Map warehouse responses to stocks
    const stocks = warehouseResponses.map((w) => {
      const warehouseId = w.data.warehouseId
      const gameBaseId = warehouseToBaseId[warehouseId]
      return {
        gameBaseId: gameBaseId || 0,
        stock: Object.fromEntries(
          (w.data.items ?? []).map((item) => [item.materialId, item.quantity]),
        ),
      }
    })

    // Verify: stocks have correct gameBaseIds
    expect(stocks).toHaveLength(2)
    expect(stocks[0].gameBaseId).toBe(101) // Base 1's gameBaseId
    expect(stocks[0].stock).toEqual({
      '1': 100,
      '2': 200,
    })

    expect(stocks[1].gameBaseId).toBe(102) // Base 2's gameBaseId
    expect(stocks[1].stock).toEqual({
      '3': 300,
      '4': 400,
    })
  })

  it('should handle missing gameWarehouseId gracefully', () => {
    const bases: PlayerBase[] = [
      {
        id: 'local-base-1',
        planetId: 1,
        name: 'Base 1',
        buildings: [],
        recipes: [],
        gameBaseId: 101,
        gameWarehouseId: 201,
      },
      {
        id: 'local-base-2',
        planetId: 2,
        name: 'Base 2 (no warehouse)',
        buildings: [],
        recipes: [],
        gameBaseId: 102,
        // Missing gameWarehouseId - should not be matched
      },
    ]

    const warehouseResponses: Array<{ data: WarehouseStockResponse; source: 'api' | 'cache' }> = [
      {
        data: {
          warehouseId: 201,
          items: [{ materialId: 1, quantity: 100 }],
        },
        source: 'api',
      },
    ]

    const warehouseToBaseId: Record<number, number> = {}
    bases.forEach((b) => {
      if (b.gameWarehouseId && b.gameBaseId) {
        warehouseToBaseId[b.gameWarehouseId] = b.gameBaseId
      }
    })

    const stocks = warehouseResponses.map((w) => {
      const gameBaseId = warehouseToBaseId[w.data.warehouseId]
      return {
        gameBaseId: gameBaseId || 0,
        stock: Object.fromEntries(
          (w.data.items ?? []).map((item) => [item.materialId, item.quantity]),
        ),
      }
    })

    expect(stocks).toHaveLength(1)
    expect(stocks[0].gameBaseId).toBe(101) // Only base 1 is matched
  })

  it('should handle unmatched warehouse responses', () => {
    const bases: PlayerBase[] = [
      {
        id: 'local-base-1',
        planetId: 1,
        name: 'Base 1',
        buildings: [],
        recipes: [],
        gameBaseId: 101,
        gameWarehouseId: 201,
      },
    ]

    // Warehouse response with ID that doesn't match any base
    const warehouseResponses: Array<{ data: WarehouseStockResponse; source: 'api' | 'cache' }> = [
      {
        data: {
          warehouseId: 999, // Does not match any base
          items: [{ materialId: 1, quantity: 100 }],
        },
        source: 'api',
      },
    ]

    const warehouseToBaseId: Record<number, number> = {}
    bases.forEach((b) => {
      if (b.gameWarehouseId && b.gameBaseId) {
        warehouseToBaseId[b.gameWarehouseId] = b.gameBaseId
      }
    })

    const stocks = warehouseResponses.map((w) => {
      const gameBaseId = warehouseToBaseId[w.data.warehouseId]
      return {
        gameBaseId: gameBaseId || 0, // Falls back to 0 when not found
        stock: Object.fromEntries(
          (w.data.items ?? []).map((item) => [item.materialId, item.quantity]),
        ),
      }
    })

    expect(stocks).toHaveLength(1)
    expect(stocks[0].gameBaseId).toBe(0) // Unmatched warehouse gets gameBaseId 0
  })
})
