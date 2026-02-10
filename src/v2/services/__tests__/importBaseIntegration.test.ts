import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePlayerBases } from '../playerBases'
import { fetchGameBaseDetails } from '@/v2/services/api/warehouseService'

// Mock GameData with buildings and recipes for integration
const mockGameData = {
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
  materials: [],
  buildings: [
    {
      id: 10,
      name: 'Manuf A',
      description: 'Test manuf',
      constructionMaterials: [],
      specialization: 2,
      tier: 1,
      recipesIds: null,
      workersHousing: { worker: 0, technician: 0, engineer: 0, scientist: 0 },
      workersNeeded: { worker: 0, technician: 0, engineer: 0, scientist: 0 },
    },
  ],
  recipes: [
    {
      id: 200,
      producedInId: 10,
      producedInName: 'Manuf A',
      reqTech: 0,
      timeMinutes: 10,
      type: 1,
      inputs: [],
      output: { id: 1000, name: 'Product', amount: 1 },
    },
  ],
  workers: [],
}

beforeEach(() => {
  localStorage.clear()
  // reset global fetch mock
  vi.restoreAllMocks()
})

describe('Import Base Integration', () => {
  it('fetchGameBaseDetails returns base details from direct endpoint', async () => {
    // Mock fetch to return direct endpoint with actual API structure
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/public/company/base/101')) {
        return {
          ok: true,
          json: async () => ({
            id: 101,
            name: 'Test Base',
            planetId: 1,
            warehouseId: 201,
            buildingSlots: [{ status: 2, building: { type: 10, level: 2 } }],
            productionOrders: [{ rId: 200, amt: 3 }],
          }),
        }
      }
      return { ok: false, status: 404, statusText: 'Not Found' }
    }))

    const resp = await fetchGameBaseDetails('FAKEKEY', 101, 'g2')
    expect(resp.data).toBeDefined()
    expect(resp.data.id).toBe(101)
    expect(Array.isArray(resp.data.buildingSlots)).toBe(true)
    expect(Array.isArray(resp.data.productionOrders)).toBe(true)
  })

  it('imports buildings and aggregates production orders into player base', async () => {
    const fresh = usePlayerBases(mockGameData)

    // Sync base meta from API (simulate existing base)
    fresh.syncBaseFromApi({ id: 101, name: 'API Base', planetId: 1, warehouseId: 201 })

    // Create payload with actual API structure: one building, one production order
    const payload = {
      id: 101,
      name: 'API Base',
      planetId: 1,
      warehouseId: 201,
      buildingSlots: [
        { buildingId: 10, slot: 0, level: 2 },
      ],
      productionOrders: [
        { recipeId: 200, quantity: 1 },
      ],
    }

    const base = fresh.state.value.bases.find((b) => b.gameBaseId === 101)!
    expect(base).toBeDefined()

    const imported = fresh.importBaseFromApiPayload(base.id, payload)
    expect(imported).toBe(true)

    const updated = fresh.state.value.bases.find((b) => b.id === base.id)!
    // One building imported
    expect(updated.buildings).toHaveLength(1)
    expect(updated.buildings[0].buildingId).toBe(10)
    expect(updated.buildings[0].level).toBe(2)

    // One recipe imported (addRecipe called once)
    expect(updated.recipes).toHaveLength(1)
    expect(updated.recipes[0].recipeId).toBe(200)
    expect(updated.recipes[0].count).toBe(1)
  })

  it('bumps planned levels and counts to current on import', () => {
    const fresh = usePlayerBases(mockGameData)

    fresh.syncBaseFromApi({ id: 101, name: 'API Base', planetId: 1, warehouseId: 201 })

    const base = fresh.state.value.bases.find((b) => b.gameBaseId === 101)!

    base.buildings = [
      { id: 'planned-1', buildingId: 10, level: 1, slotId: 0 },
    ]
    base.recipes = [
      { id: 'planned-recipe-1', recipeId: 200, count: 1 },
    ]

    const payload = {
      id: 101,
      name: 'API Base',
      planetId: 1,
      warehouseId: 201,
      buildingSlots: [
        { buildingId: 10, slot: 0, level: 3 },
      ],
      productionOrders: [
        { recipeId: 200, quantity: 1 },
        { recipeId: 200, quantity: 1 },
        { recipeId: 200, quantity: 1 },
      ],
    }

    const imported = fresh.importBaseFromApiPayload(base.id, payload)
    expect(imported).toBe(true)

    const updated = fresh.state.value.bases.find((b) => b.id === base.id)!
    expect(updated.buildings[0].level).toBe(3)
    expect(updated.recipes[0].currentCount).toBe(3)
    expect(updated.recipes[0].count).toBe(3)
  })
})
