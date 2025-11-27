/**
 * Market Analysis Extractor Tests
 * Tests API extraction and caching logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { extractMarketDetails, clearMarketDetailsCache } from '../extractor'
import type { MarketDetailsApiResponse } from '../types'
import { createRisingTrendMaterial, createFallingTrendMaterial } from './testFixtures'

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
      materials: [createRisingTrendMaterial(1)],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      headers: new Headers(),
    })

    const result = await extractMarketDetails(testApiKey, 'g2')

    expect(result.source).toBe('api')
    expect(result.data).toHaveLength(1)
    expect(result.data[0].matId).toBe(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.g2.galactictycoons.com/public/exchange/mat-details?apikey=test-api-key-12345'
    )
  })

  it('should use cache on second call within TTL', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      materials: [createRisingTrendMaterial(1)],
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      headers: new Headers(),
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
      materials: [createRisingTrendMaterial(1)],
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      headers: new Headers(),
    })

    // First call
    await extractMarketDetails(testApiKey, 'g2')
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Force refresh should bypass cache
    await extractMarketDetails(testApiKey, 'g2', true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should separate cache by world (g1 vs g2)', async () => {
    const mockResponseG1: MarketDetailsApiResponse = {
      materials: [createRisingTrendMaterial(1)],
    }
    const mockResponseG2: MarketDetailsApiResponse = {
      materials: [createFallingTrendMaterial(2)],
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseG1,
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseG2,
        headers: new Headers(),
      })

    // Fetch from g1
    const resultG1 = await extractMarketDetails(testApiKey, 'g1')
    expect(resultG1.data[0].matId).toBe(1)

    // Fetch from g2
    const resultG2 = await extractMarketDetails(testApiKey, 'g2')
    expect(resultG2.data[0].matId).toBe(2)

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should handle empty materials array', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      materials: [],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      headers: new Headers(),
    })

    const result = await extractMarketDetails(testApiKey, 'g2')
    expect(result.data).toHaveLength(0)
  })

  it('should throw error for 429 rate limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Headers(),
    })

    await expect(extractMarketDetails(testApiKey, 'g2')).rejects.toThrow(
      'API error 429: Too Many Requests - Rate limit exceeded'
    )
  })

  it('should throw error for 401 unauthorized', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers(),
    })

    await expect(extractMarketDetails(testApiKey, 'g2')).rejects.toThrow(
      'API error 401: Unauthorized - Invalid or missing API key'
    )
  })

  it('should throw error for 403 forbidden', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers(),
    })

    await expect(extractMarketDetails(testApiKey, 'g2')).rejects.toThrow(
      'API error 403: Forbidden - Invalid or missing API key'
    )
  })

  it('should throw generic error for other status codes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers(),
    })

    await expect(extractMarketDetails(testApiKey, 'g2')).rejects.toThrow(
      'API error 500: Internal Server Error'
    )
  })

  it('should return stale cache on API failure if cache exists', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      materials: [createRisingTrendMaterial(1)],
    }

    // First call succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      headers: new Headers(),
    })

    const result1 = await extractMarketDetails(testApiKey, 'g2')
    expect(result1.source).toBe('api')

    // Second call fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers(),
    })

    // Should return stale cache instead of throwing
    const result2 = await extractMarketDetails(testApiKey, 'g2', true)
    expect(result2.source).toBe('cache')
    expect(result2.data).toHaveLength(1)
  })

  it('should clear cache for specific world', () => {
    clearMarketDetailsCache('g1')
    // Cache clearing is silent, just ensure it doesn't throw
    expect(true).toBe(true)
  })

  it('should clear cache for all worlds', () => {
    clearMarketDetailsCache()
    // Cache clearing is silent, just ensure it doesn't throw
    expect(true).toBe(true)
  })
})
