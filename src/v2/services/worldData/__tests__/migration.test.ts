import { describe, it, expect, beforeEach, vi } from 'vitest'
import { migrateToV2, hasV1Data } from '../migration'
import { getStorageVersion, getActiveWorld, loadWorldData } from '../storage'

describe('WorldData Migration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('hasV1Data', () => {
    it('should return false when no V1 data exists', () => {
      expect(hasV1Data()).toBe(false)
    })

    it('should return true when V1 bases exist', () => {
      localStorage.setItem('gt:v2:player:bases:v2', JSON.stringify({ bases: [] }))
      expect(hasV1Data()).toBe(true)
    })

    it('should return false for empty V1 data', () => {
      localStorage.setItem('gt:v2:player:bases:v2', '')
      expect(hasV1Data()).toBe(false)
    })
  })

  describe('migrateToV2', () => {
    it('should skip migration if already on V2', () => {
      localStorage.setItem('gt:v2:version', '2')
      const consoleLog = vi.spyOn(console, 'log')
      
      migrateToV2()
      
      expect(consoleLog).toHaveBeenCalledWith('[Migration] Already on V2, skipping migration')
      consoleLog.mockRestore()
    })

    it('should migrate V1 to V2 with API key preserved', () => {
      // Set up V1 data
      localStorage.setItem('gt:v2:api:key', 'old-api-key')
      localStorage.setItem('gt:v2:api:world', 'g1')
      localStorage.setItem('gt:v2:player:bases:v2', JSON.stringify({ bases: [] }))
      
      migrateToV2()
      
      // Check version is set
      expect(getStorageVersion()).toBe('2')
      
      // Check active world is preserved
      expect(getActiveWorld()).toBe('g1')
      
      // Check API key is preserved in world data
      const worldData = loadWorldData('g1')
      expect(worldData.apiKey).toBe('old-api-key')
      
      // Check old keys are removed
      expect(localStorage.getItem('gt:v2:api:key')).toBeNull()
      expect(localStorage.getItem('gt:v2:player:bases:v2')).toBeNull()
    })

    it('should migrate to default world if no world set', () => {
      localStorage.setItem('gt:v2:api:key', 'test-key')
      
      migrateToV2()
      
      expect(getActiveWorld()).toBe('g2')
      const worldData = loadWorldData('g2')
      expect(worldData.apiKey).toBe('test-key')
    })

    it('should handle migration without API key', () => {
      localStorage.setItem('gt:v2:player:bases:v2', JSON.stringify({ bases: [] }))
      
      migrateToV2()
      
      expect(getStorageVersion()).toBe('2')
      expect(getActiveWorld()).toBe('g2')
    })

    it('should clear all V1 data after migration', () => {
      localStorage.setItem('gt:v2:api:key', 'key')
      localStorage.setItem('gt:v2:api:world', 'g1')
      localStorage.setItem('gt:v2:player:bases:v2', '{}')
      localStorage.setItem('gt:v2:random:old:key', 'test')
      
      migrateToV2()
      
      // Old keys should be gone
      expect(localStorage.getItem('gt:v2:api:key')).toBeNull()
      expect(localStorage.getItem('gt:v2:api:world')).toBeNull()
      expect(localStorage.getItem('gt:v2:player:bases:v2')).toBeNull()
      expect(localStorage.getItem('gt:v2:random:old:key')).toBeNull()
      
      // New keys should exist
      expect(localStorage.getItem('gt:v2:version')).toBe('2')
      expect(localStorage.getItem('gt:v2:activeWorld')).toBeTruthy()
    })
  })
})
