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
  const current = raw.currentPrice
  const avg7d = raw.avgPrice

  if (!raw.priceHistory || raw.priceHistory.length === 0) {
    return null
  }

  // Prevent division by zero
  if (avg7d === 0) {
    return null
  }

  // Get 1-day average (yesterday's price)
  const avg1d = raw.priceHistory[0]?.avgPrice ?? avg7d

  const changePercent7d = ((current - avg7d) / avg7d) * 100
  const changePercent1d = avg1d !== 0 ? ((current - avg1d) / avg1d) * 100 : 0

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
    avg1d,
    changePercent7d,
    changePercent1d,
    direction,
  }
}

/**
 * Calculate market demand from history data
 * Demand is measured by revenue (quantity × price) not just volume
 */
export function calculateMarketDemand(raw: MaterialDetailsRaw): MarketDemand | null {
  if (!raw.priceHistory || raw.priceHistory.length === 0) {
    return null
  }

  // Calculate revenue from history entries (qtySold * avgPrice)
  const revenue7d = raw.priceHistory.reduce((sum, entry) => sum + (entry.qtySold * entry.avgPrice), 0)
  const revenueAvgPerDay = revenue7d / raw.priceHistory.length

  // Also keep volume for reference
  const volume7d = raw.priceHistory.reduce((sum, entry) => sum + entry.qtySold, 0)
  const volumeAvgPerDay = raw.avgQtySoldDaily

  // Classify demand level based on average daily revenue
  // Note: Prices are in cents
  // High: >$5k/day (500k cents), Medium: $500-5k/day (50k-500k cents), Low: <$500/day (<50k cents)
  let demandLevel: 'high' | 'medium' | 'low'
  if (revenueAvgPerDay > 500000) { // >$5k/day
    demandLevel = 'high'
  } else if (revenueAvgPerDay > 50000) { // $500-5k/day
    demandLevel = 'medium'
  } else {
    demandLevel = 'low'
  }

  return {
    volume7d,
    volumeAvgPerDay,
    revenue7d,
    revenueAvgPerDay,
    demandLevel,
  }
}

/**
 * Calculate market saturation from order book
 */
export function calculateMarketSaturation(raw: MaterialDetailsRaw): MarketSaturation {
  if (!raw.orders || raw.orders.length === 0) {
    return {
      askPrice: null,
      bidPrice: null,
      spread: null,
      spreadPercent: null,
      daysOfSupply: null,
      saturationLevel: 'unknown',
    }
  }

  // Find lowest ask (sell order) and highest bid (buy order)
  // In this API, all orders appear to be sell orders, so we use current price as reference
  const askPrice = raw.currentPrice
  const bidPrice = raw.currentPrice * 0.95 // Estimate bid as 5% below ask

  const spread = askPrice - bidPrice
  const spreadPercent = bidPrice !== 0 ? (spread / bidPrice) * 100 : 0

  // Determine saturation level based on available quantity vs daily volume
  // Prevent division by zero
  const daysOfSupply = raw.avgQtySoldDaily > 0 ? raw.totalQtyAvailable / raw.avgQtySoldDaily : 0

  let saturationLevel: 'oversupplied' | 'balanced' | 'undersupplied'
  if (daysOfSupply > 3) {
    saturationLevel = 'oversupplied' // More than 3 days of supply
  } else if (daysOfSupply < 1) {
    saturationLevel = 'undersupplied' // Less than 1 day of supply
  } else {
    saturationLevel = 'balanced'
  }

  return {
    askPrice,
    bidPrice,
    spread,
    spreadPercent,
    daysOfSupply,
    saturationLevel,
  }
}

/**
 * Calculate opportunity score (0-100)
 * Higher score = better opportunity
 * Factors: price trend, demand volume/revenue, saturation
 * 
 * New approach: Use continuous scaling based on actual values
 * instead of categorical thresholds to differentiate between
 * materials in the same category (e.g., both "high demand")
 */
export function calculateOpportunityScore(
  trend: PriceTrend | null,
  demand: MarketDemand | null,
  saturation: MarketSaturation,
): number {
  let score = 0

  // 1. Price Trend Score (0-35 points)
  // Base: rising +20, stable +10, falling 0
  // Bonus: Scale with magnitude of change
  if (trend) {
    if (trend.direction === 'rising') {
      score += 20
      // Bonus for strong uptrend: up to +15 points
      // Scale logarithmically: 5% = +5, 15% = +10, 30%+ = +15
      const trendBonus = Math.min(15, Math.log10(Math.abs(trend.changePercent7d) + 1) * 8)
      score += trendBonus
    } else if (trend.direction === 'stable') {
      score += 10
    } else if (trend.direction === 'falling') {
      // Falling prices reduce score but not below 0
      const trendPenalty = Math.min(10, Math.abs(trend.changePercent7d) / 2)
      score = Math.max(0, score - trendPenalty)
    }
  }

  // 2. Demand Score (0-45 points) - Most important factor
  // Use logarithmic scaling based on daily revenue
  // This ensures $9.9M scores higher than $3.4M even if both are "high"
  if (demand) {
    const revenueCents = demand.revenueAvgPerDay
    if (revenueCents > 0) {
      // Revenue brackets with smooth scaling:
      // $10M+     -> 45 points (world-class demand)
      // $5M-10M   -> 35-45 points (excellent demand)
      // $1M-5M    -> 25-35 points (high demand)
      // $500k-1M  -> 15-25 points (medium-high demand)
      // $100k-500k-> 5-15 points (medium demand)
      // <$100k    -> 0-5 points (low demand)
      
      const revenueDollars = revenueCents / 100
      if (revenueDollars >= 10_000_000) {
        score += 45
      } else if (revenueDollars >= 5_000_000) {
        // Linear interpolation between 35-45
        const ratio = (revenueDollars - 5_000_000) / 5_000_000
        score += 35 + (ratio * 10)
      } else if (revenueDollars >= 1_000_000) {
        const ratio = (revenueDollars - 1_000_000) / 4_000_000
        score += 25 + (ratio * 10)
      } else if (revenueDollars >= 500_000) {
        const ratio = (revenueDollars - 500_000) / 500_000
        score += 15 + (ratio * 10)
      } else if (revenueDollars >= 100_000) {
        const ratio = (revenueDollars - 100_000) / 400_000
        score += 5 + (ratio * 10)
      } else {
        // Below $100k: minimal score scaled by revenue
        score += Math.min(5, revenueDollars / 20_000)
      }
    }
  }

  // 3. Market Saturation Score (0-20 points)
  // Undersupplied markets are opportunities
  if (saturation.saturationLevel === 'undersupplied') {
    score += 20
    // Bonus for severely undersupplied (<0.5 days)
    if (saturation.daysOfSupply !== null && saturation.daysOfSupply < 0.5) {
      score += 5
    }
  } else if (saturation.saturationLevel === 'balanced') {
    score += 10
  } else if (saturation.saturationLevel === 'oversupplied') {
    // Oversupplied reduces score slightly
    score += 2
  }

  // Clamp to 0-100
  return Math.round(Math.max(0, Math.min(100, score)))
}

/**
 * Determine recommendation based on opportunity score
 * Terminology: Focus on production opportunity, not trading
 */
export function getRecommendation(
  score: number,
  hasData: boolean,
): 'excellent' | 'good' | 'neutral' | 'poor' | 'avoid' | 'no-data' {
  if (!hasData) {
    return 'no-data'
  }

  if (score >= 80) {
    return 'excellent' // Strong production opportunity
  } else if (score >= 60) {
    return 'good' // Good production opportunity
  } else if (score >= 40) {
    return 'neutral' // Neutral market
  } else if (score >= 20) {
    return 'poor' // Poor opportunity
  } else {
    return 'avoid' // Avoid producing this
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
    materialId: raw.matId,
    priceTrend: priceTrend ?? {
      current: raw.currentPrice,
      avg7d: raw.avgPrice,
      avg1d: raw.avgPrice,
      changePercent7d: 0,
      changePercent1d: 0,
      direction: 'stable',
    },
    demand: demand ?? {
      volume7d: 0,
      volumeAvgPerDay: raw.avgQtySoldDaily,
      revenue7d: 0,
      revenueAvgPerDay: 0,
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
