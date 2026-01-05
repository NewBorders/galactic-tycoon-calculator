import { describe, it, expect, beforeEach } from 'vitest'
import { useWorldData, __resetWorldDataState__ } from '../index'
import { clearAllWorldData, setActiveWorld } from '../storage'
import type { PlayerBase } from '../../playerBases'

describe('WorldData Integration', () => {
  beforeEach(() => {
    clearAllWorldData()
    setActiveWorld('g2')
    __resetWorldDataState__() // Reload state after clearing
  })

  describe('useWorldData composable', () => {
    it('should start with empty state for new world', () => {
      const { apiKey, hasApiKey, current, isPlanningActive } = useWorldData()
      
      expect(apiKey.value).toBe('')
      expect(hasApiKey.value).toBe(false)
      expect(current.value.bases).toEqual([])
      expect(isPlanningActive.value).toBe(false)
    })

    it('should set and get API key', () => {
      const { setApiKey, apiKey, hasApiKey } = useWorldData()
      
      setApiKey('my-test-key')
      
      expect(apiKey.value).toBe('my-test-key')
      expect(hasApiKey.value).toBe(true)
    })

    it('should persist API key across reload', () => {
      const { setApiKey } = useWorldData()
      setApiKey('persistent-key')
      
      // Create new instance (simulates reload)
      const { apiKey } = useWorldData()
      
      expect(apiKey.value).toBe('persistent-key')
    })

    it('should update current state', () => {
      const { updateCurrent, current, getLastSync } = useWorldData()
      
      const baseBefore = Date.now()
      
      updateCurrent({
        bases: [
          {
            id: 'base-1',
            planetId: 1,
            name: 'Test Base',
            buildings: [],
            recipes: [],
          },
        ] as PlayerBase[],
      })
      
      expect(current.value.bases).toHaveLength(1)
      expect(current.value.bases[0].name).toBe('Test Base')
      expect(current.value.fetchedAt).toBeGreaterThanOrEqual(baseBefore)
      
      const lastSync = getLastSync('bases')
      expect(lastSync).toBeGreaterThanOrEqual(baseBefore)
    })

    it('should isolate G1 and G2 worlds', () => {
      const { setApiKey: setG2Key, switchWorld, apiKey } = useWorldData()
      
      // Set G2 API key
      setG2Key('g2-key')
      expect(apiKey.value).toBe('g2-key')
      
      // Switch to G1
      switchWorld('g1')
      expect(apiKey.value).toBe('')
      
      // Set G1 API key
      const { setApiKey: setG1Key } = useWorldData()
      setG1Key('g1-key')
      expect(apiKey.value).toBe('g1-key')
      
      // Switch back to G2
      switchWorld('g2')
      expect(apiKey.value).toBe('g2-key')
      
      // Switch to G1 again
      switchWorld('g1')
      expect(apiKey.value).toBe('g1-key')
    })

    it('should track last sync timestamps per entity', () => {
      const { updateCurrent, getLastSync } = useWorldData()
      
      const before = Date.now()
      
      updateCurrent({ bases: [] as PlayerBase[] })
      const basesSync = getLastSync('bases')
      expect(basesSync).toBeGreaterThanOrEqual(before)
      expect(basesSync).toBeLessThanOrEqual(Date.now())
      
      updateCurrent({ technology: {} })
      const techSync = getLastSync('technology')
      expect(techSync).toBeGreaterThanOrEqual(before)
      
      updateCurrent({ warehouseStocks: {} })
      const warehouseSync = getLastSync('warehouse')
      expect(warehouseSync).toBeGreaterThanOrEqual(before)
    })

    it('should return null for non-existent sync', () => {
      const { getLastSync } = useWorldData()
      
      expect(getLastSync('nonexistent')).toBeNull()
    })

    it('should persist data automatically on changes', () => {
      const { setApiKey, apiKey } = useWorldData()
      
      setApiKey('auto-save-key')
      
      // Create new instance without explicit save
      const { apiKey: reloadedKey } = useWorldData()
      expect(reloadedKey.value).toBe('auto-save-key')
    })
  })

  describe('World switching', () => {
    it('should save G2 data before switching to G1', () => {
      const { setApiKey, updateCurrent, switchWorld } = useWorldData()
      
      setApiKey('g2-key')
      updateCurrent({
        bases: [{ id: 'g2-base', planetId: 2, buildings: [], recipes: [] }] as PlayerBase[],
      })
      
      switchWorld('g1')
      
      const { setApiKey: setG1Key, updateCurrent: updateG1 } = useWorldData()
      setG1Key('g1-key')
      updateG1({
        bases: [{ id: 'g1-base', planetId: 1, buildings: [], recipes: [] }] as PlayerBase[],
      })
      
      switchWorld('g2')
      
      const { apiKey, current } = useWorldData()
      expect(apiKey.value).toBe('g2-key')
      expect(current.value.bases[0].id).toBe('g2-base')
    })

    it('should maintain active world state', () => {
      const { switchWorld, activeWorld } = useWorldData()
      
      expect(activeWorld.value).toBe('g2')
      
      switchWorld('g1')
      expect(activeWorld.value).toBe('g1')
      
      switchWorld('g2')
      expect(activeWorld.value).toBe('g2')
    })
  })

  describe('Data integrity', () => {
    it('should maintain data consistency across multiple updates', () => {
      const { updateCurrent, current } = useWorldData()
      
      // Update 1: Add bases
      updateCurrent({
        bases: [
          { id: 'base-1', planetId: 1, buildings: [], recipes: [] },
          { id: 'base-2', planetId: 2, buildings: [], recipes: [] },
        ] as PlayerBase[],
      })
      
      expect(current.value.bases).toHaveLength(2)
      
      // Update 2: Add technology
      updateCurrent({
        technology: { 1: 5, 2: 3 },
      })
      
      expect(current.value.bases).toHaveLength(2) // Bases still there
      expect(current.value.technology).toEqual({ 1: 5, 2: 3 })
    })

    it('should handle partial updates correctly', () => {
      const { updateCurrent, current } = useWorldData()
      
      updateCurrent({
        bases: [{ id: 'base-1', planetId: 1, buildings: [], recipes: [] }] as PlayerBase[],
        technology: { 1: 1 },
      })
      
      // Partial update - only warehouse
      updateCurrent({
        warehouseStocks: { 101: 100 },
      })
      
      // Previous data should be preserved
      expect(current.value.bases).toHaveLength(1)
      expect(current.value.technology).toEqual({ 1: 1 })
      expect(current.value.warehouseStocks).toEqual({ 101: 100 })
    })
  })
})
