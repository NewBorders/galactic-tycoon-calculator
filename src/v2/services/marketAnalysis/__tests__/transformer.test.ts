/**
 * Market Analysis Transformer Tests
 * Tests business logic for calculating trends, demand, saturation, and opportunity scores
 */

import { describe, it, expect } from 'vitest'
import {
  calculatePriceTrend,
  calculateMarketDemand,
  calculateMarketSaturation,
  calculateOpportunityScore,
  getRecommendation,
  transformToMarketOpportunity,
  transformMarketData,
} from '../transformer'
import type { MaterialDetailsRaw } from '../types'

describe('calculatePriceTrend', () => {
  it('should calculate rising trend when current price is higher than avg7d', () => {
    const raw: MaterialDetailsRaw = {
      id: 1,
      lp: 120,
      avg7d: 100,
      avg1d: 110,
      minprice: null,
      maxprice: null,
      ask: null,
      bid: null,
      ls: null,
      lv: null,
    }

    const trend = calculatePriceTrend(raw)
    expect(trend).not.toBeNull()
    expect(trend!.direction).toBe('rising')
    expect(trend!.changePercent7d).toBe(20)
    expect(trend!.changePercent1d).toBeCloseTo(9.09, 1)
  })

  it('should calculate falling trend when current price is lower than avg7d', () => {
    const raw: MaterialDetailsRaw = {
      id: 1,
      lp: 80,
      avg7d: 100,
      avg1d: 90,
      minprice: null,
      maxprice: null,
      ask: null,
      bid: null,
      ls: null,
      lv: null,
    }

    const trend = calculatePriceTrend(raw)
    expect(trend).not.toBeNull()
    expect(trend!.direction).toBe('falling')
    expect(trend!.changePercent7d).toBe(-20)
  })

  it('should calculate stable trend for small price changes', () => {
    const raw: MaterialDetailsRaw = {
      id: 1,
      lp: 102,
      avg7d: 100,
      avg1d: 101,
      minprice: null,
      maxprice: null,
      ask: null,
      bid: null,
      ls: null,
      lv: null,
    }

    const trend = calculatePriceTrend(raw)
    expect(trend).not.toBeNull()
    expect(trend!.direction).toBe('stable')
    expect(trend!.changePercent7d).toBe(2)
  })

  it('should return null when essential data is missing', () => {
    const raw: MaterialDetailsRaw = {
      id: 1,
      lp: null,
      avg7d: null,
      avg1d: null,
      minprice: null,
      maxprice: null,
      ask: null,
      bid: null,
      ls: null,
      lv: null,
    }

    const trend = calculatePriceTrend(raw)
    expect(trend).toBeNull()
  })

  it('should use avg1d as current when lp is not available', () => {
    const raw: MaterialDetailsRaw = {
      id: 1,
      lp: null,
      avg7d: 100,
      avg1d: 105,
      minprice: null,
      maxprice: null,
      ask: null,
      bid: null,
      ls: null,
      lv: null,
    }

    const trend = calculatePriceTrend(raw)
    expect(trend).not.toBeNull()
    expect(trend!.current).toBe(105)
    expect(trend!.direction).toBe('stable')
  })
})

describe('calculateMarketDemand', () => {
  it('should calculate high demand for high volume', () => {
    const raw: MaterialDetailsRaw = {
      id: 1,
      lp: 100,
      avg7d: 100,
      avg1d: 100,
      minprice: null,
      maxprice: null,
      ask: null,
      bid: null,
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
    }

    const demand = calculateMarketDemand(raw)
    expect(demand).not.toBeNull()
    expect(demand!.volume7d).toBe(13500)
    expect(demand!.volumeAvgPerDay).toBeCloseTo(1928.57, 1)
    expect(demand!.demandLevel).toBe('high')
  })

  it('should calculate medium demand for medium volume', () => {
    const raw: MaterialDetailsRaw = {
      id: 1,
      lp: 100,
      avg7d: 100,
      avg1d: 100,
      minprice: null,
      maxprice: null,
      ask: null,
      bid: null,
      ls: null,
      lv: null,
      history: [
        { t: '2024-01-01', v: 200, p: 100 },
        { t: '2024-01-02', v: 150, p: 100 },
        { t: '2024-01-03', v: 180, p: 100 },
        { t: '2024-01-04', v: 220, p: 100 },
        { t: '2024-01-05', v: 190, p: 100 },
        { t: '2024-01-06', v: 210, p: 100 },
        { t: '2024-01-07', v: 200, p: 100 },
      ],
    }

    const demand = calculateMarketDemand(raw)
    expect(demand).not.toBeNull()
    expect(demand!.demandLevel).toBe('medium')
  })

  it('should calculate low demand for low volume', () => {
    const raw: MaterialDetailsRaw = {
      id: 1,
      lp: 100,
      avg7d: 100,
      avg1d: 100,
      minprice: null,
      maxprice: null,
      ask: null,
      bid: null,
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
    }

    const demand = calculateMarketDemand(raw)
    expect(demand).not.toBeNull()
    expect(demand!.demandLevel).toBe('low')
  })

  it('should return null when history is missing', () => {
    const raw: MaterialDetailsRaw = {
      id: 1,
      lp: 100,
      avg7d: 100,
      avg1d: 100,
      minprice: null,
      maxprice: null,
      ask: null,
      bid: null,
      ls: null,
      lv: null,
    }

    const demand = calculateMarketDemand(raw)
    expect(demand).toBeNull()
  })
})

describe('calculateMarketSaturation', () => {
  it('should calculate oversupplied market for wide spread', () => {
    const raw: MaterialDetailsRaw = {
      id: 1,
      lp: 100,
      avg7d: 100,
      avg1d: 100,
      ask: 130,
      bid: 100,
      minprice: null,
      maxprice: null,
      ls: null,
      lv: null,
    }

    const saturation = calculateMarketSaturation(raw)
    expect(saturation.saturationLevel).toBe('oversupplied')
    expect(saturation.spread).toBe(30)
    expect(saturation.spreadPercent).toBe(30)
  })

  it('should calculate undersupplied market for narrow spread', () => {
    const raw: MaterialDetailsRaw = {
      id: 1,
      lp: 100,
      avg7d: 100,
      avg1d: 100,
      ask: 103,
      bid: 100,
      minprice: null,
      maxprice: null,
      ls: null,
      lv: null,
    }

    const saturation = calculateMarketSaturation(raw)
    expect(saturation.saturationLevel).toBe('undersupplied')
    expect(saturation.spread).toBe(3)
    expect(saturation.spreadPercent).toBe(3)
  })

  it('should calculate balanced market for medium spread', () => {
    const raw: MaterialDetailsRaw = {
      id: 1,
      lp: 100,
      avg7d: 100,
      avg1d: 100,
      ask: 110,
      bid: 100,
      minprice: null,
      maxprice: null,
      ls: null,
      lv: null,
    }

    const saturation = calculateMarketSaturation(raw)
    expect(saturation.saturationLevel).toBe('balanced')
    expect(saturation.spreadPercent).toBe(10)
  })

  it('should return unknown when ask or bid is missing', () => {
    const raw: MaterialDetailsRaw = {
      id: 1,
      lp: 100,
      avg7d: 100,
      avg1d: 100,
      ask: null,
      bid: null,
      minprice: null,
      maxprice: null,
      ls: null,
      lv: null,
    }

    const saturation = calculateMarketSaturation(raw)
    expect(saturation.saturationLevel).toBe('unknown')
    expect(saturation.spread).toBeNull()
  })
})

describe('calculateOpportunityScore', () => {
  it('should give high score for rising trend, high demand, undersupplied', () => {
    const trend = {
      current: 120,
      avg7d: 100,
      avg1d: 110,
      changePercent7d: 20,
      changePercent1d: 9.09,
      direction: 'rising' as const,
    }
    const demand = {
      volume7d: 14000,
      volumeAvgPerDay: 2000,
      demandLevel: 'high' as const,
    }
    const saturation = {
      askPrice: 125,
      bidPrice: 120,
      spread: 5,
      spreadPercent: 4.17,
      saturationLevel: 'undersupplied' as const,
    }

    const score = calculateOpportunityScore(trend, demand, saturation)
    expect(score).toBeGreaterThan(80)
  })

  it('should give low score for falling trend, low demand, oversupplied', () => {
    const trend = {
      current: 80,
      avg7d: 100,
      avg1d: 90,
      changePercent7d: -20,
      changePercent1d: -11.11,
      direction: 'falling' as const,
    }
    const demand = {
      volume7d: 350,
      volumeAvgPerDay: 50,
      demandLevel: 'low' as const,
    }
    const saturation = {
      askPrice: 130,
      bidPrice: 100,
      spread: 30,
      spreadPercent: 30,
      saturationLevel: 'oversupplied' as const,
    }

    const score = calculateOpportunityScore(trend, demand, saturation)
    expect(score).toBeLessThan(30)
  })

  it('should give medium score for stable trend, medium demand, balanced', () => {
    const trend = {
      current: 102,
      avg7d: 100,
      avg1d: 101,
      changePercent7d: 2,
      changePercent1d: 1,
      direction: 'stable' as const,
    }
    const demand = {
      volume7d: 1400,
      volumeAvgPerDay: 200,
      demandLevel: 'medium' as const,
    }
    const saturation = {
      askPrice: 110,
      bidPrice: 100,
      spread: 10,
      spreadPercent: 10,
      saturationLevel: 'balanced' as const,
    }

    const score = calculateOpportunityScore(trend, demand, saturation)
    expect(score).toBeGreaterThan(40)
    expect(score).toBeLessThan(70)
  })

  it('should handle null trend and demand', () => {
    const saturation = {
      askPrice: 110,
      bidPrice: 100,
      spread: 10,
      spreadPercent: 10,
      saturationLevel: 'balanced' as const,
    }

    const score = calculateOpportunityScore(null, null, saturation)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

describe('getRecommendation', () => {
  it('should return no-data when hasData is false', () => {
    expect(getRecommendation(50, false)).toBe('no-data')
  })

  it('should return strong-buy for score >= 80', () => {
    expect(getRecommendation(85, true)).toBe('strong-buy')
  })

  it('should return buy for score >= 60', () => {
    expect(getRecommendation(65, true)).toBe('buy')
  })

  it('should return hold for score >= 40', () => {
    expect(getRecommendation(50, true)).toBe('hold')
  })

  it('should return sell for score >= 20', () => {
    expect(getRecommendation(25, true)).toBe('sell')
  })

  it('should return strong-sell for score < 20', () => {
    expect(getRecommendation(15, true)).toBe('strong-sell')
  })
})

describe('transformToMarketOpportunity', () => {
  it('should transform complete raw data to market opportunity', () => {
    const raw: MaterialDetailsRaw = {
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
      history: [
        { t: '2024-01-01', v: 2000, p: 100 },
        { t: '2024-01-02', v: 1500, p: 100 },
        { t: '2024-01-03', v: 1800, p: 100 },
        { t: '2024-01-04', v: 2200, p: 100 },
        { t: '2024-01-05', v: 1900, p: 100 },
        { t: '2024-01-06', v: 2100, p: 100 },
        { t: '2024-01-07', v: 2000, p: 100 },
      ],
    }

    const opportunity = transformToMarketOpportunity(raw)
    expect(opportunity.materialId).toBe(42)
    expect(opportunity.priceTrend.direction).toBe('rising')
    expect(opportunity.demand.demandLevel).toBe('high')
    expect(opportunity.saturation.saturationLevel).toBe('undersupplied')
    expect(opportunity.opportunityScore).toBeGreaterThan(70)
    expect(opportunity.recommendation).toMatch(/buy|strong-buy/)
  })

  it('should handle incomplete data gracefully', () => {
    const raw: MaterialDetailsRaw = {
      id: 42,
      lp: null,
      avg7d: null,
      avg1d: null,
      ask: null,
      bid: null,
      minprice: null,
      maxprice: null,
      ls: null,
      lv: null,
    }

    const opportunity = transformToMarketOpportunity(raw)
    expect(opportunity.materialId).toBe(42)
    expect(opportunity.recommendation).toBe('no-data')
  })
})

describe('transformMarketData', () => {
  it('should transform array of materials', () => {
    const materials: MaterialDetailsRaw[] = [
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
    ]

    const opportunities = transformMarketData(materials)
    expect(opportunities).toHaveLength(2)
    expect(opportunities[0].materialId).toBe(1)
    expect(opportunities[1].materialId).toBe(2)
  })
})
