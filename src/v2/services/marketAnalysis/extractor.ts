/**
 * Market Analysis Extractor
 * ETL - Extract: Fetches raw market data from the API
 * Handles rate limiting through caching
 */

import type { MarketDetailsApiResponse, MaterialDetailsRaw } from './types'
import type { World } from '../api/types'

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  MARKET_DETAILS_TTL_MS: 1 * 60 * 1000, // 1 minute - respect API rate limits
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
): Promise<{ data: MaterialDetailsRaw[]; source: 'api' | 'cache' }> {
  // Create cache key that includes both world and API key
  // This prevents returning cached data from different account after API key change
  const cacheKey = `${world}:${apiKey}`

  // Check cache first
  const cached = cache.marketDetails.get(cacheKey)
  if (!forceRefresh && cached && isCacheValid(cached.ts, CACHE_CONFIG.MARKET_DETAILS_TTL_MS)) {
    return { data: cached.data, source: 'cache' }
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

    console.log('[Market Analysis] API Response:', {
      totalMaterials: materials.length,
      world,
      sampleMaterial: materials[0] ? {
        matId: materials[0].matId,
        matName: materials[0].matName,
        currentPrice: materials[0].currentPrice,
        avgPrice: materials[0].avgPrice,
        historyLength: materials[0].priceHistory?.length
      } : null
    })

    // Update cache with world+apikey as key
    cache.marketDetails.set(cacheKey, {
      data: materials,
      ts: Date.now(),
    })

    return { data: materials, source: 'api' }
  } catch (error) {
    // If API fails and we have stale cache, return it
    if (cached) {
      console.warn('API failed, returning stale cache data', error)
      return { data: cached.data, source: 'cache' }
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
