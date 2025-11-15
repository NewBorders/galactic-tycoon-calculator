/**
 * Warehouse and Base API Service
 * Handles fetching company bases and warehouse stocks from the Galactic Tycoons API
 * Implements caching with TTL to respect rate limits
 */

import type { CompanyResponse, WarehouseStockResponse, World } from './types'

function getApiBaseUrl(world: World): string {
  return `https://api.${world}.galactictycoons.com`
}

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
  bases: new Map<World, { data: CompanyResponse; ts: number }>(),
  warehouse: new Map<string, { data: WarehouseStockResponse; ts: number }>(), // key: "world:warehouseId"
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
  world: World = 'g2',
  forceRefresh = false,
): Promise<{ data: CompanyResponse; source: 'api' | 'cache' }> {
  // Check cache first
  const cached = cache.bases.get(world)
  if (!forceRefresh && cached && isCacheValid(cached.ts, CACHE_CONFIG.BASES_TTL_MS)) {
    return { data: cached.data, source: 'cache' }
  }

  try {
    const baseUrl = getApiBaseUrl(world)
    const url = new URL(`${baseUrl}/public/company`)
    url.searchParams.set('apikey', apiKey)

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data: CompanyResponse = await response.json()

    // Update cache
    cache.bases.set(world, { data, ts: Date.now() })

    return { data, source: 'api' }
  } catch (error) {
    throw new Error(`Failed to fetch company bases: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Fetch warehouse stock for a specific warehouse
 * GET /public/company/warehouse/{warehouseId}?apikey=KEY
 */
export async function fetchWarehouseStockForBase(
  apiKey: string,
  warehouseId: number,
  world: World = 'g2',
  forceRefresh = false,
): Promise<{ data: WarehouseStockResponse; source: 'api' | 'cache' }> {
  const cacheKey = `${world}:${warehouseId}`

  // Check cache first
  const cached = cache.warehouse.get(cacheKey)
  if (!forceRefresh && cached && isCacheValid(cached.ts, CACHE_CONFIG.WAREHOUSE_TTL_MS)) {
    return { data: cached.data, source: 'cache' }
  }

  try {
    const baseUrl = getApiBaseUrl(world)
    const url = new URL(`${baseUrl}/public/company/warehouse/${warehouseId}`)
    url.searchParams.set('apikey', apiKey)

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data: WarehouseStockResponse = await response.json()

    // Update cache
    cache.warehouse.set(cacheKey, { data, ts: Date.now() })

    return { data, source: 'api' }
  } catch (error) {
    throw new Error(
      `Failed to fetch warehouse stock for warehouse ${warehouseId}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Fetch warehouse stocks for all bases at once
 */
export async function fetchWarehouseStockForAllBases(
  apiKey: string,
  warehouseIds: number[],
  world: World = 'g2',
  forceRefresh = false,
): Promise<{
  warehouses: Array<{ data: WarehouseStockResponse; source: 'api' | 'cache' }>
  errors: string[]
}> {
  const results: { data: WarehouseStockResponse; source: 'api' | 'cache' }[] = []
  const errors: string[] = []

  // Fetch all warehouses in parallel
  const promises = warehouseIds.map((warehouseId) =>
    fetchWarehouseStockForBase(apiKey, warehouseId, world, forceRefresh)
      .then((result) => results.push(result))
      .catch((error) => errors.push(error instanceof Error ? error.message : String(error))),
  )

  await Promise.all(promises)

  return { warehouses: results, errors }
}

/**
 * Clear cache manually (useful for testing or manual refresh)
 */
export function clearCache(): void {
  cache.bases.clear()
  cache.warehouse.clear()
}

/**
 * Get timestamp of last successful base fetch
 */
export function getLastBasesFetchTime(world: World = 'g2'): number | null {
  return cache.bases.get(world)?.ts ?? null
}

/**
 * Get timestamp of last successful warehouse fetch
 */
export function getLastWarehouseFetchTime(warehouseId: number, world: World = 'g2'): number | null {
  return cache.warehouse.get(`${world}:${warehouseId}`)?.ts ?? null
}
