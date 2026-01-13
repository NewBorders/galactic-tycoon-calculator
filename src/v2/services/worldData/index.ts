/**
 * World Data Composable
 * 
 * Main entry point for accessing and managing per-world data.
 * Provides reactive access to current world data and world switching.
 */

import { computed, ref, watch } from 'vue'
import type { World } from '../api/types'
import type { WorldData } from './types'
import { 
  getActiveWorld, 
  loadWorldData, 
  saveWorldData, 
  setActiveWorld as setActiveWorldStorage 
} from './storage'
import { migrateToV2, hasV1Data } from './migration'

// Migration is now performed via explicit initialization function
let _migrationDone = false

/**
 * Initialize world data module (runs migration if needed).
 * Call this once at app startup.
 */
function initMigration() {
  if (_migrationDone) return
  if (hasV1Data()) {
    console.log('[WorldData] Detected V1 data, running migration...')
    migrateToV2()
  }
  _migrationDone = true
}

// Active world
const activeWorld = ref<World>(getActiveWorld())

// Data for active world
const worldData = ref<WorldData>(loadWorldData(activeWorld.value))

// Auto-save on changes with debouncing for performance
let saveTimeout: number | null = null

watch(
  worldData,
  () => {
    // Clear existing timeout
    if (saveTimeout) clearTimeout(saveTimeout)
    
    // Schedule save for next tick instead of delay to avoid losing data in tests
    saveTimeout = window.setTimeout(() => {
      saveWorldData(worldData.value)
      saveTimeout = null
    }, 0)
  },
  { deep: true }
)

// Run migration once at module load
initMigration()

/**
 * Main composable for world data management
 */
export function useWorldData() {
  /**
   * Switch to different world
   * @param world - Target world to switch to
   */
  function switchWorld(world: World): void {
    // Save current world data before switching
    saveWorldData(worldData.value)
    
    // Switch active world
    activeWorld.value = world
    setActiveWorldStorage(world)
    
    // Load new world data
    worldData.value = loadWorldData(world)
    
    console.log('[WorldData] Switched to world', world)
  }
  
  /**
   * Update API key for current world
   */
  function setApiKey(apiKey: string): void {
    worldData.value.apiKey = apiKey.trim()
  }
  
  /**
   * Get API key for current world
   */
  const apiKey = computed(() => worldData.value.apiKey)
  
  /**
   * Check if API key is configured
   */
  const hasApiKey = computed(() => !!worldData.value.apiKey)
  
  /**
   * Get current state (read-only API data)
   */
  const current = computed(() => worldData.value.current)
  
  /**
   * Get planning state (user modifications)
   */
  const planning = computed(() => worldData.value.planning)
  
  /**
   * Check if planning mode is active
   */
  const isPlanningActive = computed(() => !!worldData.value.planning)
  
  /**
   * Get UI state
   */
  const uiState = computed(() => worldData.value.uiState)
  
  /**
   * Update current state from API
   */
  function updateCurrent(updates: Partial<WorldData['current']>): void {
    worldData.value.current = {
      ...worldData.value.current,
      ...updates,
      fetchedAt: Date.now(),
    }
    
    // Update last sync timestamp
    if (updates.bases) {
      worldData.value.lastSync.bases = Date.now()
    }
    if (updates.technology) {
      worldData.value.lastSync.technology = Date.now()
    }
    // NOTE: warehouseStocks removed - now stored in base.stock
  }
  
  /**
   * Get last sync timestamp for entity
   */
  function getLastSync(entity: string): number | null {
    return worldData.value.lastSync[entity] || null
  }
  
  /**
   * Force save to localStorage
   */
  function save(): void {
    saveWorldData(worldData.value)
  }
  
  return {
    // State
    activeWorld: computed(() => activeWorld.value),
    apiKey,
    hasApiKey,
    current,
    planning,
    isPlanningActive,
    uiState,
    
    // Actions
    switchWorld,
    setApiKey,
    updateCurrent,
    getLastSync,
    save,
    
    // Raw access for advanced use
    worldData: computed(() => worldData.value),
  }
}

/**
 * Reset world data state (for testing)
 * @internal
 */
export function __resetWorldDataState__(): void {
  activeWorld.value = getActiveWorld()
  worldData.value = loadWorldData(activeWorld.value)
}
