/**
 * Market Analysis Transformer
 * ETL - Transform: Converts raw API data to domain models with business logic
 * Calculates trends, demand, saturation, and opportunity scores
 */

import type {
  MaterialDetailsRaw,
  PriceTrend,
  MarketDemand,
  MarketSaturation,
  MarketOpportunity,
} from './types'

/**
 * Calculate price trend from raw material data
 */
export function calculatePriceTrend(raw: MaterialDetailsRaw): PriceTrend | null {
  const current = raw.lp ?? raw.avg1d ?? raw.avg7d
  const avg7d = raw.avg7d
  const avg1d = raw.avg1d

  if (current === null || avg7d === null) {
    return null
  }

  const changePercent7d = ((current - avg7d) / avg7d) * 100
  const changePercent1d = avg1d !== null ? ((current - avg1d) / avg1d) * 100 : 0

  // Determine direction based on 7-day trend
  let direction: 'rising' | 'falling' | 'stable'
  if (changePercent7d > 5) {
    direction = 'rising'
  } else if (changePercent7d < -5) {
    direction = 'falling'
  } else {
    direction = 'stable'
  }

  return {
    current,
    avg7d,
    avg1d: avg1d ?? avg7d,
    changePercent7d,
    changePercent1d,
    direction,
  }
}

/**
 * Calculate market demand from history data
 */
export function calculateMarketDemand(raw: MaterialDetailsRaw): MarketDemand | null {
  if (!raw.history || raw.history.length === 0) {
    return null
  }

  // Sum up volume from all history entries
  const volume7d = raw.history.reduce((sum, entry) => sum + entry.v, 0)
  const volumeAvgPerDay = volume7d / 7

  // Classify demand level based on average daily volume
  let demandLevel: 'high' | 'medium' | 'low'
  if (volumeAvgPerDay > 1000) {
    demandLevel = 'high'
  } else if (volumeAvgPerDay > 100) {
    demandLevel = 'medium'
  } else {
    demandLevel = 'low'
  }

  return {
    volume7d,
    volumeAvgPerDay,
    demandLevel,
  }
}

/**
 * Calculate market saturation from bid/ask spread
 */
export function calculateMarketSaturation(raw: MaterialDetailsRaw): MarketSaturation {
  const askPrice = raw.ask
  const bidPrice = raw.bid

  if (askPrice === null || bidPrice === null) {
    return {
      askPrice,
      bidPrice,
      spread: null,
      spreadPercent: null,
      saturationLevel: 'unknown',
    }
  }

  const spread = askPrice - bidPrice
  const spreadPercent = (spread / bidPrice) * 100

  // Determine saturation level based on spread
  let saturationLevel: 'oversupplied' | 'balanced' | 'undersupplied'
  if (spreadPercent > 20) {
    saturationLevel = 'oversupplied' // Wide spread = low demand
  } else if (spreadPercent < 5) {
    saturationLevel = 'undersupplied' // Narrow spread = high demand
  } else {
    saturationLevel = 'balanced'
  }

  return {
    askPrice,
    bidPrice,
    spread,
    spreadPercent,
    saturationLevel,
  }
}

/**
 * Calculate opportunity score (0-100)
 * Higher score = better opportunity
 * Factors: price trend, demand, saturation
 */
export function calculateOpportunityScore(
  trend: PriceTrend | null,
  demand: MarketDemand | null,
  saturation: MarketSaturation,
): number {
  let score = 50 // Base score

  // Price trend contribution (max ±20 points)
  if (trend) {
    if (trend.direction === 'rising') {
      score += 20
    } else if (trend.direction === 'falling') {
      score -= 20
    }
    // Stable = no change

    // Add bonus for strong trends
    if (Math.abs(trend.changePercent7d) > 15) {
      score += trend.changePercent7d > 0 ? 10 : -10
    }
  }

  // Demand contribution (max ±20 points)
  if (demand) {
    if (demand.demandLevel === 'high') {
      score += 20
    } else if (demand.demandLevel === 'medium') {
      score += 10
    } else {
      score -= 10
    }
  }

  // Saturation contribution (max ±10 points)
  if (saturation.saturationLevel === 'undersupplied') {
    score += 10
  } else if (saturation.saturationLevel === 'oversupplied') {
    score -= 10
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score))
}

/**
 * Determine recommendation based on opportunity score
 */
export function getRecommendation(
  score: number,
  hasData: boolean,
): 'strong-buy' | 'buy' | 'hold' | 'sell' | 'strong-sell' | 'no-data' {
  if (!hasData) {
    return 'no-data'
  }

  if (score >= 80) {
    return 'strong-buy'
  } else if (score >= 60) {
    return 'buy'
  } else if (score >= 40) {
    return 'hold'
  } else if (score >= 20) {
    return 'sell'
  } else {
    return 'strong-sell'
  }
}

/**
 * Transform raw material data to market opportunity
 */
export function transformToMarketOpportunity(raw: MaterialDetailsRaw): MarketOpportunity {
  const priceTrend = calculatePriceTrend(raw)
  const demand = calculateMarketDemand(raw)
  const saturation = calculateMarketSaturation(raw)

  const hasData = priceTrend !== null && demand !== null

  const opportunityScore = calculateOpportunityScore(priceTrend, demand, saturation)
  const recommendation = getRecommendation(opportunityScore, hasData)

  return {
    materialId: raw.id,
    priceTrend: priceTrend ?? {
      current: 0,
      avg7d: 0,
      avg1d: 0,
      changePercent7d: 0,
      changePercent1d: 0,
      direction: 'stable',
    },
    demand: demand ?? {
      volume7d: 0,
      volumeAvgPerDay: 0,
      demandLevel: 'low',
    },
    saturation,
    opportunityScore,
    recommendation,
  }
}

/**
 * Transform array of raw materials to market opportunities
 */
export function transformMarketData(materials: MaterialDetailsRaw[]): MarketOpportunity[] {
  return materials.map(transformToMarketOpportunity)
}
