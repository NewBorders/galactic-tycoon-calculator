import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getApiKey, setApiKey, hasApiKey } from '../apiKeyManager'

describe('apiKeyManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
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
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage full')
      })

      const result = setApiKey('test-key')
      expect(result).toBe(false)

      vi.restoreAllMocks()
    })
  })

  describe('getApiKey', () => {
    it('should return null if no key is stored', () => {
      expect(getApiKey()).toBeNull()
    })

    it('should return stored API key', () => {
      const key = 'test-api-key'
      localStorage.setItem('gt:v2:api:key', key)

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
