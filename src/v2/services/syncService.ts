/**
 * Global Sync Service
 *
 * Manages automatic background refreshing of API data and tracks sync status globally.
 * This service runs independently of any UI component lifecycle.
 */

import { ref, type Ref } from 'vue'
import { getWorld, getApiKey } from './api/apiKeyManager'
import { loadGameData } from './gamedata/service'
import { resetPriceCache } from './gamedata/prices'
import { fetchCompanyBases, fetchGameBaseDetails, fetchWarehouseStockForBase } from './api/warehouseService'
import { extractMarketDetails } from './marketAnalysis/extractor'
import { usePlayerTechnology } from './playerTechnology'
import { useWorldData } from './worldData'
import { syncTodoListWithApiData } from './todoListService'

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
  onWarehouseStockLoaded?: (warehouseId: number, stocks: Record<number, number>) => void
}

// Global state
const syncEntries = ref<SyncEntry[]>([])
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes
const AUTO_REFRESH_INTERVAL_GAMEDATA = 15 * 60 * 1000 // 15 minutes
const AUTO_REFRESH_INTERVAL_COMPANY = 10 * 60 * 1000 // 10 minutes

let countdownTimer: number | null = null
let callbacks: SyncCallbacks = {}
let pendingBasesData: Array<{ id: number; name: string; planetId: number; warehouseId: number }> | null = null
let initializationPromise: Promise<void> | null = null
let lastInitKey: string | null = null

function getAutoRefreshInterval(entryId: string): number {
  if (entryId === 'gamedata') return AUTO_REFRESH_INTERVAL_GAMEDATA
  if (entryId === 'company') return AUTO_REFRESH_INTERVAL_COMPANY
  if (entryId.startsWith('base-')) return AUTO_REFRESH_INTERVAL_COMPANY
  if (entryId.startsWith('warehouse-')) return AUTO_REFRESH_INTERVAL
  return AUTO_REFRESH_INTERVAL
}

function applyCompanyTechnologyImport(
  technologies: Array<{ id: number; level: number }>,
  startingBonus?: number
): void {
  const { setFromApi } = usePlayerTechnology()
  const { worldData } = useWorldData()

  setFromApi(technologies, startingBonus)

  const apiTechnology: Record<number, number> = {}
  technologies.forEach((tech) => {
    apiTechnology[tech.id] = tech.level
  })

  worldData.value.current.technology = apiTechnology
  worldData.value.current.startingBonus = startingBonus ?? 1
  worldData.value.current.fetchedAt = Date.now()

  if (worldData.value.planning) {
    let updated = false
    Object.entries(apiTechnology).forEach(([id, level]) => {
      const techId = Number(id)
      const plannedLevel = worldData.value.planning?.technology[techId] ?? 0
      if (level > plannedLevel) {
        worldData.value.planning!.technology[techId] = level
        updated = true
      }
    })

    if (updated) {
      worldData.value.planning.modifiedAt = Date.now()
    }
  }

  const todoSyncResult = syncTodoListWithApiData({
    technology: apiTechnology,
  })

  notifyTodoSync(todoSyncResult, 'Technology')
}

function notifyTodoSync(
  result: { completedCount: number; updatedCount: number },
  context: string,
): void {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return

  const totalChanges = result.completedCount + result.updatedCount
  if (totalChanges === 0) return

  const parts: string[] = []
  if (result.completedCount > 0) {
    parts.push(`${result.completedCount} completed`)
  }
  if (result.updatedCount > 0) {
    parts.push(`${result.updatedCount} updated`)
  }

  const title = 'Todo list updated'
  const body = `${context} sync: ${parts.join(', ')}.`

  const showNotification = () => {
    try {
      new Notification(title, { body })
    } catch {
      // ...removed debug log...
    }
  }

  if (Notification.permission === 'granted') {
    showNotification()
    return
  }

  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        showNotification()
      }
    }).catch(() => {
      // ...removed debug log...
    })
  }
}

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
export async function initializeSyncService(
  onCompanyDataLoaded?: (bases: Array<{ id: number; name: string; planetId: number; warehouseId: number }>) => void
) {
  if (onCompanyDataLoaded) {
    callbacks.onCompanyDataLoaded = onCompanyDataLoaded
  }

  const world = getWorld()
  const apiKey = getApiKey()
  const initKey = `${world}:${apiKey ?? ''}`

  if (initializationPromise && lastInitKey === initKey) {
    return initializationPromise
  }

  if (lastInitKey === initKey && syncEntries.value.length > 0) {
    return
  }

  lastInitKey = initKey

  const runInitialization = async () => {
    const entries: SyncEntry[] = []

    // 1. Game Data
    entries.push({
      id: 'gamedata',
      name: 'Game Data',
      icon: '📊',
      lastSync: 0,
      nextRefresh: AUTO_REFRESH_INTERVAL_GAMEDATA,
      isRefreshing: false,
      error: null,
    })

    // 2. Company (bases, ships, tech level)
    entries.push({
      id: 'company',
      name: 'Company Data',
      icon: '🏢',
      lastSync: 0,
      nextRefresh: AUTO_REFRESH_INTERVAL_COMPANY,
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
        const result = await fetchCompanyBases(apiKey, world, true) // Force refresh on init
        const bases = result.data.bases || []

        // Extract and set technology levels from Company Data
        if (result.data.technologies && result.data.technologies.length > 0) {
          applyCompanyTechnologyImport(result.data.technologies, result.data.startingBonus)
        }

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
            nextRefresh: AUTO_REFRESH_INTERVAL_COMPANY,
            isRefreshing: false,
            error: null,
          })
        }

        // 5. Warehouse - one entry per base (with unique warehouse IDs)
        const processedWarehouses = new Set<number>()
        for (const base of bases) {
          if (base.warehouseId && !processedWarehouses.has(base.warehouseId)) {
            processedWarehouses.add(base.warehouseId)
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
      } catch {
        // ...removed error log...
      }
    }

    syncEntries.value = entries

    // Load saved sync times from localStorage
    loadSyncTimes()

    // Start background countdown timer if not already running
    if (countdownTimer === null) {
      startBackgroundRefresh()
    }

    // Initial warehouse stock load for all warehouses (after entries are set)
    if (apiKey) {
      const warehouseEntries = entries.filter(e => e.id.startsWith('warehouse-'))
      for (const entry of warehouseEntries) {
        try {
          // Don't await - let them load in parallel
          refreshEntry(entry.id).catch(() => {
            // ...removed warn log...
          })
        } catch {
          // ...removed warn log...
        }
      }
    }
  }

  const currentInitialization = runInitialization()
  initializationPromise = currentInitialization

  try {
    await currentInitialization
  } finally {
    if (initializationPromise === currentInitialization) {
      initializationPromise = null
    }
  }
}

/**
 * Convert API error to user-friendly message
 */
function formatApiError(error: unknown): string {
  const errorMsg = error instanceof Error ? error.message : String(error)

  // Check for rate limit error with custom message
  if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')) {
    // Extract the actual error message if available
    const match = errorMsg.match(/429:\s*(.+)/)
    if (match && match[1]) {
      return `Rate limit: ${match[1]}`
    }
    return 'Rate limit exceeded - please wait'
  }

  // Check for other HTTP status codes with custom messages
  const statusMatch = errorMsg.match(/(401|403|404|500|502|503):\s*(.+)/)
  if (statusMatch) {
    const status = parseInt(statusMatch[1]!, 10)
    const detail = statusMatch[2]!
    switch (status) {
      case 401:
      case 403:
        return `Auth error: ${detail}`
      case 404:
        return `Not found: ${detail}`
      case 500:
        return `Server error: ${detail}`
      case 502:
      case 503:
        return `Service unavailable: ${detail}`
    }
  }

  // Fallback: Check for status code without details
  const simpleMatch = errorMsg.match(/\b(401|403|404|500|502|503)\b/)
  if (simpleMatch) {
    const status = parseInt(simpleMatch[1]!, 10)
    switch (status) {
      case 401:
      case 403:
        return 'Invalid API key'
      case 404:
        return 'Endpoint not found'
      case 500:
        return 'Server error'
      case 502:
      case 503:
        return 'Service temporarily unavailable'
    }
  }

  // Return full error message (don't truncate for better debugging)
  return errorMsg.length > 100 ? errorMsg.substring(0, 97) + '...' : errorMsg
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

      // Extract and set technology levels from Company Data
      if (result.data.technologies && result.data.technologies.length > 0) {
        applyCompanyTechnologyImport(result.data.technologies, result.data.startingBonus)
      }

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
      const result = await fetchGameBaseDetails(apiKey, baseId, world)

      // Extract building levels and sync with TODOs
      if (result.data.buildingSlots && Array.isArray(result.data.buildingSlots)) {
        const buildings: Array<{ buildingId: number; level: number; planetId: number }> = []

        result.data.buildingSlots.forEach((slot) => {
          if (slot.status === 2 && slot.building && slot.building.level) {
            buildings.push({
              buildingId: slot.building.type,
              level: slot.building.level,
              planetId: result.data.planetId,
            })
          }
        })

        // Auto-complete building TODOs for this base
        if (buildings.length > 0) {
          const todoSyncResult = syncTodoListWithApiData({
            buildings: buildings,
          })
          notifyTodoSync(todoSyncResult, 'Base')
        }
      }
    } else if (entryId.startsWith('warehouse-')) {
      if (!apiKey) throw new Error('No API key')
      const warehouseId = parseInt(entryId.replace('warehouse-', ''))
      const result = await fetchWarehouseStockForBase(apiKey, warehouseId, world, true)

      // Convert warehouse items to materialId -> quantity map
      const warehouseStocks: Record<number, number> = {}
      result.data.items.forEach(item => {
        warehouseStocks[item.materialId] = item.quantity
      })

      // NOTE: We do NOT update worldData.warehouseStocks anymore (removed for single source of truth)
      // Warehouse stocks are now ONLY stored in base.stock (via callback below)

      // Update warehouseLastRefresh timestamp in localStorage for UI display
      try {
        localStorage.setItem('warehouseLastRefresh', String(Date.now()))
      } catch {
        // Silently fail on storage write
      }

      // Trigger callback to update player bases (single source of truth)
      // ...removed debug log...
      if (callbacks.onWarehouseStockLoaded) {
        callbacks.onWarehouseStockLoaded(warehouseId, warehouseStocks)
      } else {
        // ...removed warn log...
      }
    }

    entry.lastSync = Date.now()
    entry.nextRefresh = getAutoRefreshInterval(entryId)
    saveSyncTimes()
  } catch (error) {
    entry.error = formatApiError(error)
    // ...removed error log...
  } finally {
    entry.isRefreshing = false
    if (entry.nextRefresh <= 0) {
      entry.nextRefresh = getAutoRefreshInterval(entryId)
      saveSyncTimes()
    }
  }
}

/**
 * Update sync timestamp for a specific entry (called externally when data loads)
 */
export function updateSyncTime(entryId: string, timestamp: number = Date.now()) {
  const entry = syncEntries.value.find(e => e.id === entryId)
  if (entry) {
    entry.lastSync = timestamp
    entry.nextRefresh = getAutoRefreshInterval(entryId)
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
        // ...removed debug log...
        refreshEntry(entry.id)
        entry.nextRefresh = getAutoRefreshInterval(entry.id)
      }
    })
  }, 1000)

  // ...removed debug log...
}

/**
 * Stop background refresh timer
 */
export function stopBackgroundRefresh() {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer)
    countdownTimer = null
    // ...removed debug log...
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
          const interval = getAutoRefreshInterval(entry.id)
          entry.nextRefresh = Math.max(0, interval - elapsed)
        }
      })
    }
  } catch {
    // ...removed error log...
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
  } catch {
    // ...removed error log...
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
