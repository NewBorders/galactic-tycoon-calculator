/**
 * Market Analysis Extractor Tests
 * Tests API extraction and caching logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { extractMarketDetails, clearMarketDetailsCache } from '../extractor'
import type { MarketDetailsApiResponse } from '../types'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('extractMarketDetails', () => {
  const testApiKey = 'test-api-key-12345'

  beforeEach(() => {
    mockFetch.mockReset()
    clearMarketDetailsCache()
  })

  it('should fetch market details from API', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      mats: [
        {
          id: 1,
          lp: 100,
          avg7d: 95,
          avg1d: 98,
          ask: 105,
          bid: 100,
          minprice: null,
          maxprice: null,
          ls: null,
          lv: null,
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await extractMarketDetails(testApiKey, 'g2')

    expect(result.source).toBe('api')
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe(1)
    expect(mockFetch).toHaveBeenCalledWith('https://api.g2.galactictycoons.com/public/exchange/mat-details?apikey=test-api-key-12345')
  })

  it('should use cache on second call within TTL', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      mats: [{ id: 1, lp: 100, avg7d: 95, avg1d: 98, ask: null, bid: null, minprice: null, maxprice: null, ls: null, lv: null }],
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    // First call should hit API
    const result1 = await extractMarketDetails(testApiKey, 'g2')
    expect(result1.source).toBe('api')
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Second call should use cache
    const result2 = await extractMarketDetails(testApiKey, 'g2')
    expect(result2.source).toBe('cache')
    expect(mockFetch).toHaveBeenCalledTimes(1) // No additional call
  })

  it('should refresh cache when forceRefresh is true', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      mats: [{ id: 1, lp: 100, avg7d: 95, avg1d: 98, ask: null, bid: null, minprice: null, maxprice: null, ls: null, lv: null }],
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    // First call
    await extractMarketDetails(testApiKey, 'g2')
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Force refresh should bypass cache
    await extractMarketDetails(testApiKey, 'g2', true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(extractMarketDetails(testApiKey, 'g2')).rejects.toThrow('API error 500: Internal Server Error')
  })

  it('should return stale cache on API error if available', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      mats: [{ id: 1, lp: 100, avg7d: 95, avg1d: 98, ask: null, bid: null, minprice: null, maxprice: null, ls: null, lv: null }],
    }

    // First call succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })
    const result1 = await extractMarketDetails(testApiKey, 'g2')
    expect(result1.source).toBe('api')

    // Second call fails but returns stale cache
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })
    const result2 = await extractMarketDetails(testApiKey, 'g2', true) // Force refresh to bypass cache check
    expect(result2.source).toBe('cache')
    expect(result2.data).toHaveLength(1)
  })

  it('should handle empty mats array', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      mats: [],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await extractMarketDetails(testApiKey, 'g2')
    expect(result.data).toHaveLength(0)
  })

  it('should handle missing mats property', async () => {
    const mockResponse: MarketDetailsApiResponse = {}

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await extractMarketDetails(testApiKey, 'g2')
    expect(result.data).toHaveLength(0)
  })

  it('should support different worlds', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      mats: [],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    await extractMarketDetails(testApiKey, 'g1')
    expect(mockFetch).toHaveBeenCalledWith('https://api.g1.galactictycoons.com/public/exchange/mat-details?apikey=test-api-key-12345')
  })
})

describe('clearMarketDetailsCache', () => {
  const testApiKey = 'test-api-key-12345'

  beforeEach(() => {
    mockFetch.mockReset()
    clearMarketDetailsCache()
  })

  it('should clear cache for specific world', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      mats: [{ id: 1, lp: 100, avg7d: 95, avg1d: 98, ask: null, bid: null, minprice: null, maxprice: null, ls: null, lv: null }],
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    // Cache data for g2
    await extractMarketDetails(testApiKey, 'g2')
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Clear cache for g2
    clearMarketDetailsCache('g2')

    // Next call should hit API again
    await extractMarketDetails(testApiKey, 'g2')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should clear cache for all worlds', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      mats: [],
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    // Cache data for both worlds
    await extractMarketDetails(testApiKey, 'g1')
    await extractMarketDetails(testApiKey, 'g2')
    expect(mockFetch).toHaveBeenCalledTimes(2)

    // Clear all caches
    clearMarketDetailsCache()

    // Both should hit API again
    await extractMarketDetails(testApiKey, 'g1')
    await extractMarketDetails(testApiKey, 'g2')
    expect(mockFetch).toHaveBeenCalledTimes(4)
  })
})
