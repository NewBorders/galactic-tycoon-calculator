import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getApiKey, setApiKey, hasApiKey } from '../apiKeyManager'
import { clearAllWorldData } from '../../worldData/storage'
import { __resetWorldDataState__ } from '../../worldData'

describe('apiKeyManager', () => {
  beforeEach(() => {
    // Clear all world data before each test
    clearAllWorldData()
    __resetWorldDataState__()
  })

  afterEach(() => {
    // Clear all world data after each test
    clearAllWorldData()
    __resetWorldDataState__()
  })

  describe('setApiKey', () => {
    it('should store API key in localStorage', () => {
      const key = 'test-api-key-12345'
      const result = setApiKey(key)

      expect(result).toBe(true)
      expect(getApiKey()).toBe(key)
    })

    it('should trim whitespace from API key', () => {
      const key = '  test-api-key  '
      setApiKey(key)

      expect(getApiKey()).toBe('test-api-key')
    })

    it('should remove API key when given empty string', () => {
      setApiKey('test-key')
      expect(getApiKey()).not.toBeNull()

      setApiKey('')
      expect(getApiKey()).toBeNull()
    })

    it('should handle localStorage errors gracefully', () => {
      // Note: setApiKey now uses a reactive watcher for persistence
      // The error will be caught and logged in the watcher, but setApiKey itself succeeds
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage full')
      })

      const result = setApiKey('test-key')
      // setApiKey updates in-memory state successfully
      expect(result).toBe(true)
      // But the value is still set in memory
      expect(getApiKey()).toBe('test-key')

      vi.restoreAllMocks()
    })
  })

  describe('getApiKey', () => {
    it('should return null if no key is stored', () => {
      expect(getApiKey()).toBeNull()
    })

    it('should return stored API key', () => {
      const key = 'test-api-key'
      setApiKey(key)

      expect(getApiKey()).toBe(key)
    })

    it('should handle localStorage errors gracefully', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage access denied')
      })

      const result = getApiKey()
      expect(result).toBeNull()

      vi.restoreAllMocks()
    })
  })

  describe('hasApiKey', () => {
    it('should return false when no key is stored', () => {
      expect(hasApiKey()).toBe(false)
    })

    it('should return true when key is stored', () => {
      setApiKey('test-key')
      expect(hasApiKey()).toBe(true)
    })
  })
})
