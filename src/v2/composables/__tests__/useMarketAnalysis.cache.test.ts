import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMarketAnalysis } from '../useMarketAnalysis'
import type { MarketOpportunity } from '@/v2/services/marketAnalysis'

vi.mock('@/v2/services/api/apiKeyManager', () => ({
  getWorld: () => 'g2',
}))

vi.mock('@/v2/services/marketAnalysis', () => {
  const opportunities: MarketOpportunity[] = [
    {
      materialId: 1,
      opportunityScore: 10,
      recommendation: 'neutral',
      demand: {
        volume7d: 700,
        volumeAvgPerDay: 100,
        revenue7d: 70000,
        revenueAvgPerDay: 10000,
        revenueGapPerDay: 5000,
        demandLevel: 'high',
      },
      priceTrend: {
        current: 120,
        avg7d: 100,
        avg1d: 110,
        changePercent7d: 20,
        changePercent1d: 9.09,
        direction: 'rising',
      },
      saturation: {
        askPrice: 120,
        bidPrice: 114,
        spread: 6,
        spreadPercent: 5.26,
        daysOfSupply: 1.5,
        saturationLevel: 'balanced',
        qtyAvailable: 150,
        qtySoldDaily: 100,
      },
    },
  ]

  return {
    fetchMarketOpportunitiesWithTs: vi.fn(async () => ({ opportunities, ts: 123 })),
    filterOpportunities: (o: MarketOpportunity[]) => o,
    sortByOpportunityScore: (o: MarketOpportunity[]) => o,
  }
})

const clearStorage = () => {
  localStorage.clear()
}

describe('useMarketAnalysis caching', () => {
  beforeEach(() => {
    clearStorage()
  })

  it('preloads opportunities from cache on init', async () => {
    const cached: MarketOpportunity[] = [
      {
        materialId: 99,
        opportunityScore: 3,
        recommendation: 'neutral',
        demand: {
          volume7d: 350,
          volumeAvgPerDay: 50,
          revenue7d: 3500,
          revenueAvgPerDay: 500,
          revenueGapPerDay: -2500,
          demandLevel: 'medium',
        },
        priceTrend: {
          current: 105,
          avg7d: 100,
          avg1d: 102,
          changePercent7d: 5,
          changePercent1d: 2.94,
          direction: 'rising',
        },
        saturation: {
          askPrice: 105,
          bidPrice: 100,
          spread: 5,
          spreadPercent: 5,
          daysOfSupply: 3,
          saturationLevel: 'balanced',
          qtyAvailable: 150,
          qtySoldDaily: 50,
        },
      },
    ]
    localStorage.setItem('gt:v2:market:g2:opportunities', JSON.stringify(cached))
    localStorage.setItem('gt:v2:market:g2:ts', '999')

    const { opportunities, lastUpdated } = useMarketAnalysis()

    expect(opportunities.value).toEqual(cached)
    expect(lastUpdated.value).toBe(999)
  })

  it('stores opportunities to cache after fetch', async () => {
    const { opportunities, fetch, lastUpdated } = useMarketAnalysis()

    await fetch()

    const stored = localStorage.getItem('gt:v2:market:g2:opportunities')
    const storedTs = localStorage.getItem('gt:v2:market:g2:ts')

    expect(stored).not.toBeNull()
    expect(JSON.parse(stored || '[]')).toEqual(opportunities.value)
    expect(Number(storedTs)).toBe(lastUpdated.value)
  })
})
