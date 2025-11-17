import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fetchCompanyBases, clearCache } from '../warehouseService'
import type { CompanyResponse } from '../types'

describe('warehouseService', () => {
  beforeEach(() => {
    clearCache()
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearCache()
    vi.clearAllMocks()
  })

  describe('fetchCompanyBases', () => {
    it('should fetch company bases from API', async () => {
      const mockResponse: CompanyResponse = {
        id: 1,
        name: 'Test Company',
        money: 100000,
        bases: [
          {
            id: 101,
            name: 'Base 1',
            planetId: 1,
            warehouseId: 201,
            x: 10,
            y: 20,
          },
        ],
      }

      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      )

      const result = await fetchCompanyBases('test-api-key', 'g2')

      expect(result.data).toEqual(mockResponse)
      expect(result.source).toBe('api')
      expect(globalThis.fetch).toHaveBeenCalled()
    })

    it('should return cached data on subsequent calls', async () => {
      const mockResponse: CompanyResponse = {
        id: 1,
        name: 'Test Company',
        money: 100000,
        bases: [],
      }

      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      )

      const result1 = await fetchCompanyBases('test-api-key', 'g2')
      expect(result1.source).toBe('api')

      const result2 = await fetchCompanyBases('test-api-key', 'g2')
      expect(result2.source).toBe('cache')
      expect(result2.data).toEqual(mockResponse)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it('should handle API errors', async () => {
      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        } as Response),
      )

      await expect(fetchCompanyBases('invalid-key', 'g2')).rejects.toThrow()
    })
  })
})
