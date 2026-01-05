import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { loadGameData, buildIndex } from '../gameDataRepository'
import * as apiKeyManager from '../../api/apiKeyManager'
import * as extractRaw from '../extractRawGameData'
import type { GameData, GameDataRaw } from '../types'

describe('Game Data Refresh - Integration Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset any mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('loadGameData with force=true', () => {
    it('should refresh game data even when cache exists', async () => {
      // Set up initial mock world
      vi.spyOn(apiKeyManager, 'getWorld').mockReturnValue('g2')

      // Create mock gamedata with minimal structure
      const mockGameData: GameData = {
        materials: [{ id: 1, name: 'Test Material', tier: 1, researchable: false }],
        buildings: [{ id: 1, name: 'Test Building', specialization: 1, recipe_categories: [] }],
        planets: [{ id: 1, name: 'Earth', systemId: 1, abundance: 0, fertility: 0 }],
        systems: [{ id: 1, name: 'Sol' }],
        recipes: [{ id: 1, name: 'Test Recipe', building_category: 1, input: {}, output: {}, time: 100, specialty: false, workers: {} }],
        workers: [{ type: 1, name: 'Worker', baseConsumption: 10 }],
      }

      // Mock extractRaw to return our mock data
      const extractRawSpy = vi.spyOn(extractRaw, 'extractRaw').mockResolvedValue({
        raw: {
          materials: mockGameData.materials,
          buildings: mockGameData.buildings,
          planets: mockGameData.planets,
          systems: mockGameData.systems,
          recipes: mockGameData.recipes,
          workers: mockGameData.workers,
        } as GameDataRaw,
        source: 'api',
      })

      // First load - should cache
      const result1 = await loadGameData(false)
      expect(result1.source).toBe('api')
      expect(result1.loadedAt).toBeGreaterThan(0)
      const firstTimestamp = result1.loadedAt

      // Wait a tiny bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Second load with force=true - should bypass cache and fetch again
      const result2 = await loadGameData(true)
      expect(result2.source).toBe('api')
      expect(result2.loadedAt).toBeGreaterThanOrEqual(firstTimestamp)
      expect(extractRawSpy).toHaveBeenCalledTimes(2)
    })

    it('should handle errors gracefully', async () => {
      vi.spyOn(apiKeyManager, 'getWorld').mockReturnValue('g2')

      // Mock extractRaw to throw an error
      vi.spyOn(extractRaw, 'extractRaw').mockRejectedValueOnce(
        new Error('API rate limited'),
      )

      // Should throw and propagate the error
      await expect(loadGameData(true)).rejects.toThrow('API rate limited')
    })

    it('should update cache with new data', async () => {
      vi.spyOn(apiKeyManager, 'getWorld').mockReturnValue('g2')

      const mockGameData: GameData = {
        materials: [{ id: 1, name: 'Updated Material', tier: 1, researchable: false }],
        buildings: [{ id: 1, name: 'Updated Building', specialization: 1, recipe_categories: [] }],
        planets: [{ id: 1, name: 'Updated Planet', systemId: 1, abundance: 0, fertility: 0 }],
        systems: [{ id: 1, name: 'Updated System' }],
        recipes: [{ id: 1, name: 'Updated Recipe', building_category: 1, input: {}, output: {}, time: 100, specialty: false, workers: {} }],
        workers: [{ type: 1, name: 'Worker', baseConsumption: 10 }],
      }

      vi.spyOn(extractRaw, 'extractRaw').mockResolvedValue({
        raw: {
          materials: mockGameData.materials,
          buildings: mockGameData.buildings,
          planets: mockGameData.planets,
          systems: mockGameData.systems,
          recipes: mockGameData.recipes,
          workers: mockGameData.workers,
        } as GameDataRaw,
        source: 'api',
      })

      const result = await loadGameData(true)
      expect(result.data.materials[0].name).toBe('Updated Material')
      expect(result.data.buildings[0].name).toBe('Updated Building')
    })
  })

  describe('buildIndex', () => {
    it('should correctly build indices from game data', () => {
      const mockGameData: GameData = {
        materials: [
          { id: 1, name: 'Material 1', tier: 1, researchable: false },
          { id: 2, name: 'Material 2', tier: 2, researchable: true },
        ],
        buildings: [
          { id: 1, name: 'Building 1', specialization: 1, recipe_categories: [] },
          { id: 2, name: 'Building 2', specialization: 2, recipe_categories: [] },
        ],
        planets: [
          { id: 1, name: 'Planet 1', systemId: 1, abundance: 10, fertility: 5 },
          { id: 2, name: 'Planet 2', systemId: 2, abundance: 20, fertility: 10 },
        ],
        systems: [
          { id: 1, name: 'System 1' },
          { id: 2, name: 'System 2' },
        ],
        recipes: [
          { id: 1, name: 'Recipe 1', building_category: 1, input: {}, output: {}, time: 100, specialty: false, workers: {} },
          { id: 2, name: 'Recipe 2', building_category: 2, input: {}, output: {}, time: 200, specialty: true, workers: {} },
        ],
        workers: [
          { type: 1, name: 'Worker', baseConsumption: 10 },
          { type: 2, name: 'Technician', baseConsumption: 15 },
        ],
      }

      const index = buildIndex(mockGameData)

      // Verify material index
      expect(index.materialById.get(1)?.name).toBe('Material 1')
      expect(index.materialById.get(2)?.name).toBe('Material 2')
      expect(index.materialById.size).toBe(2)

      // Verify building index
      expect(index.buildingById.get(1)?.name).toBe('Building 1')
      expect(index.buildingById.get(2)?.name).toBe('Building 2')
      expect(index.buildingById.size).toBe(2)

      // Verify planet index
      expect(index.planetById.get(1)?.name).toBe('Planet 1')
      expect(index.planetById.get(2)?.name).toBe('Planet 2')
      expect(index.planetById.size).toBe(2)

      // Verify system index
      expect(index.systemById.get(1)?.name).toBe('System 1')
      expect(index.systemById.get(2)?.name).toBe('System 2')
      expect(index.systemById.size).toBe(2)

      // Verify recipe index
      expect(index.recipeById.get(1)?.name).toBe('Recipe 1')
      expect(index.recipeById.get(2)?.name).toBe('Recipe 2')
      expect(index.recipeById.size).toBe(2)

      // Verify worker index
      expect(index.workerByType.get(1)?.name).toBe('Worker')
      expect(index.workerByType.get(2)?.name).toBe('Technician')
      expect(index.workerByType.size).toBe(2)
    })
  })
})
