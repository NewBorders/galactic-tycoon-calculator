<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useWorldData } from '@/v2/services/worldData'
import { loadGameData } from '@/v2/services/gamedata/service'
import { resetPriceCache } from '@/v2/services/gamedata/prices'
import { fetchCompanyBases, fetchGameBaseDetails, fetchWarehouseStockForBase } from '@/v2/services/api/warehouseService'
import { extractMarketDetails } from '@/v2/services/marketAnalysis/extractor'

const { activeWorld, apiKey } = useWorldData()

interface SyncEntry {
  id: string
  name: string
  icon: string
  lastSync: number
  nextRefresh: number
  isRefreshing: boolean
  error: string | null
}

const syncEntries = ref<SyncEntry[]>([])
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

let refreshTimers: Map<string, number> = new Map()
let countdownTimer: number | null = null

// Format timestamp as relative time
function formatRelativeTime(timestamp: number): string {
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

// Format countdown to next refresh
function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Soon'
  
  const minutes = Math.floor(ms / (60 * 1000))
  const seconds = Math.floor((ms % (60 * 1000)) / 1000)
  
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

async function initializeSyncEntries() {
  const entries: SyncEntry[] = []
  
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
  if (apiKey.value) {
    try {
      const result = await fetchCompanyBases(apiKey.value, activeWorld.value, false)
      const bases = result.data.bases || []
      
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
      console.error('Failed to load bases for sync status:', error)
    }
  }
  
  syncEntries.value = entries
  
  // Load saved sync times from localStorage
  try {
    const stored = localStorage.getItem(`gt:v2:syncStatus:${activeWorld.value}`)
    if (stored) {
      const parsed = JSON.parse(stored)
      syncEntries.value.forEach(entry => {
        if (parsed[entry.id]) {
          entry.lastSync = parsed[entry.id]
        }
      })
    }
  } catch {}
}

async function refreshEntry(entryId: string) {
  const entry = syncEntries.value.find(e => e.id === entryId)
  if (!entry || entry.isRefreshing) return
  
  entry.isRefreshing = true
  entry.error = null
  
  try {
    if (entryId === 'gamedata') {
      resetPriceCache()
      await loadGameData(true)
    } else if (entryId === 'company') {
      if (!apiKey.value) throw new Error('No API key')
      await fetchCompanyBases(apiKey.value, activeWorld.value, true)
    } else if (entryId === 'exchange') {
      if (!apiKey.value) throw new Error('No API key')
      await extractMarketDetails(apiKey.value, activeWorld.value, true)
    } else if (entryId.startsWith('base-')) {
      if (!apiKey.value) throw new Error('No API key')
      const baseId = parseInt(entryId.replace('base-', ''))
      await fetchGameBaseDetails(apiKey.value, baseId, activeWorld.value)
    } else if (entryId.startsWith('warehouse-')) {
      if (!apiKey.value) throw new Error('No API key')
      const warehouseId = parseInt(entryId.replace('warehouse-', ''))
      await fetchWarehouseStockForBase(apiKey.value, warehouseId, activeWorld.value, true)
    }
    
    entry.lastSync = Date.now()
    entry.nextRefresh = AUTO_REFRESH_INTERVAL
    saveSyncTimes()
  } catch (error) {
    entry.error = error instanceof Error ? error.message : 'Failed to refresh'
    console.error(`Failed to refresh ${entryId}:`, error)
  } finally {
    entry.isRefreshing = false
  }
}

function saveSyncTimes() {
  try {
    const data: Record<string, number> = {}
    syncEntries.value.forEach(entry => {
      data[entry.id] = entry.lastSync
    })
    localStorage.setItem(`gt:v2:syncStatus:${activeWorld.value}`, JSON.stringify(data))
  } catch {}
}

function startCountdown() {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer)
  }
  
  countdownTimer = window.setInterval(() => {
    syncEntries.value.forEach(entry => {
      if (entry.nextRefresh > 0) {
        entry.nextRefresh -= 1000
      } else {
        // Auto-refresh when countdown reaches zero
        refreshEntry(entry.id)
        entry.nextRefresh = AUTO_REFRESH_INTERVAL
      }
    })
  }, 1000)
}

onMounted(async () => {
  await initializeSyncEntries()
  startCountdown()
})

onBeforeUnmount(() => {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  refreshTimers.forEach(timer => clearInterval(timer))
  refreshTimers.clear()
  saveSyncTimes()
})

// Reinitialize when world changes
watch(activeWorld, async () => {
  await initializeSyncEntries()
})
</script>

<template>
  <div class="sync-status">
    <h3 class="sync-status__title">API Sync Status ({{ activeWorld.toUpperCase() }})</h3>
    
    <div class="sync-status__table-container">
      <div class="sync-status__table">
        <div class="sync-status__header">
          <div class="sync-status__cell sync-status__cell--header">Endpoint</div>
          <div class="sync-status__cell sync-status__cell--header">Last Sync</div>
          <div class="sync-status__cell sync-status__cell--header">Next Refresh</div>
          <div class="sync-status__cell sync-status__cell--header">Actions</div>
        </div>

        <div 
          v-for="entry in syncEntries" 
          :key="entry.id"
          class="sync-status__row"
          :class="{ 'sync-status__row--error': entry.error }"
        >
          <div class="sync-status__cell">
            <span class="sync-status__icon">{{ entry.icon }}</span>
            {{ entry.name }}
          </div>
          <div class="sync-status__cell">
            <span v-if="entry.error" class="sync-status__error" :title="entry.error">❌ Error</span>
            <span v-else>{{ formatRelativeTime(entry.lastSync) }}</span>
          </div>
          <div class="sync-status__cell">
            {{ formatCountdown(entry.nextRefresh) }}
          </div>
          <div class="sync-status__cell">
            <button 
              @click="refreshEntry(entry.id)" 
              :disabled="entry.isRefreshing"
              class="sync-status__button"
            >
              {{ entry.isRefreshing ? '⏳' : '🔄' }}
            </button>
          </div>
        </div>
        
        <div v-if="syncEntries.length === 0" class="sync-status__empty">
          No API key configured
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sync-status {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.sync-status__title {
  margin: 0 0 1rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-heading);
}

.sync-status__table-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
}

.sync-status__table {
  display: flex;
  flex-direction: column;
}

.sync-status__header {
  position: sticky;
  top: 0;
  display: grid;
  grid-template-columns: 2fr 1.25fr 1.25fr 0.75fr;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--color-background);
  border-bottom: 2px solid var(--color-border);
  z-index: 1;
}

.sync-status__row {
  display: grid;
  grid-template-columns: 2fr 1.25fr 1.25fr 0.75fr;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.2s;
}

.sync-status__row:hover {
  background-color: var(--color-background-mute);
}

.sync-status__row--error {
  background-color: rgba(239, 68, 68, 0.05);
}

.sync-status__cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text);
}

.sync-status__cell--header {
  font-weight: 600;
  color: var(--color-heading);
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.sync-status__icon {
  font-size: 1.25rem;
}

.sync-status__error {
  color: var(--color-danger, #ef4444);
  font-weight: 500;
  cursor: help;
}

.sync-status__empty {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-soft);
  font-size: 0.875rem;
}

.sync-status__button {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  background-color: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.sync-status__button:hover:not(:disabled) {
  background-color: var(--color-background-mute);
  border-color: var(--color-border-hover);
}

.sync-status__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .sync-status__header,
  .sync-status__row {
    grid-template-columns: 1.5fr 1fr 1fr 0.5fr;
  }
  
  .sync-status__cell {
    font-size: 0.8125rem;
  }
}  .sync-status__cell--header:not(:first-child),
  .sync-status__row > .sync-status__cell:not(:first-child) {
    padding-left: 2rem;
  }
}
</style>
