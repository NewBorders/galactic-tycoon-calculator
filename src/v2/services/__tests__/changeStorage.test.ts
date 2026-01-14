import { describe, it, expect, beforeEach } from 'vitest'
import { registerChange, getChange, unregisterChange, type StoredChange } from '../changeStorage'

describe('Change Storage Service', () => {
  beforeEach(() => {
    // Clear storage before each test
    unregisterChange('test-id')
  })

  it('should register and retrieve a change', () => {
    const changeId = 'test-id'
    const change: StoredChange = {
      changeId,
      type: 'buildingLevel',
      targetId: 'building-123',
      targetField: 'level',
      originalValue: 2,
      newValue: 4,
    }

    registerChange(changeId, change)
    const retrieved = getChange(changeId)

    expect(retrieved).toEqual(change)
  })

  it('should return undefined for non-existent change', () => {
    const retrieved = getChange('non-existent')
    expect(retrieved).toBeUndefined()
  })

  it('should unregister a change', () => {
    const changeId = 'test-id'
    const change: StoredChange = {
      changeId,
      type: 'recipeCount',
      targetId: 'recipe-456',
      originalValue: 1,
      newValue: 2,
    }

    registerChange(changeId, change)
    expect(getChange(changeId)).toBeDefined()

    unregisterChange(changeId)
    expect(getChange(changeId)).toBeUndefined()
  })

  it('should handle different change types', () => {
    const types: Array<StoredChange['type']> = [
      'buildingLevel',
      'recipeCount',
      'technologyLevel',
      'startingBonus',
      'stock',
    ]

    types.forEach((type, index) => {
      const changeId = `test-${type}`
      const change: StoredChange = {
        changeId,
        type,
        targetId: `target-${index}`,
        originalValue: 1,
        newValue: 2,
      }

      registerChange(changeId, change)
      const retrieved = getChange(changeId)

      expect(retrieved?.type).toBe(type)
      unregisterChange(changeId)
    })
  })

  it('should store and retrieve technology level changes', () => {
    const changeId = 'tech-level-change'
    const change: StoredChange = {
      changeId,
      type: 'technologyLevel',
      targetId: 'armor-plates',
      originalValue: 5,
      newValue: 6,
    }

    registerChange(changeId, change)
    const retrieved = getChange(changeId)

    expect(retrieved?.type).toBe('technologyLevel')
    expect(retrieved?.targetId).toBe('armor-plates')
    expect(retrieved?.originalValue).toBe(5)
    expect(retrieved?.newValue).toBe(6)
  })

  it('should store and retrieve stock changes', () => {
    const changeId = 'stock-change'
    const change: StoredChange = {
      changeId,
      type: 'stock',
      targetId: '12', // Material ID
      originalValue: 100,
      newValue: 150,
    }

    registerChange(changeId, change)
    const retrieved = getChange(changeId)

    expect(retrieved?.type).toBe('stock')
    expect(retrieved?.targetId).toBe('12')
    expect(retrieved?.originalValue).toBe(100)
    expect(retrieved?.newValue).toBe(150)
  })
})
