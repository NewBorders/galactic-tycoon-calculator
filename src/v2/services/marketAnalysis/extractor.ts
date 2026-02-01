/**
 * Market Analysis Extractor
 * ETL - Extract: Fetches raw market data from the API
 * Handles rate limiting through caching
 */

import type { MarketDetailsApiResponse, MaterialDetailsRaw } from './types'
import type { World } from '../api/types'
import { createLogger } from '../debug/logger'

const logger = createLogger('MarketAnalysis')

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  MARKET_DETAILS_TTL_MS: 5 * 60 * 1000, // 5 minutes - auto-refresh interval
} as const

/**
 * Cache entries with timestamps
 * Cache key includes world + API key to prevent returning wrong account's data
 */
const cache = {
  marketDetails: new Map<string, { data: MaterialDetailsRaw[]; ts: number }>(),
}

/**
 * Check if a cache entry is still valid
 */
function isCacheValid(ts: number, ttl: number): boolean {
  return Date.now() - ts < ttl
}

/**
 * Get API base URL for a world
 */
function getApiBaseUrl(world: World): string {
  return `https://api.${world}.galactictycoons.com`
}

/**
 * Extract market details from API
 * GET /public/exchange/mat-details?apikey=KEY
 * Returns raw material market data including 7-day history
 */
export async function extractMarketDetails(
  apiKey: string,
  world: World = 'g2',
  forceRefresh = false,
): Promise<{ data: MaterialDetailsRaw[]; source: 'api' | 'cache'; ts: number }> {
  // Create cache key that includes both world and API key
  // This prevents returning cached data from different account after API key change
  const cacheKey = `${world}:${apiKey}`

  // Check cache first
  const cached = cache.marketDetails.get(cacheKey)
  if (!forceRefresh && cached && isCacheValid(cached.ts, CACHE_CONFIG.MARKET_DETAILS_TTL_MS)) {
    return { data: cached.data, source: 'cache', ts: cached.ts }
  }

  try {
    const baseUrl = getApiBaseUrl(world)
    const url = new URL(`${baseUrl}/public/exchange/mat-details`)
    url.searchParams.set('apikey', apiKey)

    const response = await fetch(url.toString())

    if (!response.ok) {
      let errorMsg = `API error ${response.status}: ${response.statusText}`

      // Add specific messages for common errors
      if (response.status === 429) {
        errorMsg += ' - Rate limit exceeded. Please wait a moment before refreshing.'
      } else if (response.status === 401 || response.status === 403) {
        errorMsg += ' - Invalid or missing API key. Please check your configuration.'
      }

      throw new Error(errorMsg)
    }

    const apiResponse: MarketDetailsApiResponse = await response.json()

    // Extract materials array
    const materials = apiResponse.materials ?? []

    // Debug logging removed

    // Update cache with world+apikey as key
    const now = Date.now()
    cache.marketDetails.set(cacheKey, {
      data: materials,
      ts: now,
    })

    return { data: materials, source: 'api', ts: now }
  } catch (error) {
    // If API fails and we have stale cache, return it (especially for rate limits)
    if (cached) {
      const cacheAgeMinutes = Math.floor((Date.now() - cached.ts) / 60000)
      logger.warn(`API failed, returning cached data (${cacheAgeMinutes}min old)`, error)
        return { data: cached.data, source: 'cache', ts: cached.ts }
    }

    throw error
  }
}

/**
 * Clear cache for a specific world or all worlds
 * Note: Since cache keys now include API key, this clears all entries for the world regardless of API key
 */
export function clearMarketDetailsCache(world?: World): void {
  if (world) {
    // Clear all cache entries for this world (across all API keys)
    const keysToDelete: string[] = []
    for (const key of cache.marketDetails.keys()) {
      if (key.startsWith(`${world}:`)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => cache.marketDetails.delete(key))
  } else {
    cache.marketDetails.clear()
  }
}
