/**
 * Type definitions for market analysis service
 * Separates raw API types from domain types for clean ETL transformation
 */

import type { World } from '../api/types'

/**
 * Raw API Response Types (Internal - from API)
 * Based on /public/exchange/mat-details actual response
 */

export interface PriceHistoryEntry {
  date: string
  avgPrice: number
  qtySold: number
  qtyRemaining: number
}

export interface MaterialDetailsRaw {
  matId: number
  matName: string
  currentPrice: number
  avgPrice: number
  totalQtyAvailable: number
  orders: Array<{
    cId: number
    cName: string
    unitPrice: number
    qty: number
  }>
  avgQtySoldDaily: number
  priceHistory: PriceHistoryEntry[]
}

export interface MarketDetailsApiResponse {
  materials: MaterialDetailsRaw[]
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
  revenue7d: number
  revenueAvgPerDay: number
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
  recommendation: 'excellent' | 'good' | 'neutral' | 'poor' | 'avoid' | 'no-data'
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
