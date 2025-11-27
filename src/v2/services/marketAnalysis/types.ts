/**
 * Type definitions for market analysis service
 * Separates raw API types from domain types for clean ETL transformation
 */

import type { World } from '../api/types'

/**
 * Raw API Response Types (Internal - from API)
 */

export interface MaterialDetailsRaw {
  id: number
  minprice: number | null
  maxprice: number | null
  avg7d: number | null
  avg1d: number | null
  ask: number | null
  bid: number | null
  ls: string | null // last sale timestamp
  lp: number | null // last price
  lv: number | null // last volume
  history?: Array<{
    t: string // timestamp
    v: number // volume
    p: number // price
  }>
}

export interface MarketDetailsApiResponse {
  mats?: MaterialDetailsRaw[]
}

/**
 * Domain Types (Public - for application use)
 */

export interface PriceTrend {
  current: number
  avg7d: number
  avg1d: number
  changePercent7d: number
  changePercent1d: number
  direction: 'rising' | 'falling' | 'stable'
}

export interface MarketDemand {
  volume7d: number
  volumeAvgPerDay: number
  demandLevel: 'high' | 'medium' | 'low'
}

export interface MarketSaturation {
  askPrice: number | null
  bidPrice: number | null
  spread: number | null
  spreadPercent: number | null
  saturationLevel: 'oversupplied' | 'balanced' | 'undersupplied' | 'unknown'
}

export interface MarketOpportunity {
  materialId: number
  priceTrend: PriceTrend
  demand: MarketDemand
  saturation: MarketSaturation
  opportunityScore: number // 0-100, higher is better
  recommendation: 'strong-buy' | 'buy' | 'hold' | 'sell' | 'strong-sell' | 'no-data'
}

/**
 * Service Options
 */

export interface FetchMarketDetailsOptions {
  world?: World
  forceRefresh?: boolean
}

export interface MarketAnalysisFilters {
  minOpportunityScore?: number
  demandLevels?: Array<'high' | 'medium' | 'low'>
  trendDirections?: Array<'rising' | 'falling' | 'stable'>
}
