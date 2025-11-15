/**
 * Warehouse and Base API Service
 * Handles fetching company bases and warehouse stocks from the Galactic Tycoons API
 * Implements caching with TTL to respect rate limits
 */

import type { CompanyResponse, AllWarehousesResponse } from './types'

const API_BASE_URL = 'https://api.g1.galactictycoons.com'

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  BASES_TTL_MS: 5 * 60 * 1000, // 5 minutes
  WAREHOUSE_TTL_MS: 5 * 60 * 1000, // 5 minutes
} as const

/**
 * Cache entries with timestamps
 */
const cache = {
  bases: null as { data: CompanyResponse; ts: number } | null,
  warehouse: null as { data: AllWarehousesResponse; ts: number } | null,
}

/**
 * Check if a cache entry is still valid
 */
function isCacheValid(ts: number, ttl: number): boolean {
  return Date.now() - ts < ttl
}

/**
 * Fetch company information including bases
 * GET /public/company?apikey=KEY
 */
export async function fetchCompanyBases(
  apiKey: string,
  forceRefresh = false,
): Promise<{ data: CompanyResponse; source: 'api' | 'cache' }> {
  // Check cache first
  if (!forceRefresh && cache.bases && isCacheValid(cache.bases.ts, CACHE_CONFIG.BASES_TTL_MS)) {
    return { data: cache.bases.data, source: 'cache' }
  }

  try {
    const url = new URL(`${API_BASE_URL}/public/company`)
    url.searchParams.set('apikey', apiKey)

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data: CompanyResponse = await response.json()

    // Update cache
    cache.bases = { data, ts: Date.now() }

    return { data, source: 'api' }
  } catch (error) {
    throw new Error(`Failed to fetch company bases: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Fetch warehouse stocks for all bases
 * GET /public/company/warehouse?apikey=KEY
 */
export async function fetchWarehouseStock(
  apiKey: string,
  forceRefresh = false,
): Promise<{ data: AllWarehousesResponse; source: 'api' | 'cache' }> {
  // Check cache first
  if (!forceRefresh && cache.warehouse && isCacheValid(cache.warehouse.ts, CACHE_CONFIG.WAREHOUSE_TTL_MS)) {
    return { data: cache.warehouse.data, source: 'cache' }
  }

  try {
    const url = new URL(`${API_BASE_URL}/public/company/warehouse`)
    url.searchParams.set('apikey', apiKey)

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data: AllWarehousesResponse = await response.json()

    // Update cache
    cache.warehouse = { data, ts: Date.now() }

    return { data, source: 'api' }
  } catch (error) {
    throw new Error(`Failed to fetch warehouse stock: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Clear cache manually (useful for testing or manual refresh)
 */
export function clearCache(): void {
  cache.bases = null
  cache.warehouse = null
}

/**
 * Get timestamp of last successful base fetch
 */
export function getLastBasesFetchTime(): number | null {
  return cache.bases?.ts ?? null
}

/**
 * Get timestamp of last successful warehouse fetch
 */
export function getLastWarehouseFetchTime(): number | null {
  return cache.warehouse?.ts ?? null
}
