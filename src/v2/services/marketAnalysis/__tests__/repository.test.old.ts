/**
 * Market Analysis Repository Tests
 * Tests the main interface and data orchestration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchMarketOpportunities,
  fetchMaterialOpportunity,
  filterOpportunities,
  sortByOpportunityScore,
  getTopOpportunities,
} from '../repository'
import { clearMarketDetailsCache } from '../extractor'
import type { MarketDetailsApiResponse, MarketOpportunity } from '../types'
import * as apiKeyManager from '../../api/apiKeyManager'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock API key
vi.mock('../../api/apiKeyManager', () => ({
  getApiKey: vi.fn(() => 'test-api-key-12345'),
}))

describe('fetchMarketOpportunities', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    clearMarketDetailsCache()
    vi.mocked(apiKeyManager.getApiKey).mockReturnValue('test-api-key-12345')
  })

  it('should fetch and transform market opportunities', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      mats: [
        {
          id: 1,
          lp: 120,
          avg7d: 100,
          avg1d: 110,
          ask: 125,
          bid: 120,
          minprice: null,
          maxprice: null,
          ls: null,
          lv: null,
          history: [
            { t: '2024-01-01', v: 2000, p: 100 },
            { t: '2024-01-02', v: 1500, p: 100 },
            { t: '2024-01-03', v: 1800, p: 100 },
            { t: '2024-01-04', v: 2200, p: 100 },
            { t: '2024-01-05', v: 1900, p: 100 },
            { t: '2024-01-06', v: 2100, p: 100 },
            { t: '2024-01-07', v: 2000, p: 100 },
          ],
        },
        {
          id: 2,
          lp: 80,
          avg7d: 100,
          avg1d: 90,
          ask: 130,
          bid: 100,
          minprice: null,
          maxprice: null,
          ls: null,
          lv: null,
          history: [
            { t: '2024-01-01', v: 20, p: 100 },
            { t: '2024-01-02', v: 15, p: 100 },
            { t: '2024-01-03', v: 18, p: 100 },
            { t: '2024-01-04', v: 22, p: 100 },
            { t: '2024-01-05', v: 19, p: 100 },
            { t: '2024-01-06', v: 21, p: 100 },
            { t: '2024-01-07', v: 20, p: 100 },
          ],
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const opportunities = await fetchMarketOpportunities({ world: 'g2' })

    expect(opportunities).toHaveLength(2)
    expect(opportunities[0].materialId).toBe(1)
    expect(opportunities[0].priceTrend.direction).toBe('rising')
    expect(opportunities[0].demand.demandLevel).toBe('high')
    expect(opportunities[1].materialId).toBe(2)
    expect(opportunities[1].priceTrend.direction).toBe('falling')
    expect(opportunities[1].demand.demandLevel).toBe('low')
  })

  it('should handle empty response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ mats: [] }),
    })

    const opportunities = await fetchMarketOpportunities()
    expect(opportunities).toHaveLength(0)
  })
})

describe('fetchMaterialOpportunity', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    clearMarketDetailsCache()
    vi.mocked(apiKeyManager.getApiKey).mockReturnValue('test-api-key-12345')
  })

  it('should fetch opportunity for specific material', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      mats: [
        {
          id: 42,
          lp: 120,
          avg7d: 100,
          avg1d: 110,
          ask: 125,
          bid: 120,
          minprice: null,
          maxprice: null,
          ls: null,
          lv: null,
          history: [{ t: '2024-01-01', v: 2000, p: 100 }],
        },
        {
          id: 99,
          lp: 80,
          avg7d: 100,
          avg1d: 90,
          ask: null,
          bid: null,
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

    const opportunity = await fetchMaterialOpportunity(42)
    expect(opportunity).not.toBeNull()
    expect(opportunity!.materialId).toBe(42)
  })

  it('should return null for non-existent material', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ mats: [] }),
    })

    const opportunity = await fetchMaterialOpportunity(999)
    expect(opportunity).toBeNull()
  })
})

describe('filterOpportunities', () => {
  const mockOpportunities: MarketOpportunity[] = [
    {
      materialId: 1,
      priceTrend: {
        current: 120,
        avg7d: 100,
        avg1d: 110,
        changePercent7d: 20,
        changePercent1d: 9.09,
        direction: 'rising',
      },
      demand: {
        volume7d: 14000,
        volumeAvgPerDay: 2000,
        demandLevel: 'high',
      },
      saturation: {
        askPrice: 125,
        bidPrice: 120,
        spread: 5,
        spreadPercent: 4.17,
        saturationLevel: 'undersupplied',
      },
      opportunityScore: 90,
      recommendation: 'strong-buy',
    },
    {
      materialId: 2,
      priceTrend: {
        current: 102,
        avg7d: 100,
        avg1d: 101,
        changePercent7d: 2,
        changePercent1d: 1,
        direction: 'stable',
      },
      demand: {
        volume7d: 1400,
        volumeAvgPerDay: 200,
        demandLevel: 'medium',
      },
      saturation: {
        askPrice: 110,
        bidPrice: 100,
        spread: 10,
        spreadPercent: 10,
        saturationLevel: 'balanced',
      },
      opportunityScore: 60,
      recommendation: 'buy',
    },
    {
      materialId: 3,
      priceTrend: {
        current: 80,
        avg7d: 100,
        avg1d: 90,
        changePercent7d: -20,
        changePercent1d: -11.11,
        direction: 'falling',
      },
      demand: {
        volume7d: 350,
        volumeAvgPerDay: 50,
        demandLevel: 'low',
      },
      saturation: {
        askPrice: 130,
        bidPrice: 100,
        spread: 30,
        spreadPercent: 30,
        saturationLevel: 'oversupplied',
      },
      opportunityScore: 20,
      recommendation: 'sell',
    },
  ]

  it('should filter by minimum opportunity score', () => {
    const filtered = filterOpportunities(mockOpportunities, {
      minOpportunityScore: 50,
    })
    expect(filtered).toHaveLength(2)
    expect(filtered[0].materialId).toBe(1)
    expect(filtered[1].materialId).toBe(2)
  })

  it('should filter by demand levels', () => {
    const filtered = filterOpportunities(mockOpportunities, {
      demandLevels: ['high', 'low'],
    })
    expect(filtered).toHaveLength(2)
    expect(filtered[0].materialId).toBe(1)
    expect(filtered[1].materialId).toBe(3)
  })

  it('should filter by trend directions', () => {
    const filtered = filterOpportunities(mockOpportunities, {
      trendDirections: ['rising'],
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].materialId).toBe(1)
  })

  it('should combine multiple filters', () => {
    const filtered = filterOpportunities(mockOpportunities, {
      minOpportunityScore: 50,
      demandLevels: ['high'],
      trendDirections: ['rising'],
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].materialId).toBe(1)
  })

  it('should return all opportunities with no filters', () => {
    const filtered = filterOpportunities(mockOpportunities, {})
    expect(filtered).toHaveLength(3)
  })
})

describe('sortByOpportunityScore', () => {
  it('should sort opportunities by score descending', () => {
    const opportunities: MarketOpportunity[] = [
      { materialId: 1, opportunityScore: 60 } as MarketOpportunity,
      { materialId: 2, opportunityScore: 90 } as MarketOpportunity,
      { materialId: 3, opportunityScore: 30 } as MarketOpportunity,
    ]

    const sorted = sortByOpportunityScore(opportunities)
    expect(sorted[0].materialId).toBe(2) // 90
    expect(sorted[1].materialId).toBe(1) // 60
    expect(sorted[2].materialId).toBe(3) // 30
  })

  it('should not modify original array', () => {
    const opportunities: MarketOpportunity[] = [
      { materialId: 1, opportunityScore: 60 } as MarketOpportunity,
      { materialId: 2, opportunityScore: 90 } as MarketOpportunity,
    ]

    const sorted = sortByOpportunityScore(opportunities)
    expect(opportunities[0].materialId).toBe(1) // Original unchanged
    expect(sorted[0].materialId).toBe(2) // Sorted
  })
})

describe('getTopOpportunities', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    clearMarketDetailsCache()
    vi.mocked(apiKeyManager.getApiKey).mockReturnValue('test-api-key-12345')
  })

  it('should get top N opportunities', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      mats: [
        {
          id: 1,
          lp: 120,
          avg7d: 100,
          avg1d: 110,
          ask: 125,
          bid: 120,
          minprice: null,
          maxprice: null,
          ls: null,
          lv: null,
          history: [{ t: '2024-01-01', v: 2000, p: 100 }],
        },
        {
          id: 2,
          lp: 102,
          avg7d: 100,
          avg1d: 101,
          ask: 110,
          bid: 100,
          minprice: null,
          maxprice: null,
          ls: null,
          lv: null,
          history: [{ t: '2024-01-01', v: 200, p: 100 }],
        },
        {
          id: 3,
          lp: 80,
          avg7d: 100,
          avg1d: 90,
          ask: 130,
          bid: 100,
          minprice: null,
          maxprice: null,
          ls: null,
          lv: null,
          history: [{ t: '2024-01-01', v: 20, p: 100 }],
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const top = await getTopOpportunities(2)
    expect(top).toHaveLength(2)
    expect(top[0].opportunityScore).toBeGreaterThanOrEqual(top[1].opportunityScore)
  })

  it('should apply filters before selecting top', async () => {
    const mockResponse: MarketDetailsApiResponse = {
      mats: [
        {
          id: 1,
          lp: 120,
          avg7d: 100,
          avg1d: 110,
          ask: 125,
          bid: 120,
          minprice: null,
          maxprice: null,
          ls: null,
          lv: null,
          history: [{ t: '2024-01-01', v: 2000, p: 100 }],
        },
        {
          id: 2,
          lp: 80,
          avg7d: 100,
          avg1d: 90,
          ask: 130,
          bid: 100,
          minprice: null,
          maxprice: null,
          ls: null,
          lv: null,
          history: [{ t: '2024-01-01', v: 20, p: 100 }],
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const top = await getTopOpportunities(
      10,
      {},
      {
        trendDirections: ['rising'],
      },
    )
    expect(top.length).toBeGreaterThan(0)
    expect(top.every((o) => o.priceTrend.direction === 'rising')).toBe(true)
  })
})
