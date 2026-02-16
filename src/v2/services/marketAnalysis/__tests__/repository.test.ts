/**
 * Market Analysis Repository Tests
 * Tests ETL orchestration and filtering logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchMarketOpportunities,
  fetchMaterialOpportunity,
  filterOpportunities,
  sortByOpportunityScore,
  getTopOpportunities,
} from '../repository'
import type { MarketOpportunity } from '../types'
import {
  createTestMaterial,
  createRisingTrendMaterial,
  createFallingTrendMaterial,
  createStableTrendMaterial,
  createHighDemandMaterial,
  createMediumDemandMaterial,
  createLowDemandMaterial,
} from './testFixtures'

// Mock the extractor
vi.mock('../extractor', () => ({
  extractMarketDetails: vi.fn(),
  clearMarketDetailsCache: vi.fn(),
}))

// Mock API key manager
vi.mock('../../api/apiKeyManager', () => ({
  getApiKey: vi.fn(() => 'test-api-key-12345'),
}))

import { extractMarketDetails } from '../extractor'

const mockExtractMarketDetails = extractMarketDetails as ReturnType<typeof vi.fn>

describe('fetchMarketOpportunities', () => {
  beforeEach(() => {
    mockExtractMarketDetails.mockReset()
  })

  it('should fetch and transform market opportunities', async () => {
    mockExtractMarketDetails.mockResolvedValueOnce({
      data: [createRisingTrendMaterial(1), createFallingTrendMaterial(2)],
      source: 'api' as const,
    })

    const opportunities = await fetchMarketOpportunities({ world: 'g2' })

    expect(opportunities).toHaveLength(2)
    expect(opportunities[0].materialId).toBe(1)
    expect(opportunities[1].materialId).toBe(2)
  })

  it('should handle empty response', async () => {
    mockExtractMarketDetails.mockResolvedValueOnce({
      data: [],
      source: 'api' as const,
    })

    const opportunities = await fetchMarketOpportunities()
    expect(opportunities).toHaveLength(0)
  })

  it('should include revenue gap per day in transformed demand', async () => {
    mockExtractMarketDetails.mockResolvedValueOnce({
      data: [createTestMaterial({
        avgQtySoldDaily: 100,
        totalQtyAvailable: 60,
        avgPrice: 200,
        priceHistory: [
          { date: '2025-11-27', avgPrice: 200, qtySold: 100, qtyRemaining: 60 },
        ],
      })],
      source: 'api' as const,
    })

    const opportunities = await fetchMarketOpportunities()

    expect(opportunities[0].demand.revenueGapPerDay).toBe(8000)
  })

  it('should pass forceRefresh to extractor', async () => {
    mockExtractMarketDetails.mockResolvedValueOnce({
      data: [createRisingTrendMaterial()],
      source: 'api' as const,
    })

    await fetchMarketOpportunities({ forceRefresh: true })

    expect(mockExtractMarketDetails).toHaveBeenCalledWith(
      'test-api-key-12345',
      'g2',
      true
    )
  })

  it('should use default world g2', async () => {
    mockExtractMarketDetails.mockResolvedValueOnce({
      data: [],
      source: 'api' as const,
    })

    await fetchMarketOpportunities()

    expect(mockExtractMarketDetails).toHaveBeenCalledWith(
      'test-api-key-12345',
      'g2',
      false
    )
  })
})

describe('fetchMaterialOpportunity', () => {
  beforeEach(() => {
    mockExtractMarketDetails.mockReset()
  })

  it('should fetch opportunity for specific material', async () => {
    mockExtractMarketDetails.mockResolvedValueOnce({
      data: [createRisingTrendMaterial(42), createFallingTrendMaterial(99)],
      source: 'api' as const,
    })

    const opportunity = await fetchMaterialOpportunity(42)

    expect(opportunity).not.toBeNull()
    expect(opportunity!.materialId).toBe(42)
  })

  it('should return null if material not found', async () => {
    mockExtractMarketDetails.mockResolvedValueOnce({
      data: [createRisingTrendMaterial(1)],
      source: 'api' as const,
    })

    const opportunity = await fetchMaterialOpportunity(999)

    expect(opportunity).toBeNull()
  })
})

describe('filterOpportunities', () => {
  const opportunities: MarketOpportunity[] = [
    {
      materialId: 1,
      opportunityScore: 90,
      recommendation: 'excellent',
      priceTrend: {
        current: 120,
        avg7d: 100,
        avg1d: 110,
        changePercent7d: 20,
        changePercent1d: 9.09,
        direction: 'rising',
      },
      demand: {
        volume7d: 35000,
        volumeAvgPerDay: 5000,
        revenue7d: 0,
        revenueAvgPerDay: 0,
        revenueGapPerDay: 0,
        demandLevel: 'high',
      },
      saturation: {
        askPrice: 120,
        bidPrice: 114,
        spread: 6,
        spreadPercent: 5.26,
        daysOfSupply: 2,
        saturationLevel: 'balanced',
        qtyAvailable: 1000,
        qtySoldDaily: 500,
      },
    },
    {
      materialId: 2,
      opportunityScore: 30,
      recommendation: 'poor',
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
        revenue7d: 0,
        revenueAvgPerDay: 0,
        revenueGapPerDay: 0,
        demandLevel: 'low',
      },
      saturation: {
        askPrice: 80,
        bidPrice: 76,
        spread: 4,
        spreadPercent: 5.26,
        daysOfSupply: 5,
        saturationLevel: 'oversupplied',
        qtyAvailable: 1000,
        qtySoldDaily: 200,
      },
    },
    {
      materialId: 3,
      opportunityScore: 50,
      recommendation: 'neutral',
      priceTrend: {
        current: 102,
        avg7d: 100,
        avg1d: 101,
        changePercent7d: 2,
        changePercent1d: 0.99,
        direction: 'stable',
      },
      demand: {
        volume7d: 3500,
        volumeAvgPerDay: 500,
        revenue7d: 0,
        revenueAvgPerDay: 0,
        revenueGapPerDay: 0,
        demandLevel: 'medium',
      },
      saturation: {
        askPrice: 102,
        bidPrice: 96.9,
        spread: 5.1,
        spreadPercent: 5.26,
        daysOfSupply: 2,
        saturationLevel: 'balanced',
        qtyAvailable: 1000,
        qtySoldDaily: 500,
      },
    },
  ]

  it('should filter by minimum opportunity score', () => {
    const filtered = filterOpportunities(opportunities, { minOpportunityScore: 50 })
    expect(filtered).toHaveLength(2)
    expect(filtered[0].materialId).toBe(1)
    expect(filtered[1].materialId).toBe(3)
  })

  it('should filter by demand levels', () => {
    const filtered = filterOpportunities(opportunities, { demandLevels: ['high'] })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].materialId).toBe(1)
  })

  it('should filter by multiple demand levels', () => {
    const filtered = filterOpportunities(opportunities, {
      demandLevels: ['high', 'medium'],
    })
    expect(filtered).toHaveLength(2)
    expect(filtered[0].materialId).toBe(1)
    expect(filtered[1].materialId).toBe(3)
  })

  it('should filter by trend directions', () => {
    const filtered = filterOpportunities(opportunities, { trendDirections: ['rising'] })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].materialId).toBe(1)
  })

  it('should filter by multiple trend directions', () => {
    const filtered = filterOpportunities(opportunities, {
      trendDirections: ['rising', 'stable'],
    })
    expect(filtered).toHaveLength(2)
    expect(filtered[0].materialId).toBe(1)
    expect(filtered[1].materialId).toBe(3)
  })

  it('should apply multiple filters together', () => {
    const filtered = filterOpportunities(opportunities, {
      minOpportunityScore: 40,
      demandLevels: ['high', 'medium'],
      trendDirections: ['rising'],
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].materialId).toBe(1)
  })

  it('should return all opportunities when no filters applied', () => {
    const filtered = filterOpportunities(opportunities, {})
    expect(filtered).toHaveLength(3)
  })
})

describe('sortByOpportunityScore', () => {
  it('should sort opportunities by score descending', () => {
    const opportunities = [
      { materialId: 1, opportunityScore: 30 } as MarketOpportunity,
      { materialId: 2, opportunityScore: 90 } as MarketOpportunity,
      { materialId: 3, opportunityScore: 60 } as MarketOpportunity,
    ]

    const sorted = sortByOpportunityScore(opportunities)
    expect(sorted[0].opportunityScore).toBe(90)
    expect(sorted[1].opportunityScore).toBe(60)
    expect(sorted[2].opportunityScore).toBe(30)
  })

  it('should not mutate original array', () => {
    const opportunities = [
      { materialId: 1, opportunityScore: 30 } as MarketOpportunity,
      { materialId: 2, opportunityScore: 90 } as MarketOpportunity,
    ]

    const original = [...opportunities]
    sortByOpportunityScore(opportunities)

    expect(opportunities).toEqual(original)
  })
})

describe('getTopOpportunities', () => {
  beforeEach(() => {
    mockExtractMarketDetails.mockReset()
  })

  it('should return top N opportunities', async () => {
    mockExtractMarketDetails.mockResolvedValueOnce({
      data: [
        createRisingTrendMaterial(1),
        createFallingTrendMaterial(2),
        createStableTrendMaterial(3),
        createHighDemandMaterial(4),
      ],
      source: 'api' as const,
    })

    const topOpportunities = await getTopOpportunities(2)

    expect(topOpportunities).toHaveLength(2)
    // Should be sorted by score, so highest scores first
    expect(topOpportunities[0].opportunityScore).toBeGreaterThanOrEqual(
      topOpportunities[1].opportunityScore
    )
  })

  it('should apply filters before limiting', async () => {
    mockExtractMarketDetails.mockResolvedValueOnce({
      data: [
        createHighDemandMaterial(1),
        createMediumDemandMaterial(2),
        createLowDemandMaterial(3),
      ],
      source: 'api' as const,
    })

    const topOpportunities = await getTopOpportunities(5, {}, { demandLevels: ['high'] })

    // Both high and medium fixtures are classified as 'high' (>$500k/day)
    expect(topOpportunities).toHaveLength(2)
    expect(topOpportunities.every(opp => opp.demand.demandLevel === 'high')).toBe(true)
  })

  it('should handle empty results', async () => {
    mockExtractMarketDetails.mockResolvedValueOnce({
      data: [],
      source: 'api' as const,
    })

    const topOpportunities = await getTopOpportunities(10)

    expect(topOpportunities).toHaveLength(0)
  })
})
