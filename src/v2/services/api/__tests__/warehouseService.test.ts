import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fetchCompanyBases, fetchWarehouseStock, clearCache, getLastBasesFetchTime, getLastWarehouseFetchTime } from '../warehouseService'
import type { CompanyResponse, AllWarehousesResponse } from '../types'

describe('warehouseService', () => {
  beforeEach(() => {
    clearCache()
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearCache()
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

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      )

      const { data, source } = await fetchCompanyBases('test-api-key')

      expect(data).toEqual(mockResponse)
      expect(source).toBe('api')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('public/company') && expect.stringContaining('apikey=test-api-key'),
      )
    })

    it('should return cached data on subsequent calls', async () => {
      const mockResponse: CompanyResponse = {
        id: 1,
        name: 'Test Company',
        money: 100000,
        bases: [],
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      )

      // First call
      const result1 = await fetchCompanyBases('test-api-key')
      expect(result1.source).toBe('api')
      expect(global.fetch).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result2 = await fetchCompanyBases('test-api-key')
      expect(result2.source).toBe('cache')
      expect(global.fetch).toHaveBeenCalledTimes(1) // Still 1, not 2
      expect(result2.data).toEqual(result1.data)
    })

    it('should force refresh cache when requested', async () => {
      const mockResponse: CompanyResponse = {
        id: 1,
        name: 'Test Company',
        money: 100000,
        bases: [],
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      )

      // First call
      await fetchCompanyBases('test-api-key')
      expect(global.fetch).toHaveBeenCalledTimes(1)

      // Force refresh
      await fetchCompanyBases('test-api-key', true)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should throw error on API failure', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        } as Response),
      )

      await expect(fetchCompanyBases('invalid-key')).rejects.toThrow('API error: 401 Unauthorized')
    })

    it('should throw error on network failure', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

      await expect(fetchCompanyBases('test-key')).rejects.toThrow('Failed to fetch company bases')
    })

    it('should track last fetch time', async () => {
      const mockResponse: CompanyResponse = {
        id: 1,
        name: 'Test Company',
        money: 100000,
        bases: [],
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      )

      const timeBefore = Date.now()
      await fetchCompanyBases('test-key')
      const timeAfter = Date.now()

      const fetchTime = getLastBasesFetchTime()
      expect(fetchTime).not.toBeNull()
      expect(fetchTime).toBeGreaterThanOrEqual(timeBefore)
      expect(fetchTime).toBeLessThanOrEqual(timeAfter)
    })
  })

  describe('fetchWarehouseStock', () => {
    it('should fetch warehouse stocks from API', async () => {
      const mockResponse: AllWarehousesResponse = {
        warehouses: [
          {
            baseId: 101,
            warehouseId: 201,
            items: [
              { materialId: 1, quantity: 100 },
              { materialId: 2, quantity: 200 },
            ],
            lastUpdated: '2025-11-15T00:00:00Z',
          },
        ],
        lastUpdated: '2025-11-15T00:00:00Z',
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      )

      const { data, source } = await fetchWarehouseStock('test-api-key')

      expect(data).toEqual(mockResponse)
      expect(source).toBe('api')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('company/warehouse') && expect.stringContaining('apikey=test-api-key'),
      )
    })

    it('should return cached data on subsequent calls', async () => {
      const mockResponse: AllWarehousesResponse = {
        warehouses: [],
        lastUpdated: '2025-11-15T00:00:00Z',
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      )

      const result1 = await fetchWarehouseStock('test-api-key')
      expect(result1.source).toBe('api')

      const result2 = await fetchWarehouseStock('test-api-key')
      expect(result2.source).toBe('cache')
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should track last warehouse fetch time', async () => {
      const mockResponse: AllWarehousesResponse = {
        warehouses: [],
        lastUpdated: '2025-11-15T00:00:00Z',
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      )

      const timeBefore = Date.now()
      await fetchWarehouseStock('test-key')
      const timeAfter = Date.now()

      const fetchTime = getLastWarehouseFetchTime()
      expect(fetchTime).not.toBeNull()
      expect(fetchTime).toBeGreaterThanOrEqual(timeBefore)
      expect(fetchTime).toBeLessThanOrEqual(timeAfter)
    })
  })

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      const mockResponse: CompanyResponse = {
        id: 1,
        name: 'Test Company',
        money: 100000,
        bases: [],
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      )

      await fetchCompanyBases('test-key')
      expect(getLastBasesFetchTime()).not.toBeNull()

      clearCache()
      expect(getLastBasesFetchTime()).toBeNull()
      expect(getLastWarehouseFetchTime()).toBeNull()
    })
  })
})
