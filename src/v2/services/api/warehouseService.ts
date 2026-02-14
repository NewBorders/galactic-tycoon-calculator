/**
 * Warehouse and Base API Service
 * Handles fetching company bases and warehouse stocks from the Galactic Tycoons API
 * Implements caching with TTL to respect rate limits
 * Includes ETL transformation from raw API format to internal format
 */

import type {
  CompanyResponse,
  WarehouseStockResponse,
  WarehouseStockRawResponse,
  World,
  GameBaseRaw,
  GameBaseTransformed,
} from './types'
import { createLogger } from '../debug/logger'

const logger = createLogger('WarehouseService')
const apiCallCounts = new Map<string, number>()

function trackApiCall(label: string) {
  const next = (apiCallCounts.get(label) ?? 0) + 1
  apiCallCounts.set(label, next)
  logger.debug('[API Call]', label, 'count:', next)
}

function getApiBaseUrl(world: World): string {
  return `https://api.${world}.galactictycoons.com`
}

/**
 * Transform raw warehouse response from API to internal format
 * ETL: Extract, Transform, Load
 */
function transformWarehouseStock(raw: WarehouseStockRawResponse): WarehouseStockResponse {
  return {
    warehouseId: raw.id,
    items: (raw.mats ?? []).map((mat) => ({
      materialId: mat.id,
      quantity: mat.am,
    })),
  }
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

const inFlight = {
  bases: new Map<World, Promise<{ data: CompanyResponse; source: 'api' | 'cache' }>>(),
  warehouse: new Map<string, Promise<{ data: WarehouseStockResponse; source: 'api' | 'cache' }>>(),
  baseDetails: new Map<string, Promise<{ data: GameBaseRaw; source: 'api' | 'cache' }>>(),
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

  const existing = inFlight.bases.get(world)
  if (existing) {
    return existing
  }

  const requestPromiseRaw: Promise<{ data: CompanyResponse; source: 'api' | 'cache' }> = (async () => {
    const baseUrl = getApiBaseUrl(world)
    const url = new URL(`${baseUrl}/public/company`)
    url.searchParams.set('apikey', apiKey)

    trackApiCall(`/public/company?world=${world}`)
    const response = await fetch(url.toString())

    if (!response.ok) {
      // Try to extract error message from response body
      let errorDetail = `${response.status} ${response.statusText}`
      try {
        const errorBody = await response.json()
        if (errorBody.error) {
          errorDetail = `${response.status}: ${errorBody.error}`
        } else if (errorBody.message) {
          errorDetail = `${response.status}: ${errorBody.message}`
        }
      } catch {
        // Failed to parse error body, use status text
      }
      throw new Error(`API error: ${errorDetail}`)
    }

    const data: CompanyResponse = await response.json()

    // Update cache
    cache.bases.set(world, { data, ts: Date.now() })

    return { data, source: 'api' as const }
  })()

  const requestPromise = requestPromiseRaw.catch((error) => {
    throw new Error(`Failed to fetch company bases: ${error instanceof Error ? error.message : String(error)}`)
  })

  inFlight.bases.set(world, requestPromise)

  try {
    return await requestPromise
  } finally {
    inFlight.bases.delete(world)
  }
}

/**
 * Fetch warehouse stock for a specific warehouse
 * GET /public/company/warehouse/{warehouseId}?apikey=KEY
 * Transforms raw API response to internal format
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

  const existing = inFlight.warehouse.get(cacheKey)
  if (existing) {
    return existing
  }

  const requestPromiseRaw: Promise<{ data: WarehouseStockResponse; source: 'api' | 'cache' }> = (async () => {
    const baseUrl = getApiBaseUrl(world)
    const url = new URL(`${baseUrl}/public/company/warehouse/${warehouseId}`)
    url.searchParams.set('apikey', apiKey)

    trackApiCall(`/public/company/warehouse/${warehouseId}?world=${world}`)
    const response = await fetch(url.toString())

    if (!response.ok) {
      // Try to extract error message from response body
      let errorDetail = `${response.status} ${response.statusText}`
      try {
        const errorBody = await response.json()
        if (errorBody.error) {
          errorDetail = `${response.status}: ${errorBody.error}`
        } else if (errorBody.message) {
          errorDetail = `${response.status}: ${errorBody.message}`
        }
      } catch {
        // Failed to parse error body, use status text
      }
      throw new Error(`API error: ${errorDetail}`)
    }

    // Get raw response and transform to internal format
    const rawData: WarehouseStockRawResponse = await response.json()
    const data = transformWarehouseStock(rawData)

    // Update cache
    cache.warehouse.set(cacheKey, { data, ts: Date.now() })

    return { data, source: 'api' as const }
  })()

  const requestPromise = requestPromiseRaw.catch((error) => {
    throw new Error(
      `Failed to fetch warehouse stock for warehouse ${warehouseId}: ${error instanceof Error ? error.message : String(error)}`,
    )
  })

  inFlight.warehouse.set(cacheKey, requestPromise)

  try {
    return await requestPromise
  } finally {
    inFlight.warehouse.delete(cacheKey)
  }
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

/**
 * Fetch detailed base information from API
 * GET /public/company/base/{baseId}?apikey=KEY
 * Returns the raw API payload for a single base (ETL left to caller)
 */
export async function fetchGameBaseDetails(
  apiKey: string,
  gameBaseId: number,
  world: World = 'g2',
): Promise<{ data: GameBaseRaw; source: 'api' | 'cache' }> {
  const cacheKey = `${world}:${gameBaseId}`
  const existing = inFlight.baseDetails.get(cacheKey)
  if (existing) {
    return existing
  }

  const requestPromiseRaw: Promise<{ data: GameBaseRaw; source: 'api' | 'cache' }> = (async () => {
    const baseUrl = getApiBaseUrl(world)
    // Try endpoint with id path first
    const url = new URL(`${baseUrl}/public/company/base/${gameBaseId}`)
    url.searchParams.set('apikey', apiKey)

    trackApiCall(`/public/company/base/${gameBaseId}?world=${world}`)
    const response = await fetch(url.toString())
    if (!response.ok) {
      let errorDetail = `${response.status} ${response.statusText}`
      try {
        const errorBody = await response.json()
        if (errorBody.error) {
          errorDetail = `${response.status}: ${errorBody.error}`
        } else if (errorBody.message) {
          errorDetail = `${response.status}: ${errorBody.message}`
        }
      } catch {
        // Failed to parse error body, use status text
      }
      throw new Error(`API error: ${errorDetail}`)
    }

    const data = await response.json()
    return { data: data as GameBaseRaw, source: 'api' as const }
  })()

  const requestPromise = requestPromiseRaw.catch((error) => {
    throw new Error(
      `Failed to fetch base details for base ${gameBaseId}: ${error instanceof Error ? error.message : String(error)}`,
    )
  })

  inFlight.baseDetails.set(cacheKey, requestPromise)

  try {
    return await requestPromise
  } finally {
    inFlight.baseDetails.delete(cacheKey)
  }
}

/**
 * Transform raw game base payload into normalized form used by the app
 * Performs basic ETL and normalization of keys
 */
export function transformGameBase(raw: GameBaseRaw): GameBaseTransformed {
  const buildingSlotsRaw = Array.isArray(raw.buildingSlots) ? raw.buildingSlots : []
  const productionOrdersRaw = Array.isArray(raw.productionOrders) ? raw.productionOrders : []

  // Only import slots with status=2 (Building) and extract building.type + building.level
  const buildingSlots = buildingSlotsRaw
    .map((s, index) => {
      if (s.status !== 2 || !s.building) return null
      const buildingId = Number(s.building.type)
      const level = s.building.level != null ? Number(s.building.level) : undefined
      if (!isFinite(buildingId) || buildingId <= 0) return null
      return {
        buildingId: Math.floor(buildingId),
        slot: index,
        level: level != null ? Math.max(1, Math.floor(level)) : undefined,
      }
    })
    .filter((x) => x !== null) as Array<{ buildingId: number; slot: number; level?: number }>

  // sort by slot to preserve ordering on import
  buildingSlots.sort((a, b) => a.slot - b.slot)

  // Extract production orders using rId (recipeId) and amt (quantity)
  const productionOrders = productionOrdersRaw
    .map((o) => {
      const recipeId = Number(o.rId)
      const quantity = Math.max(0, Math.floor(Number(o.amt) || 0))
      if (!isFinite(recipeId) || quantity <= 0) return null
      return { recipeId: Math.floor(recipeId), quantity }
    })
    .filter((x): x is { recipeId: number; quantity: number } => x !== null)

  return {
    id: raw.id,
    name: raw.name,
    planetId: raw.planetId,
    warehouseId: raw.warehouseId,
    buildingSlots,
    productionOrders,
  }
}
