/**
 * World Data Storage
 * 
 * Manages localStorage operations for per-world data.
 * Each world (G1, G2) has isolated storage.
 */

import type { World } from '../api/types'
import type { WorldData } from './types'

// Storage version for migration tracking
const STORAGE_VERSION = '2'

// localStorage keys
export const STORAGE_KEYS = {
  version: 'gt:v2:version',
  activeWorld: 'gt:v2:activeWorld',
  worldData: (world: World) => `gt:v2:${world}:data`,
  worldPlanning: (world: World) => `gt:v2:${world}:planning`,
  worldPriceAlerts: (world: World) => `gt:v2:${world}:priceAlerts`,
  worldUiState: (world: World) => `gt:v2:${world}:uiState`,
}

/**
 * Create empty WorldData structure
 */
export function createEmptyWorldData(worldId: World, apiKey: string = ''): WorldData {
  return {
    worldId,
    apiKey,
    lastSync: {},
    current: {
      bases: [],
      technology: {},
      fetchedAt: 0,
    },
    planning: null,
    uiState: {
      basesOpen: {},
      sections: {},
    },
  }
}

/**
 * Load world data from localStorage
 */
export function loadWorldData(world: World): WorldData {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.worldData(world))
    if (!raw) {
      return createEmptyWorldData(world)
    }

    const data = JSON.parse(raw) as WorldData
    
    // Ensure all required fields exist
    return {
      worldId: world,
      apiKey: data.apiKey || '',
      lastSync: data.lastSync || {},
      current: data.current || createEmptyWorldData(world).current,
      planning: data.planning || null,
      uiState: data.uiState || createEmptyWorldData(world).uiState,
    }
  } catch (error) {
    console.error('[WorldData] Failed to load data for', world, error)
    return createEmptyWorldData(world)
  }
}

/**
 * Save world data to localStorage
 */
export function saveWorldData(data: WorldData): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.worldData(data.worldId), JSON.stringify(data))
    return true
  } catch (error) {
    console.error('[WorldData] Failed to save data for', data.worldId, error)
    
    // Handle quota exceeded
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('[WorldData] localStorage quota exceeded, attempting cleanup')
      // TODO: Implement compression or cleanup strategy
    }
    
    return false
  }
}

/**
 * Get active world from localStorage
 */
export function getActiveWorld(): World {
  try {
    const world = localStorage.getItem(STORAGE_KEYS.activeWorld)
    return (world === 'g1' || world === 'g2') ? world : 'g2'
  } catch {
    return 'g2'
  }
}

/**
 * Set active world in localStorage
 */
export function setActiveWorld(world: World): void {
  try {
    localStorage.setItem(STORAGE_KEYS.activeWorld, world)
  } catch (error) {
    console.error('[WorldData] Failed to set active world', error)
  }
}

/**
 * Get storage version
 */
export function getStorageVersion(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.version)
  } catch {
    return null
  }
}

/**
 * Set storage version
 */
export function setStorageVersion(version: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.version, version)
  } catch (error) {
    console.error('[WorldData] Failed to set storage version', error)
  }
}

/**
 * Check if storage needs migration
 */
export function needsMigration(): boolean {
  const currentVersion = getStorageVersion()
  return currentVersion !== STORAGE_VERSION
}

/**
 * Clear all world data (for testing or reset)
 */
export function clearAllWorldData(): void {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('gt:v2:'))
    keys.forEach(key => localStorage.removeItem(key))
    console.log('[WorldData] Cleared all data')
  } catch (error) {
    console.error('[WorldData] Failed to clear data', error)
  }
}
