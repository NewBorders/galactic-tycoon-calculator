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
import {
  createRisingTrendMaterial,
  createFallingTrendMaterial,
  createStableTrendMaterial,
  createHighDemandMaterial,
  createMediumDemandMaterial,
  createLowDemandMaterial,
  createNoHistoryMaterial,
  createOversuppliedMaterial,
  createUndersuppliedMaterial,
  createBalancedMaterial,
} from './testFixtures'

describe('calculatePriceTrend', () => {
  it('should calculate rising trend when current price is higher than avg7d', () => {
    const raw = createRisingTrendMaterial()

    const trend = calculatePriceTrend(raw)
    expect(trend).not.toBeNull()
    expect(trend!.direction).toBe('rising')
    expect(trend!.changePercent7d).toBe(20) // (120-100)/100 * 100
    expect(trend!.current).toBe(120)
    expect(trend!.avg7d).toBe(100)
  })

  it('should calculate falling trend when current price is lower than avg7d', () => {
    const raw = createFallingTrendMaterial()

    const trend = calculatePriceTrend(raw)
    expect(trend).not.toBeNull()
    expect(trend!.direction).toBe('falling')
    expect(trend!.changePercent7d).toBe(-20) // (80-100)/100 * 100
  })

  it('should calculate stable trend for small price changes', () => {
    const raw = createStableTrendMaterial()

    const trend = calculatePriceTrend(raw)
    expect(trend).not.toBeNull()
    expect(trend!.direction).toBe('stable')
    expect(trend!.changePercent7d).toBe(2) // (102-100)/100 * 100
  })

  it('should return null when price history is empty', () => {
    const raw = createNoHistoryMaterial()

    const trend = calculatePriceTrend(raw)
    expect(trend).toBeNull()
  })

  it('should use first history entry as avg1d', () => {
    const raw = createRisingTrendMaterial()

    const trend = calculatePriceTrend(raw)
    expect(trend).not.toBeNull()
    expect(trend!.avg1d).toBe(110) // First history entry
  })

  it('should return null when avgPrice is zero (division by zero protection)', () => {
    const raw = createRisingTrendMaterial()
    raw.avgPrice = 0

    const trend = calculatePriceTrend(raw)
    expect(trend).toBeNull()
  })

  it('should handle avg1d of zero without crashing', () => {
    const raw = createRisingTrendMaterial()
    raw.priceHistory[0].avgPrice = 0

    const trend = calculatePriceTrend(raw)
    expect(trend).not.toBeNull()
    expect(trend!.changePercent1d).toBe(0) // Fallback to 0 when division by zero
  })
})

describe('calculateMarketDemand', () => {
  it('should classify high demand correctly', () => {
    const raw = createHighDemandMaterial()

    const demand = calculateMarketDemand(raw)
    expect(demand).not.toBeNull()
    expect(demand!.demandLevel).toBe('high')
    expect(demand!.volumeAvgPerDay).toBe(5000)
  })

  it('should classify medium demand correctly', () => {
    const raw = createMediumDemandMaterial()

    const demand = calculateMarketDemand(raw)
    expect(demand).not.toBeNull()
    expect(demand!.demandLevel).toBe('medium')
    expect(demand!.volumeAvgPerDay).toBe(500)
  })

  it('should classify low demand correctly', () => {
    const raw = createLowDemandMaterial()

    const demand = calculateMarketDemand(raw)
    expect(demand).not.toBeNull()
    expect(demand!.demandLevel).toBe('low')
    expect(demand!.volumeAvgPerDay).toBe(50)
  })

  it('should calculate total 7-day volume from history', () => {
    const raw = createHighDemandMaterial()

    const demand = calculateMarketDemand(raw)
    expect(demand).not.toBeNull()
    expect(demand!.volume7d).toBe(35000) // 5000 * 7 days
  })

  it('should return null when history is empty', () => {
    const raw = createNoHistoryMaterial()

    const demand = calculateMarketDemand(raw)
    expect(demand).toBeNull()
  })
})

describe('calculateMarketSaturation', () => {
  it('should detect oversupplied market (>3 days supply)', () => {
    const raw = createOversuppliedMaterial()

    const saturation = calculateMarketSaturation(raw)
    expect(saturation.saturationLevel).toBe('oversupplied')
  })

  it('should detect undersupplied market (<1 day supply)', () => {
    const raw = createUndersuppliedMaterial()

    const saturation = calculateMarketSaturation(raw)
    expect(saturation.saturationLevel).toBe('undersupplied')
  })

  it('should detect balanced market (1-3 days supply)', () => {
    const raw = createBalancedMaterial()

    const saturation = calculateMarketSaturation(raw)
    expect(saturation.saturationLevel).toBe('balanced')
  })

  it('should calculate prices and spread', () => {
    const raw = createBalancedMaterial()

    const saturation = calculateMarketSaturation(raw)
    expect(saturation.askPrice).toBe(raw.currentPrice)
    expect(saturation.bidPrice).toBeCloseTo(raw.currentPrice * 0.95)
    expect(saturation.spread).toBeGreaterThan(0)
    expect(saturation.spreadPercent).toBeCloseTo(5.26, 1)
  })

  it('should handle empty orders', () => {
    const raw = createNoHistoryMaterial()
    raw.orders = []

    const saturation = calculateMarketSaturation(raw)
    expect(saturation.saturationLevel).toBe('unknown')
    expect(saturation.askPrice).toBeNull()
    expect(saturation.bidPrice).toBeNull()
  })

  it('should handle avgQtySoldDaily of zero (division by zero protection)', () => {
    const raw = createBalancedMaterial()
    raw.avgQtySoldDaily = 0

    const saturation = calculateMarketSaturation(raw)
    // Should not crash, should set daysOfSupply to 0
    expect(saturation.saturationLevel).toBe('undersupplied') // 0 days = undersupplied
  })

  it('should handle bidPrice of zero (division by zero protection)', () => {
    const raw = createBalancedMaterial()
    raw.currentPrice = 0

    const saturation = calculateMarketSaturation(raw)
    expect(saturation.spreadPercent).toBe(0) // Fallback to 0 when bidPrice is 0
  })
})

describe('calculateOpportunityScore', () => {
  it('should give high score for rising trend + high demand + undersupplied', () => {
    const trend = calculatePriceTrend(createRisingTrendMaterial())!
    const demand = calculateMarketDemand(createHighDemandMaterial())!
    const saturation = calculateMarketSaturation(createUndersuppliedMaterial())

    const score = calculateOpportunityScore(trend, demand, saturation)
    expect(score).toBeGreaterThan(80) // 50 + 20 (rising) + 20 (high demand) + 10 (undersupplied)
  })

  it('should give low score for falling trend + low demand + oversupplied', () => {
    const trend = calculatePriceTrend(createFallingTrendMaterial())!
    const demand = calculateMarketDemand(createLowDemandMaterial())!
    const saturation = calculateMarketSaturation(createOversuppliedMaterial())

    const score = calculateOpportunityScore(trend, demand, saturation)
    expect(score).toBeLessThan(30) // 50 - 20 (falling) - 10 (low demand) - 10 (oversupplied)
  })

  it('should give neutral score for stable trend + medium demand + balanced', () => {
    const trend = calculatePriceTrend(createStableTrendMaterial())!
    const demand = calculateMarketDemand(createMediumDemandMaterial())!
    const saturation = calculateMarketSaturation(createBalancedMaterial())

    const score = calculateOpportunityScore(trend, demand, saturation)
    expect(score).toBeGreaterThanOrEqual(50)
    expect(score).toBeLessThanOrEqual(65) // 50 + 0 (stable) + 10 (medium) + 0 (balanced)
  })

  it('should clamp scores to 0-100 range', () => {
    const trend = calculatePriceTrend(createFallingTrendMaterial())!
    const demand = calculateMarketDemand(createLowDemandMaterial())!
    const saturation = calculateMarketSaturation(createOversuppliedMaterial())

    const score = calculateOpportunityScore(trend, demand, saturation)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

describe('getRecommendation', () => {
  it('should recommend strong-buy for score >= 80', () => {
    expect(getRecommendation(90, true)).toBe('strong-buy')
    expect(getRecommendation(80, true)).toBe('strong-buy')
  })

  it('should recommend buy for score 60-79', () => {
    expect(getRecommendation(70, true)).toBe('buy')
    expect(getRecommendation(60, true)).toBe('buy')
  })

  it('should recommend hold for score 40-59', () => {
    expect(getRecommendation(50, true)).toBe('hold')
    expect(getRecommendation(40, true)).toBe('hold')
  })

  it('should recommend sell for score 20-39', () => {
    expect(getRecommendation(30, true)).toBe('sell')
    expect(getRecommendation(20, true)).toBe('sell')
  })

  it('should recommend strong-sell for score < 20', () => {
    expect(getRecommendation(10, true)).toBe('strong-sell')
    expect(getRecommendation(0, true)).toBe('strong-sell')
  })

  it('should recommend no-data when hasData is false', () => {
    expect(getRecommendation(90, false)).toBe('no-data')
    expect(getRecommendation(50, false)).toBe('no-data')
  })
})

describe('transformToMarketOpportunity', () => {
  it('should transform rising trend material correctly', () => {
    const raw = createRisingTrendMaterial(42)

    const opportunity = transformToMarketOpportunity(raw)
    expect(opportunity.materialId).toBe(42)
    expect(opportunity.priceTrend.direction).toBe('rising')
    expect(opportunity.demand.demandLevel).toBe('medium')
    expect(opportunity.opportunityScore).toBeGreaterThan(50)
    expect(opportunity.recommendation).toMatch(/buy|strong-buy/)
  })

  it('should transform falling trend material correctly', () => {
    const raw = createFallingTrendMaterial(99)

    const opportunity = transformToMarketOpportunity(raw)
    expect(opportunity.materialId).toBe(99)
    expect(opportunity.priceTrend.direction).toBe('falling')
    expect(opportunity.opportunityScore).toBeLessThan(50)
    expect(opportunity.recommendation).toMatch(/sell|strong-sell/)
  })

  it('should handle materials with no history', () => {
    const raw = createNoHistoryMaterial(123)

    const opportunity = transformToMarketOpportunity(raw)
    expect(opportunity.materialId).toBe(123)
    expect(opportunity.recommendation).toBe('no-data')
  })
})

describe('transformMarketData', () => {
  it('should transform array of materials', () => {
    const materials = [
      createRisingTrendMaterial(1),
      createFallingTrendMaterial(2),
    ]

    const opportunities = transformMarketData(materials)
    expect(opportunities).toHaveLength(2)
    expect(opportunities[0].materialId).toBe(1)
    expect(opportunities[1].materialId).toBe(2)
  })

  it('should handle empty array', () => {
    const opportunities = transformMarketData([])
    expect(opportunities).toHaveLength(0)
  })
})
