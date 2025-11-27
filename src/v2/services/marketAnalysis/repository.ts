/**
 * Market Analysis Repository
 * ETL - Load: Main interface for market analysis data
 * Orchestrates extraction and transformation
 */

import { extractMarketDetails } from './extractor'
import { transformMarketData } from './transformer'
import type { MarketOpportunity, FetchMarketDetailsOptions, MarketAnalysisFilters } from './types'
import { getApiKey } from '../api/apiKeyManager'

/**
 * Fetch and transform market opportunities
 * Main entry point for market analysis data
 */
export async function fetchMarketOpportunities(
  options: FetchMarketDetailsOptions = {},
): Promise<MarketOpportunity[]> {
  const { world = 'g2', forceRefresh = false } = options

  // Get API key
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('API key is required. Please configure it in the Config tab.')
  }

  // Extract raw data from API
  const { data: rawMaterials } = await extractMarketDetails(apiKey, world, forceRefresh)

  console.log('[Market Analysis] Repository:', {
    rawMaterialsCount: rawMaterials.length,
    world,
    forceRefresh
  })

  // Transform to domain models
  const opportunities = transformMarketData(rawMaterials)

  console.log('[Market Analysis] Transformed:', {
    opportunitiesCount: opportunities.length,
    sampleOpportunity: opportunities[0] ? {
      materialId: opportunities[0].materialId,
      score: opportunities[0].opportunityScore,
      recommendation: opportunities[0].recommendation
    } : null
  })

  return opportunities
}

/**
 * Fetch single material opportunity
 */
export async function fetchMaterialOpportunity(
  materialId: number,
  options: FetchMarketDetailsOptions = {},
): Promise<MarketOpportunity | null> {
  const opportunities = await fetchMarketOpportunities(options)
  return opportunities.find((o) => o.materialId === materialId) ?? null
}

/**
 * Filter market opportunities based on criteria
 */
export function filterOpportunities(
  opportunities: MarketOpportunity[],
  filters: MarketAnalysisFilters = {},
): MarketOpportunity[] {
  let filtered = opportunities

  // Filter by minimum opportunity score
  if (filters.minOpportunityScore !== undefined) {
    filtered = filtered.filter((o) => o.opportunityScore >= filters.minOpportunityScore!)
  }

  // Filter by demand levels
  if (filters.demandLevels && filters.demandLevels.length > 0) {
    filtered = filtered.filter((o) => filters.demandLevels!.includes(o.demand.demandLevel))
  }

  // Filter by trend directions
  if (filters.trendDirections && filters.trendDirections.length > 0) {
    filtered = filtered.filter((o) => filters.trendDirections!.includes(o.priceTrend.direction))
  }

  return filtered
}

/**
 * Sort opportunities by score (descending)
 */
export function sortByOpportunityScore(opportunities: MarketOpportunity[]): MarketOpportunity[] {
  return [...opportunities].sort((a, b) => b.opportunityScore - a.opportunityScore)
}

/**
 * Get top N opportunities
 */
export async function getTopOpportunities(
  count: number,
  options: FetchMarketDetailsOptions = {},
  filters: MarketAnalysisFilters = {},
): Promise<MarketOpportunity[]> {
  const opportunities = await fetchMarketOpportunities(options)
  const filtered = filterOpportunities(opportunities, filters)
  const sorted = sortByOpportunityScore(filtered)
  return sorted.slice(0, count)
}
