<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useWorldData } from '@/v2/services/worldData'
import { loadGameData } from '@/v2/services/gamedata/service'
import { resetPriceCache } from '@/v2/services/gamedata/prices'

const { activeWorld, current } = useWorldData()

const lastSync = ref<Record<string, number>>({
  gameData: 0,
  bases: 0,
  technology: 0
})

const isRefreshing = ref(false)
const nextAutoRefresh = ref<number>(0)
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

let refreshTimer: number | null = null
let countdownTimer: number | null = null

// Format timestamp as relative time
function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Never'
  
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60 * 1000) return 'Just now'
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  return `${days} day${days > 1 ? 's' : ''} ago`
}

// Format countdown to next refresh
function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Soon'
  
  const minutes = Math.floor(ms / (60 * 1000))
  const seconds = Math.floor((ms % (60 * 1000)) / 1000)
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

const gameDataSyncTime = computed(() => formatRelativeTime(lastSync.value.gameData || 0))
const basesSyncTime = computed(() => formatRelativeTime(lastSync.value.bases || 0))
const technologySyncTime = computed(() => formatRelativeTime(lastSync.value.technology || 0))
const nextRefreshCountdown = computed(() => formatCountdown(nextAutoRefresh.value))

async function refreshGameData() {
  isRefreshing.value = true
  try {
    resetPriceCache()
    await loadGameData(true)
    lastSync.value.gameData = Date.now()
    resetAutoRefreshTimer()
  } catch (error) {
    console.error('Failed to refresh game data:', error)
  } finally {
    isRefreshing.value = false
  }
}

function refreshBases() {
  // Trigger bases refresh (handled by parent components)
  lastSync.value.bases = Date.now()
}

function refreshTechnology() {
  // Trigger technology refresh (handled by parent components)
  lastSync.value.technology = Date.now()
}

function resetAutoRefreshTimer() {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer)
  }
  
  nextAutoRefresh.value = AUTO_REFRESH_INTERVAL
  
  refreshTimer = window.setInterval(() => {
    refreshGameData()
  }, AUTO_REFRESH_INTERVAL)
}

function startCountdown() {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer)
  }
  
  countdownTimer = window.setInterval(() => {
    if (nextAutoRefresh.value > 0) {
      nextAutoRefresh.value -= 1000
    } else {
      nextAutoRefresh.value = AUTO_REFRESH_INTERVAL
    }
  }, 1000)
}

onMounted(() => {
  // Initialize last sync times from localStorage
  try {
    const stored = localStorage.getItem(`gt:v2:syncStatus:${activeWorld.value}`)
    if (stored) {
      const parsed = JSON.parse(stored)
      lastSync.value = { ...lastSync.value, ...parsed }
    }
  } catch {}
  
  resetAutoRefreshTimer()
  startCountdown()
})

onBeforeUnmount(() => {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (countdownTimer !== null) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  
  // Save sync status to localStorage
  try {
    localStorage.setItem(
      `gt:v2:syncStatus:${activeWorld.value}`,
      JSON.stringify(lastSync.value)
    )
  } catch {}
})
</script>

<template>
  <div class="sync-status">
    <h3 class="sync-status__title">Sync Status ({{ activeWorld.toUpperCase() }})</h3>
    
    <div class="sync-status__table">
      <div class="sync-status__header">
        <div class="sync-status__cell sync-status__cell--header">Entity</div>
        <div class="sync-status__cell sync-status__cell--header">Last Sync</div>
        <div class="sync-status__cell sync-status__cell--header">Actions</div>
      </div>

      <div class="sync-status__row">
        <div class="sync-status__cell">
          <span class="sync-status__icon">📊</span>
          Game Data
        </div>
        <div class="sync-status__cell">{{ gameDataSyncTime }}</div>
        <div class="sync-status__cell">
          <button 
            @click="refreshGameData" 
            :disabled="isRefreshing"
            class="sync-status__button"
          >
            {{ isRefreshing ? '⏳' : '🔄' }} Refresh
          </button>
        </div>
      </div>

      <div class="sync-status__row">
        <div class="sync-status__cell">
          <span class="sync-status__icon">🏭</span>
          Bases
        </div>
        <div class="sync-status__cell">{{ basesSyncTime }}</div>
        <div class="sync-status__cell">
          <button 
            @click="refreshBases"
            class="sync-status__button"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div class="sync-status__row">
        <div class="sync-status__cell">
          <span class="sync-status__icon">🔬</span>
          Technology
        </div>
        <div class="sync-status__cell">{{ technologySyncTime }}</div>
        <div class="sync-status__cell">
          <button 
            @click="refreshTechnology"
            class="sync-status__button"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>

    <div class="sync-status__auto-refresh">
      <span class="sync-status__auto-refresh-label">Next auto-refresh:</span>
      <span class="sync-status__auto-refresh-time">{{ nextRefreshCountdown }}</span>
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

.sync-status__table {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sync-status__header {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr;
  gap: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--color-border);
}

.sync-status__row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-border);
}

.sync-status__row:last-child {
  border-bottom: none;
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

.sync-status__button {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  background-color: var(--color-background);
  color: var(--color-text);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.sync-status__button:hover:not(:disabled) {
  background-color: var(--color-background-mute);
  border-color: var(--color-border-hover);
}

.sync-status__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sync-status__auto-refresh {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
}

.sync-status__auto-refresh-label {
  color: var(--color-text-soft);
}

.sync-status__auto-refresh-time {
  font-weight: 600;
  color: var(--color-primary);
  font-family: monospace;
}

@media (max-width: 640px) {
  .sync-status__header,
  .sync-status__row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .sync-status__cell--header:not(:first-child),
  .sync-status__row > .sync-status__cell:not(:first-child) {
    padding-left: 2rem;
  }
}
</style>
