import { describe, it, expect } from 'vitest'
import {
  getWorkerConsumableMaterialIds,
  getWorkerConsumablesByTier,
  getEssentialWorkerConsumableMaterialIds,
  getOptionalWorkerConsumableMaterialIds,
  isWorkerConsumable,
} from '../workerConsumables'
import type { GameData } from '@/v2/services/gamedata/types'

describe('workerConsumables', () => {
  const mockGameData: GameData = {
    workers: [
      {
        type: 1,
        adminCost: 10,
        consumables: [
          { matId: 12, matName: 'Rations', amount: 240, essential: true },
          { matId: 16, matName: 'Drinking Water', amount: 320, essential: true },
          { matId: 17, matName: 'Tools', amount: 120, essential: true },
          { matId: 44, matName: 'Workwear', amount: 80, essential: false },
          { matId: 10, matName: 'Ale', amount: 72, essential: false },
        ],
      },
      {
        type: 2,
        adminCost: 20,
        consumables: [
          { matId: 13, matName: 'Fine Rations', amount: 240, essential: true },
          { matId: 16, matName: 'Drinking Water', amount: 480, essential: true },
          { matId: 44, matName: 'Workwear', amount: 160, essential: true },
          { matId: 21, matName: 'Coffee', amount: 80, essential: false },
        ],
      },
    ],
    materials: [],
    recipes: [],
    buildings: [],
    planets: [],
  } as GameData

  describe('getWorkerConsumableMaterialIds', () => {
    it('should return all unique material IDs consumed by workers', () => {
      const result = getWorkerConsumableMaterialIds(mockGameData)

      expect(result).toBeInstanceOf(Set)
      expect(result.size).toBe(7) // 12, 16, 17, 44, 10, 13, 21
      expect(result.has(12)).toBe(true) // Rations
      expect(result.has(16)).toBe(true) // Drinking Water (appears in both tiers)
      expect(result.has(17)).toBe(true) // Tools
      expect(result.has(44)).toBe(true) // Workwear (essential in T2, optional in T1)
      expect(result.has(10)).toBe(true) // Ale
      expect(result.has(13)).toBe(true) // Fine Rations
      expect(result.has(21)).toBe(true) // Coffee
    })

    it('should return empty set for game data with no workers', () => {
      const emptyGameData: GameData = {
        workers: [],
        materials: [],
        recipes: [],
        buildings: [],
        planets: [],
      } as GameData

      const result = getWorkerConsumableMaterialIds(emptyGameData)

      expect(result.size).toBe(0)
    })
  })

  describe('getWorkerConsumablesByTier', () => {
    it('should return material IDs grouped by tier', () => {
      const result = getWorkerConsumablesByTier(mockGameData)

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(2)

      const tier1 = result.get(1)!
      expect(tier1.size).toBe(5) // Rations, Water, Tools, Workwear, Ale
      expect(tier1.has(12)).toBe(true)
      expect(tier1.has(16)).toBe(true)
      expect(tier1.has(17)).toBe(true)
      expect(tier1.has(44)).toBe(true)
      expect(tier1.has(10)).toBe(true)

      const tier2 = result.get(2)!
      expect(tier2.size).toBe(4) // Fine Rations, Water, Workwear, Coffee
      expect(tier2.has(13)).toBe(true)
      expect(tier2.has(16)).toBe(true)
      expect(tier2.has(44)).toBe(true)
      expect(tier2.has(21)).toBe(true)
    })
  })

  describe('getEssentialWorkerConsumableMaterialIds', () => {
    it('should return only essential consumable material IDs', () => {
      const result = getEssentialWorkerConsumableMaterialIds(mockGameData)

      expect(result.size).toBe(5) // Rations, Water, Tools, Fine Rations, Workwear (T2)
      expect(result.has(12)).toBe(true) // Rations
      expect(result.has(16)).toBe(true) // Drinking Water
      expect(result.has(17)).toBe(true) // Tools
      expect(result.has(13)).toBe(true) // Fine Rations
      expect(result.has(44)).toBe(true) // Workwear (essential in T2)

      // Optional items should not be included
      expect(result.has(10)).toBe(false) // Ale
      expect(result.has(21)).toBe(false) // Coffee
    })
  })

  describe('getOptionalWorkerConsumableMaterialIds', () => {
    it('should return only optional consumable material IDs', () => {
      const result = getOptionalWorkerConsumableMaterialIds(mockGameData)

      expect(result.size).toBe(3) // Workwear (T1), Ale, Coffee
      expect(result.has(44)).toBe(true) // Workwear (optional in T1)
      expect(result.has(10)).toBe(true) // Ale
      expect(result.has(21)).toBe(true) // Coffee

      // Essential items should not be included
      expect(result.has(12)).toBe(false) // Rations
      expect(result.has(16)).toBe(false) // Drinking Water
      expect(result.has(17)).toBe(false) // Tools
      expect(result.has(13)).toBe(false) // Fine Rations
    })
  })

  describe('isWorkerConsumable', () => {
    it('should return true for material IDs that are worker consumables', () => {
      expect(isWorkerConsumable(mockGameData, 12)).toBe(true) // Rations
      expect(isWorkerConsumable(mockGameData, 16)).toBe(true) // Drinking Water
      expect(isWorkerConsumable(mockGameData, 10)).toBe(true) // Ale
      expect(isWorkerConsumable(mockGameData, 21)).toBe(true) // Coffee
    })

    it('should return false for material IDs that are not worker consumables', () => {
      expect(isWorkerConsumable(mockGameData, 999)).toBe(false)
      expect(isWorkerConsumable(mockGameData, 1)).toBe(false)
      expect(isWorkerConsumable(mockGameData, 100)).toBe(false)
    })
  })

  describe('handling duplicate materials across tiers', () => {
    it('should handle materials that appear in multiple tiers correctly', () => {
      const allConsumables = getWorkerConsumableMaterialIds(mockGameData)
      const tier1 = getWorkerConsumablesByTier(mockGameData).get(1)!
      const tier2 = getWorkerConsumablesByTier(mockGameData).get(2)!

      // Drinking Water (16) appears in both tiers
      expect(tier1.has(16)).toBe(true)
      expect(tier2.has(16)).toBe(true)

      // But should only appear once in the global set
      expect(allConsumables.has(16)).toBe(true)
      expect(Array.from(allConsumables).filter(id => id === 16).length).toBe(1)

      // Workwear (44) appears in both tiers with different essential flags
      expect(tier1.has(44)).toBe(true)
      expect(tier2.has(44)).toBe(true)

      // Should appear in both essential and optional sets
      expect(getEssentialWorkerConsumableMaterialIds(mockGameData).has(44)).toBe(true)
      expect(getOptionalWorkerConsumableMaterialIds(mockGameData).has(44)).toBe(true)
    })
  })
})
