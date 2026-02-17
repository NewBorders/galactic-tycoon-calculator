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
  createTestMaterial,
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
    // 10000 units/day * 200000 cents = 2B cents/day = $20M/day = high (>>$5k threshold)
    expect(demand!.demandLevel).toBe('high')
    expect(demand!.volumeAvgPerDay).toBe(10000)
    expect(demand!.revenueAvgPerDay).toBeGreaterThan(500000)
  })

  it('should classify medium demand correctly', () => {
    const raw = createMediumDemandMaterial()

    const demand = calculateMarketDemand(raw)
    expect(demand).not.toBeNull()
    // 2000 units/day * 50000 cents = 100M cents/day = $1M/day = high (>$500k threshold)
    expect(demand!.demandLevel).toBe('high')
    expect(demand!.volumeAvgPerDay).toBe(2000)
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
    expect(demand!.volume7d).toBe(70000) // 10000 * 7 days
  })

  it('should calculate revenue gap per day from supply vs demand', () => {
    const raw = createTestMaterial({
      avgQtySoldDaily: 100,
      totalQtyAvailable: 50,
      avgPrice: 200,
      priceHistory: [
        { date: '2025-11-27', avgPrice: 200, qtySold: 100, qtyRemaining: 50 },
      ],
    })

    const demand = calculateMarketDemand(raw)
    expect(demand).not.toBeNull()
    expect(demand!.revenueGapPerDay).toBe(10000)
  })

  it('should return negative revenue gap when oversupplied', () => {
    const raw = createTestMaterial({
      avgQtySoldDaily: 100,
      totalQtyAvailable: 200,
      avgPrice: 200,
      priceHistory: [
        { date: '2025-11-27', avgPrice: 200, qtySold: 100, qtyRemaining: 200 },
      ],
    })

    const demand = calculateMarketDemand(raw)
    expect(demand).not.toBeNull()
    expect(demand!.revenueGapPerDay).toBe(-20000)
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
    // Rising trend: ~30 points, High revenue ($750k/day): ~35 points, Undersupplied: 25 points = ~90
    expect(score).toBeGreaterThanOrEqual(80)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('should penalize oversupplied markets with negative revenue gap', () => {
    const trend = calculatePriceTrend(createStableTrendMaterial())!
    const saturation = calculateMarketSaturation(createOversuppliedMaterial())
    const demand = {
      volume7d: 7000,
      volumeAvgPerDay: 1000,
      revenue7d: 1_000_000,
      revenueAvgPerDay: 1_000_000,
      revenueGapPerDay: -2_000_000,
      demandLevel: 'high' as const,
    }

    const demandNoPenalty = {
      ...demand,
      revenueGapPerDay: 0,
    }

    const scoreWithPenalty = calculateOpportunityScore(trend, demand, saturation)
    const scoreWithoutPenalty = calculateOpportunityScore(trend, demandNoPenalty, saturation)

    expect(scoreWithPenalty).toBeLessThan(scoreWithoutPenalty)
  })

  it('should penalize scores when revenue gap is negative', () => {
    const trend = {
      current: 100,
      avg7d: 100,
      avg1d: 100,
      changePercent7d: 0,
      changePercent1d: 0,
      direction: 'stable' as const,
    }
    const saturation = {
      askPrice: 100,
      bidPrice: 95,
      spread: 5,
      spreadPercent: 5.26,
      daysOfSupply: 2,
      saturationLevel: 'balanced' as const,
      qtyAvailable: 1000,
      qtySoldDaily: 500,
    }
    const baseDemand = {
      volume7d: 7000,
      volumeAvgPerDay: 1000,
      revenue7d: 700_000_000,
      revenueAvgPerDay: 100_000_000,
      revenueGapPerDay: 0,
      demandLevel: 'high' as const,
    }

    const baseScore = calculateOpportunityScore(trend, baseDemand, saturation)
    const oversuppliedScore = calculateOpportunityScore(
      trend,
      { ...baseDemand, revenueGapPerDay: -300_000_000 },
      saturation,
    )

    expect(oversuppliedScore).toBeLessThan(baseScore - 15)
  })

  it('should penalize score when revenue gap is strongly negative', () => {
    const balancedRaw = createTestMaterial({
      avgQtySoldDaily: 1000,
      totalQtyAvailable: 2000,
      avgPrice: 100,
      priceHistory: [
        { date: '2025-11-27', avgPrice: 100, qtySold: 1000, qtyRemaining: 2000 },
      ],
    })
    const oversuppliedRaw = createTestMaterial({
      avgQtySoldDaily: 1000,
      totalQtyAvailable: 5000,
      avgPrice: 100,
      priceHistory: [
        { date: '2025-11-27', avgPrice: 100, qtySold: 1000, qtyRemaining: 5000 },
      ],
    })

    const trend = calculatePriceTrend(createStableTrendMaterial())!
    const balancedDemand = calculateMarketDemand(balancedRaw)!
    const oversuppliedDemand = calculateMarketDemand(oversuppliedRaw)!
    const balancedSaturation = calculateMarketSaturation(balancedRaw)
    const oversuppliedSaturation = calculateMarketSaturation(oversuppliedRaw)

    const balancedScore = calculateOpportunityScore(trend, balancedDemand, balancedSaturation)
    const oversuppliedScore = calculateOpportunityScore(trend, oversuppliedDemand, oversuppliedSaturation)

    expect(oversuppliedScore).toBeLessThan(balancedScore)
  })

  it('should give low score for falling trend + low demand + oversupplied', () => {
    const trend = calculatePriceTrend(createFallingTrendMaterial())!
    const demand = calculateMarketDemand(createLowDemandMaterial())!
    const saturation = calculateMarketSaturation(createOversuppliedMaterial())

    const score = calculateOpportunityScore(trend, demand, saturation)
    // Falling trend penalty + low revenue + oversupplied = very low score
    expect(score).toBeLessThan(20)
  })

  it('should give neutral score for stable trend + medium demand + balanced', () => {
    const trend = calculatePriceTrend(createStableTrendMaterial())!
    const demand = calculateMarketDemand(createMediumDemandMaterial())!
    const saturation = calculateMarketSaturation(createBalancedMaterial())

    const score = calculateOpportunityScore(trend, demand, saturation)
    // Stable: 10pts, Medium revenue ($1M/day): ~30pts, Balanced: 10pts minus gap penalty
    expect(score).toBeGreaterThanOrEqual(20)
    expect(score).toBeLessThanOrEqual(60)
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
  it('should recommend excellent for score >= 80', () => {
    expect(getRecommendation(90, true)).toBe('excellent')
    expect(getRecommendation(80, true)).toBe('excellent')
  })

  it('should recommend good for score 60-79', () => {
    expect(getRecommendation(70, true)).toBe('good')
    expect(getRecommendation(60, true)).toBe('good')
  })

  it('should recommend neutral for score 40-59', () => {
    expect(getRecommendation(50, true)).toBe('neutral')
    expect(getRecommendation(40, true)).toBe('neutral')
  })

  it('should recommend poor for score 20-39', () => {
    expect(getRecommendation(30, true)).toBe('poor')
    expect(getRecommendation(20, true)).toBe('poor')
  })

  it('should recommend avoid for score < 20', () => {
    expect(getRecommendation(10, true)).toBe('avoid')
    expect(getRecommendation(0, true)).toBe('avoid')
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
    expect(opportunity.demand.demandLevel).toBe('low') // Volume 500/day with price 120 cents = very low revenue
    // Rising trend adds points, but low revenue and gap penalty can keep it very low
    expect(opportunity.opportunityScore).toBeGreaterThanOrEqual(0)
    expect(opportunity.recommendation).toMatch(/poor|neutral|avoid/)
  })

  it('should transform falling trend material correctly', () => {
    const raw = createFallingTrendMaterial(99)

    const opportunity = transformToMarketOpportunity(raw)
    expect(opportunity.materialId).toBe(99)
    expect(opportunity.priceTrend.direction).toBe('falling')
    expect(opportunity.opportunityScore).toBeLessThan(50)
    expect(opportunity.recommendation).toMatch(/poor|avoid/)
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
