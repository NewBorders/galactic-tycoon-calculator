/**
 * Global Sync Service
 * 
 * Manages automatic background refreshing of API data and tracks sync status globally.
 * This service runs independently of any UI component lifecycle.
 */

import { ref, computed, watch, type Ref } from 'vue'
import { getWorld, getApiKey } from './api/apiKeyManager'
import { loadGameData } from './gamedata/service'
import { resetPriceCache } from './gamedata/prices'
import { fetchCompanyBases, fetchGameBaseDetails, fetchWarehouseStockForBase } from './api/warehouseService'
import { extractMarketDetails } from './marketAnalysis/extractor'

export interface SyncEntry {
  id: string
  name: string
  icon: string
  lastSync: number
  nextRefresh: number
  isRefreshing: boolean
  error: string | null
}

export interface SyncCallbacks {
  onCompanyDataLoaded?: (bases: Array<{ id: number; name: string; planetId: number; warehouseId: number }>) => void
}

// Global state
const syncEntries = ref<SyncEntry[]>([])
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

let countdownTimer: number | null = null
let callbacks: SyncCallbacks = {}
let pendingBasesData: Array<{ id: number; name: string; planetId: number; warehouseId: number }> | null = null

/**
 * Register callbacks for sync events
 */
export function registerSyncCallbacks(newCallbacks: SyncCallbacks) {
  callbacks = { ...callbacks, ...newCallbacks }
  
  // If we have pending bases data and a callback is now registered, trigger it
  if (pendingBasesData && callbacks.onCompanyDataLoaded) {
    callbacks.onCompanyDataLoaded(pendingBasesData)
    pendingBasesData = null // Clear after triggering
  }
}

/**
 * Initialize sync entries based on current world and API key
 */
export async function initializeSyncService(onCompanyDataLoaded?: (bases: any[]) => void) {
  if (onCompanyDataLoaded) {
    callbacks.onCompanyDataLoaded = onCompanyDataLoaded
  }

  const entries: SyncEntry[] = []
  const world = getWorld()
  const apiKey = getApiKey()
  
  // 1. Game Data
  entries.push({
    id: 'gamedata',
    name: 'Game Data',
    icon: '📊',
    lastSync: 0,
    nextRefresh: AUTO_REFRESH_INTERVAL,
    isRefreshing: false,
    error: null,
  })
  
  // 2. Company (bases, ships, tech level)
  entries.push({
    id: 'company',
    name: 'Company Data',
    icon: '🏢',
    lastSync: 0,
    nextRefresh: AUTO_REFRESH_INTERVAL,
    isRefreshing: false,
    error: null,
  })
  
  // 3. Exchange Market Details
  entries.push({
    id: 'exchange',
    name: 'Exchange Market',
    icon: '📈',
    lastSync: 0,
    nextRefresh: AUTO_REFRESH_INTERVAL,
    isRefreshing: false,
    error: null,
  })
  
  // Load company bases to create entries for each base
  if (apiKey) {
    try {
      const result = await fetchCompanyBases(apiKey, world, false)
      const bases = result.data.bases || []
      
      // Format bases data
      const formattedBases = bases.map((b) => ({
        id: b.id,
        name: b.name,
        planetId: b.planetId,
        warehouseId: b.warehouseId,
      }))
      
      // Trigger callback if already registered, otherwise store for later
      if (callbacks.onCompanyDataLoaded) {
        callbacks.onCompanyDataLoaded(formattedBases)
      } else {
        pendingBasesData = formattedBases
      }
      
      // 4. Base Details - one entry per base
      for (const base of bases) {
        entries.push({
          id: `base-${base.id}`,
          name: `Base: ${base.name || base.id}`,
          icon: '🏭',
          lastSync: 0,
          nextRefresh: AUTO_REFRESH_INTERVAL,
          isRefreshing: false,
          error: null,
        })
      }
      
      // 5. Warehouse - one entry per base
      for (const base of bases) {
        if (base.warehouseId) {
          entries.push({
            id: `warehouse-${base.warehouseId}`,
            name: `Warehouse: ${base.name || base.id}`,
            icon: '📦',
            lastSync: 0,
            nextRefresh: AUTO_REFRESH_INTERVAL,
            isRefreshing: false,
            error: null,
          })
        }
      }
    } catch (error) {
      console.error('[SyncService] Failed to load bases:', error)
    }
  }
  
  syncEntries.value = entries
  
  // Load saved sync times from localStorage
  loadSyncTimes()
  
  // Start background countdown timer if not already running
  if (countdownTimer === null) {
    startBackgroundRefresh()
  }
}

/**
 * Convert API error to user-friendly message
 */
function formatApiError(error: unknown): string {
  const errorMsg = error instanceof Error ? error.message : String(error)
  
  // Extract HTTP status code
  const match = errorMsg.match(/\b(401|403|404|429|500|502|503)\b/)
  if (match) {
    const status = parseInt(match[1]!, 10)
    switch (status) {
      case 401:
      case 403:
        return 'Invalid API key'
      case 404:
        return 'Endpoint not found'
      case 429:
        return 'Too many requests - please wait'
      case 500:
        return 'Server error'
      case 502:
      case 503:
        return 'Service temporarily unavailable'
    }
  }
  
  // Return shortened error message
  return errorMsg.length > 50 ? errorMsg.substring(0, 47) + '...' : errorMsg
}

/**
 * Refresh a specific endpoint
 */
export async function refreshEntry(entryId: string): Promise<void> {
  const entry = syncEntries.value.find(e => e.id === entryId)
  if (!entry || entry.isRefreshing) return
  
  entry.isRefreshing = true
  entry.error = null
  
  const world = getWorld()
  const apiKey = getApiKey()
  
  try {
    if (entryId === 'gamedata') {
      resetPriceCache()
      await loadGameData(true)
    } else if (entryId === 'company') {
      if (!apiKey) throw new Error('No API key')
      const result = await fetchCompanyBases(apiKey, world, true)
      const bases = result.data.bases.map((b) => ({
        id: b.id,
        name: b.name,
        planetId: b.planetId,
        warehouseId: b.warehouseId,
      }))
      
      // Trigger callback to update UI
      if (callbacks.onCompanyDataLoaded) {
        callbacks.onCompanyDataLoaded(bases)
      }
    } else if (entryId === 'exchange') {
      if (!apiKey) throw new Error('No API key')
      await extractMarketDetails(apiKey, world, true)
    } else if (entryId.startsWith('base-')) {
      if (!apiKey) throw new Error('No API key')
      const baseId = parseInt(entryId.replace('base-', ''))
      await fetchGameBaseDetails(apiKey, baseId, world)
    } else if (entryId.startsWith('warehouse-')) {
      if (!apiKey) throw new Error('No API key')
      const warehouseId = parseInt(entryId.replace('warehouse-', ''))
      await fetchWarehouseStockForBase(apiKey, warehouseId, world, true)
    }
    
    entry.lastSync = Date.now()
    entry.nextRefresh = AUTO_REFRESH_INTERVAL
    saveSyncTimes()
  } catch (error) {
    entry.error = formatApiError(error)
    console.error(`[SyncService] Failed to refresh ${entryId}:`, error)
  } finally {
    entry.isRefreshing = false
  }
}

/**
 * Update sync timestamp for a specific entry (called externally when data loads)
 */
export function updateSyncTime(entryId: string, timestamp: number = Date.now()) {
  const entry = syncEntries.value.find(e => e.id === entryId)
  if (entry) {
    entry.lastSync = timestamp
    entry.nextRefresh = AUTO_REFRESH_INTERVAL
    entry.error = null
    saveSyncTimes()
  }
}

/**
 * Start background auto-refresh timer
 */
function startBackgroundRefresh() {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer)
  }
  
  countdownTimer = window.setInterval(() => {
    syncEntries.value.forEach(entry => {
      if (entry.nextRefresh > 0) {
        entry.nextRefresh -= 1000
      } else {
        // Auto-refresh when countdown reaches zero
        console.log(`[SyncService] Auto-refreshing ${entry.id}`)
        refreshEntry(entry.id)
        entry.nextRefresh = AUTO_REFRESH_INTERVAL
      }
    })
  }, 1000)
  
  console.log('[SyncService] Background refresh timer started')
}

/**
 * Stop background refresh timer
 */
export function stopBackgroundRefresh() {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer)
    countdownTimer = null
    console.log('[SyncService] Background refresh timer stopped')
  }
}

/**
 * Load sync times from localStorage
 */
function loadSyncTimes() {
  try {
    const world = getWorld()
    const stored = localStorage.getItem(`gt:v2:syncStatus:${world}`)
    if (stored) {
      const parsed = JSON.parse(stored)
      syncEntries.value.forEach(entry => {
        if (parsed[entry.id]) {
          entry.lastSync = parsed[entry.id]
          // Calculate remaining time until next refresh
          const elapsed = Date.now() - entry.lastSync
          entry.nextRefresh = Math.max(0, AUTO_REFRESH_INTERVAL - elapsed)
        }
      })
    }
  } catch (error) {
    console.error('[SyncService] Failed to load sync times:', error)
  }
}

/**
 * Save sync times to localStorage
 */
function saveSyncTimes() {
  try {
    const world = getWorld()
    const data: Record<string, number> = {}
    syncEntries.value.forEach(entry => {
      data[entry.id] = entry.lastSync
    })
    localStorage.setItem(`gt:v2:syncStatus:${world}`, JSON.stringify(data))
  } catch (error) {
    console.error('[SyncService] Failed to save sync times:', error)
  }
}

/**
 * Get sync entries (reactive)
 */
export function getSyncEntries(): Ref<SyncEntry[]> {
  return syncEntries
}

/**
 * Format timestamp as relative time
 */
export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Never'
  
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60 * 1000) return 'Just now'
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes}m ago`
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours}h ago`
  }
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  return `${days}d ago`
}

/**
 * Format countdown to next refresh
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Soon'
  
  const minutes = Math.floor(ms / (60 * 1000))
  const seconds = Math.floor((ms % (60 * 1000)) / 1000)
  
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}
