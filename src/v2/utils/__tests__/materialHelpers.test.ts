import { describe, it, expect } from 'vitest'
import { getMaterialWeight, formatWeight } from '../materialHelpers'
import type { GameData } from '@/v2/services/gamedata/types'

describe('materialHelpers', () => {
  const mockGameData: GameData = {
    materials: [
      { id: 1, name: 'Iron', weightInTonnes: 0.5 } as any,
      { id: 2, name: 'Copper', weightInTonnes: 1.2 } as any,
      { id: 3, name: 'Water', weightInTonnes: 0.1 } as any,
    ],
  } as GameData

  describe('getMaterialWeight', () => {
    it('should return correct weight for existing material', () => {
      expect(getMaterialWeight(mockGameData, 1)).toBe(0.5)
      expect(getMaterialWeight(mockGameData, 2)).toBe(1.2)
      expect(getMaterialWeight(mockGameData, 3)).toBe(0.1)
    })

    it('should return 0 for non-existent material', () => {
      expect(getMaterialWeight(mockGameData, 999)).toBe(0)
    })

    it('should handle materials with zero weight', () => {
      const gameDataWithZeroWeight = {
        ...mockGameData,
        materials: [
          ...mockGameData.materials,
          { id: 4, name: 'Digital Good', weightInTonnes: 0 } as any,
        ],
      }
      expect(getMaterialWeight(gameDataWithZeroWeight, 4)).toBe(0)
    })
  })

  describe('formatWeight', () => {
    it('should format weight correctly for positive amounts', () => {
      expect(formatWeight(mockGameData, 100, 1)).toBe('50.0t') // 100 * 0.5
      expect(formatWeight(mockGameData, 10, 2)).toBe('12.0t') // 10 * 1.2
      expect(formatWeight(mockGameData, 50, 3)).toBe('5.0t') // 50 * 0.1
    })

    it('should use absolute value for negative amounts', () => {
      expect(formatWeight(mockGameData, -100, 1)).toBe('50.0t') // |-100| * 0.5
      expect(formatWeight(mockGameData, -10, 2)).toBe('12.0t') // |-10| * 1.2
    })

    it('should handle zero amount', () => {
      expect(formatWeight(mockGameData, 0, 1)).toBe('0.0t')
    })

    it('should handle non-existent material', () => {
      expect(formatWeight(mockGameData, 100, 999)).toBe('0.0t') // 100 * 0 (default weight)
    })

    it('should format with one decimal place', () => {
      expect(formatWeight(mockGameData, 123.456, 1)).toBe('61.7t') // 123.456 * 0.5 = 61.728 -> rounded to 61.7
    })

    it('should handle fractional amounts', () => {
      expect(formatWeight(mockGameData, 0.5, 2)).toBe('0.6t') // 0.5 * 1.2 = 0.6
    })
  })
})
