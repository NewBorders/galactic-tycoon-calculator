import { describe, it, expect, beforeEach } from 'vitest'
import { usePlayerBases } from '../playerBases'
import type { GameData } from '../gamedata/service'

// Mock GameData
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
    {
      id: 2,
      systemId: 1,
      name: 'Another Planet',
      fertility: 100,
      tier: 1,
      x: 10,
      y: 10,
      materials: [],
      type: 'test',
      size: 1,
    },
  ],
  materials: [],
  buildings: [],
  recipes: [],
  workers: [],
}

describe('playerBases API integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test to ensure isolation
    localStorage.clear()
  })
  describe('syncBaseFromApi', () => {
    it('should create new base with API information when base does not exist', () => {
      // Create fresh composable for this test
      const fresh = usePlayerBases(mockGameData)
      fresh.syncBaseFromApi({
        id: 101,
        name: 'API Base',
        planetId: 1,
        warehouseId: 201,
      })

      expect(fresh.state.value.bases).toHaveLength(1)
      const base = fresh.state.value.bases[0]
      expect(base.name).toBe('API Base')
      expect(base.planetId).toBe(1)
      expect(base.gameBaseId).toBe(101)
      expect(base.gameWarehouseId).toBe(201)
    })

    it('should update existing base by gameBaseId', () => {
      const fresh = usePlayerBases(mockGameData)
      fresh.syncBaseFromApi({
        id: 101,
        name: 'First Sync',
        planetId: 1,
        warehouseId: 201,
      })

      fresh.syncBaseFromApi({
        id: 101,
        name: 'Updated Name',
        planetId: 1,
        warehouseId: 202,
      })

      expect(fresh.state.value.bases).toHaveLength(1)
      const base = fresh.state.value.bases[0]
      // Name should NOT be updated because it was already set
      expect(base.name).toBe('First Sync')
      expect(base.gameWarehouseId).toBe(202)
    })

    it('should update existing base by planetId when gameBaseId is not set', () => {
      const fresh = usePlayerBases(mockGameData)
      // Manually add a base without gameBaseId
      fresh.state.value.bases.push({
        id: 'manual-base',
        planetId: 1,
        buildings: [],
        recipes: [],
        stock: {},
      })

      fresh.syncBaseFromApi({
        id: 102,
        name: 'Synced Base',
        planetId: 1,
        warehouseId: 201,
      })

      expect(fresh.state.value.bases).toHaveLength(1)
      const base = fresh.state.value.bases[0]
      expect(base.gameBaseId).toBe(102)
      expect(base.gameWarehouseId).toBe(201)
      expect(base.name).toBe('Synced Base')
    })

    it('should create new base if planetId matches but base already has gameBaseId', () => {
      const fresh = usePlayerBases(mockGameData)
      // Create first base with gameBaseId
      fresh.syncBaseFromApi({
        id: 101,
        name: 'Base 1',
        planetId: 1,
        warehouseId: 201,
      })

      // Sync another base for same planet
      fresh.syncBaseFromApi({
        id: 102,
        name: 'Base 2',
        planetId: 1,
        warehouseId: 202,
      })

      expect(fresh.state.value.bases).toHaveLength(2)
      expect(fresh.state.value.bases[0].gameBaseId).toBe(102)
      expect(fresh.state.value.bases[1].gameBaseId).toBe(101)
    })

    it('should place new API base at top of list', () => {
      const fresh = usePlayerBases(mockGameData)
      // Manually add an existing base
      fresh.state.value.bases.push({
        id: 'manual-1',
        planetId: 2,
        buildings: [],
        recipes: [],
        stock: {},
      })

      fresh.syncBaseFromApi({
        id: 101,
        name: 'API Base',
        planetId: 1,
        warehouseId: 201,
      })

      expect(fresh.state.value.bases).toHaveLength(2)
      expect(fresh.state.value.bases[0].gameBaseId).toBe(101)
      expect(fresh.state.value.bases[1].id).toBe('manual-1')
    })
  })

  describe('updateBaseStockFromApi', () => {
    it('should update stock for base with gameBaseId', () => {
      const fresh = usePlayerBases(mockGameData)
      fresh.syncBaseFromApi({
        id: 101,
        name: 'Test Base',
        planetId: 1,
        warehouseId: 201,
      })

      fresh.updateBaseStockFromApi(101, {
        1: 100,
        2: 200,
        3: 300,
      })

      const base = fresh.state.value.bases[0]
      expect(base.stock).toEqual({
        1: 100,
        2: 200,
        3: 300,
      })
    })

    it('should not update stock if gameBaseId not found', () => {
      const fresh = usePlayerBases(mockGameData)
      fresh.syncBaseFromApi({
        id: 101,
        name: 'Test Base',
        planetId: 1,
        warehouseId: 201,
      })

      const before = fresh.state.value.bases[0].stock

      fresh.updateBaseStockFromApi(999, {
        1: 100,
      })

      const after = fresh.state.value.bases[0].stock
      expect(after).toEqual(before)
    })

    it('should sanitize stock values', () => {
      const fresh = usePlayerBases(mockGameData)
      fresh.syncBaseFromApi({
        id: 101,
        name: 'Test Base',
        planetId: 1,
        warehouseId: 201,
      })

      fresh.updateBaseStockFromApi(101, {
        1: 100,
        2: 200,
        3: -50, // negative values should be ignored
      })

      const base = fresh.state.value.bases[0]
      expect(base.stock).toEqual({
        1: 100,
        2: 200,
      })
    })

    it('should replace stock values on update', () => {
      const fresh = usePlayerBases(mockGameData)
      fresh.syncBaseFromApi({
        id: 101,
        name: 'Test Base',
        planetId: 1,
        warehouseId: 201,
      })

      fresh.updateBaseStockFromApi(101, {
        1: 100,
        2: 200,
      })

      fresh.updateBaseStockFromApi(101, {
        2: 300,
        3: 400,
      })

      const base = fresh.state.value.bases[0]
      expect(base.stock).toEqual({
        2: 300,
        3: 400,
      })
    })
  })

  describe('full API integration flow', () => {
    it('should handle complete workflow: sync bases and then update stocks', () => {
      const fresh = usePlayerBases(mockGameData)

      // Step 1: Sync two bases from API
      fresh.syncBaseFromApi({
        id: 101,
        name: 'Base Alpha',
        planetId: 1,
        warehouseId: 201,
      })

      fresh.syncBaseFromApi({
        id: 102,
        name: 'Base Beta',
        planetId: 2,
        warehouseId: 202,
      })

      expect(fresh.state.value.bases).toHaveLength(2)

      // Step 2: Update stocks for both bases
      fresh.updateBaseStockFromApi(101, {
        1: 500,
        2: 1000,
      })

      fresh.updateBaseStockFromApi(102, {
        1: 750,
        3: 250,
      })

      // Verify final state - note that new bases are unshifted (added to top)
      // so 102 is at index 0 and 101 is at index 1
      const baseAlpha = fresh.state.value.bases.find((b: typeof fresh.state.value.bases[0]) => b.gameBaseId === 101)!
      const baseBeta = fresh.state.value.bases.find((b: typeof fresh.state.value.bases[0]) => b.gameBaseId === 102)!
      expect(baseAlpha.stock).toEqual({ 1: 500, 2: 1000 })
      expect(baseBeta.stock).toEqual({ 1: 750, 3: 250 })
    })
  })
})
