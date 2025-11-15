import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fetchCompanyBases, fetchWarehouseStockForAllBases, clearCache } from '../warehouseService'
import type { CompanyResponse, WarehouseResponse } from '../types'

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

  describe('fetchWarehouseStockForAllBases', () => {
    it('should fetch warehouse stocks for multiple bases', async () => {
      const mockWarehouseResponse: WarehouseResponse = {
        id: 201,
        baseId: 101,
        items: [
          { materialId: 1, quantity: 100 },
          { materialId: 2, quantity: 200 },
        ],
        lastUpdated: '2025-11-15T00:00:00Z',
      }

      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWarehouseResponse),
        } as Response),
      )

      const result = await fetchWarehouseStockForAllBases('test-api-key', [201, 202], 'g2')

      expect(result.warehouses).toHaveLength(2)
      expect(result.warehouses[0].data).toEqual(mockWarehouseResponse)
      expect(result.errors).toHaveLength(0)
      expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    })

    it('should handle empty warehouse IDs', async () => {
      const result = await fetchWarehouseStockForAllBases('test-api-key', [], 'g2')

      expect(result.warehouses).toEqual([])
      expect(result.errors).toEqual([])
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('should collect errors from failed requests', async () => {
      let callCount = 0
      globalThis.fetch = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 201,
                baseId: 101,
                items: [],
                lastUpdated: '2025-11-15T00:00:00Z',
              } as WarehouseResponse),
          } as Response)
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response)
      })

      const result = await fetchWarehouseStockForAllBases('test-api-key', [201, 202], 'g2')

      expect(result.warehouses).toHaveLength(1)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
