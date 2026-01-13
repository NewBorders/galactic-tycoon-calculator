/**
 * Market Analysis Composable
 * Provides reactive interface to market analysis data
 */

import { ref, computed } from 'vue'
import {
  fetchMarketOpportunitiesWithTs,
  filterOpportunities,
  sortByOpportunityScore,
  type MarketOpportunity,
  type FetchMarketDetailsOptions,
  type MarketAnalysisFilters,
} from '../services/marketAnalysis'

const MARKET_CACHE_KEY = 'gt:v2:market:opportunities'
const MARKET_TS_KEY = 'gt:v2:market:ts'

function loadCachedOpportunities(): { opportunities: MarketOpportunity[]; ts: number | null } {
  try {
    const raw = localStorage.getItem(MARKET_CACHE_KEY)
    const rawTs = localStorage.getItem(MARKET_TS_KEY)
    if (!raw || !rawTs) return { opportunities: [], ts: null }
    const parsed = JSON.parse(raw) as MarketOpportunity[]
    const ts = Number(rawTs)
    if (!Array.isArray(parsed) || Number.isNaN(ts)) return { opportunities: [], ts: null }
    return { opportunities: parsed, ts }
  } catch {
    return { opportunities: [], ts: null }
  }
}

function saveCachedOpportunities(data: MarketOpportunity[], ts: number | null) {
  try {
    localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(data))
    if (ts !== null && Number.isFinite(ts)) {
      localStorage.setItem(MARKET_TS_KEY, String(ts))
    }
  } catch {
    // ignore storage errors
  }
}

export function useMarketAnalysis(options: FetchMarketDetailsOptions = {}) {
  const cached = loadCachedOpportunities()
  const opportunities = ref<MarketOpportunity[]>(cached.opportunities)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<number | null>(cached.ts)

  // Filter state
  const filters = ref<MarketAnalysisFilters>({
    minOpportunityScore: undefined,
    demandLevels: undefined,
    trendDirections: undefined,
  })

  /**
   * Fetch market opportunities from API
   */
  async function fetch(forceRefresh = false) {
    loading.value = true
    error.value = null

    try {
      const { opportunities: data, ts } = await fetchMarketOpportunitiesWithTs({
        ...options,
        forceRefresh,
      })
      opportunities.value = data
      lastUpdated.value = ts
      saveCachedOpportunities(data, ts)
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to fetch market data'

      // Only show error if we have no cached data to display
      if (opportunities.value.length === 0) {
        error.value = errorMessage
      } else {
        // Show warning but keep displaying cached data
        error.value = `⚠️ Using cached data - ${errorMessage}`
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Filtered and sorted opportunities based on current filters
   */
  const filteredOpportunities = computed(() => {
    const filtered = filterOpportunities(opportunities.value, filters.value)
    return sortByOpportunityScore(filtered)
  })

  /**
   * Top opportunities (top 10 by default)
   */
  const topOpportunities = computed(() => {
    return filteredOpportunities.value.slice(0, 10)
  })

  /**
   * Statistics about filtered opportunities
   */
  const stats = computed(() => {
    const opps = filteredOpportunities.value
    const total = opps.length

    if (total === 0) {
      return {
        total: 0,
        strongBuy: 0,
        buy: 0,
        hold: 0,
        sell: 0,
        strongSell: 0,
        avgScore: 0,
      }
    }

    const recommendations = opps.reduce(
      (acc, o) => {
        acc[o.recommendation] = (acc[o.recommendation] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const avgScore = opps.reduce((sum, o) => sum + o.opportunityScore, 0) / total

    return {
      total,
      strongBuy: recommendations['strong-buy'] || 0,
      buy: recommendations['buy'] || 0,
      hold: recommendations['hold'] || 0,
      sell: recommendations['sell'] || 0,
      strongSell: recommendations['strong-sell'] || 0,
      avgScore: Math.round(avgScore),
    }
  })

  /**
   * Set filter for minimum opportunity score
   */
  function setMinScore(score: number | undefined) {
    filters.value.minOpportunityScore = score
  }

  /**
   * Set filter for demand levels
   */
  function setDemandLevels(levels: Array<'high' | 'medium' | 'low'> | undefined) {
    filters.value.demandLevels = levels
  }

  /**
   * Set filter for trend directions
   */
  function setTrendDirections(directions: Array<'rising' | 'falling' | 'stable'> | undefined) {
    filters.value.trendDirections = directions
  }

  /**
   * Clear all filters
   */
  function clearFilters() {
    filters.value = {
      minOpportunityScore: undefined,
      demandLevels: undefined,
      trendDirections: undefined,
    }
  }

  /**
   * Get opportunity for specific material
   */
  function getOpportunity(materialId: number): MarketOpportunity | undefined {
    return opportunities.value.find((o) => o.materialId === materialId)
  }

  return {
    // State
    opportunities: computed(() => opportunities.value),
    filteredOpportunities,
    topOpportunities,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    lastUpdated: computed(() => lastUpdated.value),
    filters: computed(() => filters.value),
    stats,

    // Actions
    fetch,
    setMinScore,
    setDemandLevels,
    setTrendDirections,
    clearFilters,
    getOpportunity,
  }
}
