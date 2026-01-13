import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMarketAnalysis } from '../useMarketAnalysis'
import type { MarketOpportunity } from '@/v2/services/marketAnalysis'

vi.mock('@/v2/services/marketAnalysis', () => {
  const opportunities: MarketOpportunity[] = [
    {
      materialId: 1,
      opportunityScore: 10,
      recommendation: 'buy',
      demand: { demandLevel: 'high', demandScore: 10 },
      priceTrend: { changePercent7d: 5, changePercent24h: 1, direction: 'rising' },
      supply: { supplyLevel: 'low', supplyScore: 2 },
      profitability: { profitPerUnit: 100, profitPerDay: 200, marginPercent: 15 },
      volume: { volumePerDay: 1000 },
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
        recommendation: 'hold',
        demand: { demandLevel: 'medium', demandScore: 5 },
        priceTrend: { changePercent7d: 2, changePercent24h: 0.5, direction: 'rising' },
        supply: { supplyLevel: 'medium', supplyScore: 5 },
        profitability: { profitPerUnit: 5, profitPerDay: 10, marginPercent: 2 },
        volume: { volumePerDay: 50 },
      },
    ]
    localStorage.setItem('gt:v2:market:opportunities', JSON.stringify(cached))
    localStorage.setItem('gt:v2:market:ts', '999')

    const { opportunities, lastUpdated } = useMarketAnalysis()

    expect(opportunities.value).toEqual(cached)
    expect(lastUpdated.value).toBe(999)
  })

  it('stores opportunities to cache after fetch', async () => {
    const { opportunities, fetch, lastUpdated } = useMarketAnalysis()

    await fetch()

    const stored = localStorage.getItem('gt:v2:market:opportunities')
    const storedTs = localStorage.getItem('gt:v2:market:ts')

    expect(stored).not.toBeNull()
    expect(JSON.parse(stored || '[]')).toEqual(opportunities.value)
    expect(Number(storedTs)).toBe(lastUpdated.value)
  })
})
