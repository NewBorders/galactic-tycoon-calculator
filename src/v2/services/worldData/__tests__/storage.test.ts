import { describe, it, expect, beforeEach } from 'vitest'
import {
  createEmptyWorldData,
  loadWorldData,
  saveWorldData,
  getActiveWorld,
  setActiveWorld,
  clearAllWorldData,
  STORAGE_KEYS,
} from '../storage'
import type { WorldData } from '../types'

describe('WorldData Storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('createEmptyWorldData', () => {
    it('should create empty world data structure for G1', () => {
      const data = createEmptyWorldData('g1')
      
      expect(data.worldId).toBe('g1')
      expect(data.apiKey).toBe('')
      expect(data.lastSync).toEqual({})
      expect(data.current.bases).toEqual([])
      expect(data.current.technology).toEqual({})
      expect(data.current.fetchedAt).toBe(0)
      expect(data.planning).toBeNull()
      expect(data.uiState).toEqual({ basesOpen: {}, sections: {} })
    })

    it('should create empty world data with API key', () => {
      const data = createEmptyWorldData('g2', 'test-api-key')
      
      expect(data.worldId).toBe('g2')
      expect(data.apiKey).toBe('test-api-key')
    })
  })

  describe('saveWorldData and loadWorldData', () => {
    it('should save and load world data correctly', () => {
      const data = createEmptyWorldData('g1', 'my-key')
      data.current.bases = [
        {
          id: 'base-1',
          planetId: 1,
          name: 'Alpha Station',
          buildings: [],
          recipes: [],
        },
      ] as any
      
      const saved = saveWorldData(data)
      expect(saved).toBe(true)
      
      const loaded = loadWorldData('g1')
      expect(loaded.worldId).toBe('g1')
      expect(loaded.apiKey).toBe('my-key')
      expect(loaded.current.bases).toHaveLength(1)
      expect(loaded.current.bases[0].name).toBe('Alpha Station')
    })

    it('should return empty data if nothing saved', () => {
      const loaded = loadWorldData('g2')
      
      expect(loaded.worldId).toBe('g2')
      expect(loaded.apiKey).toBe('')
      expect(loaded.current.bases).toEqual([])
    })

    it('should handle corrupt data gracefully', () => {
      localStorage.setItem(STORAGE_KEYS.worldData('g1'), 'invalid json')
      
      const loaded = loadWorldData('g1')
      expect(loaded.worldId).toBe('g1')
      expect(loaded.current.bases).toEqual([])
    })

    it('should isolate G1 and G2 data', () => {
      const g1Data = createEmptyWorldData('g1', 'g1-key')
      g1Data.current.bases = [{ id: 'g1-base', planetId: 1, buildings: [], recipes: [] }] as any
      
      const g2Data = createEmptyWorldData('g2', 'g2-key')
      g2Data.current.bases = [{ id: 'g2-base', planetId: 2, buildings: [], recipes: [] }] as any
      
      saveWorldData(g1Data)
      saveWorldData(g2Data)
      
      const loadedG1 = loadWorldData('g1')
      const loadedG2 = loadWorldData('g2')
      
      expect(loadedG1.apiKey).toBe('g1-key')
      expect(loadedG1.current.bases[0].id).toBe('g1-base')
      
      expect(loadedG2.apiKey).toBe('g2-key')
      expect(loadedG2.current.bases[0].id).toBe('g2-base')
    })
  })

  describe('activeWorld', () => {
    it('should default to g2', () => {
      const world = getActiveWorld()
      expect(world).toBe('g2')
    })

    it('should save and load active world', () => {
      setActiveWorld('g1')
      const world = getActiveWorld()
      expect(world).toBe('g1')
    })

    it('should handle invalid world gracefully', () => {
      localStorage.setItem(STORAGE_KEYS.activeWorld, 'invalid')
      const world = getActiveWorld()
      expect(world).toBe('g2')
    })
  })

  describe('clearAllWorldData', () => {
    it('should clear all gt:v2: keys', () => {
      localStorage.setItem('gt:v2:g1:data', 'test')
      localStorage.setItem('gt:v2:g2:data', 'test')
      localStorage.setItem('gt:v2:version', '2')
      localStorage.setItem('other-key', 'keep')
      
      clearAllWorldData()
      
      expect(localStorage.getItem('gt:v2:g1:data')).toBeNull()
      expect(localStorage.getItem('gt:v2:g2:data')).toBeNull()
      expect(localStorage.getItem('gt:v2:version')).toBeNull()
      expect(localStorage.getItem('other-key')).toBe('keep')
    })
  })
})
