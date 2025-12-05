/**
 * Migration from V1 to V2 Storage
 * 
 * Handles migration of existing localStorage data to new per-world structure.
 * V1: Single global state
 * V2: Per-world isolated state
 */

import type { World } from '../api/types'
import { 
  clearAllWorldData, 
  createEmptyWorldData, 
  getStorageVersion, 
  saveWorldData, 
  setActiveWorld, 
  setStorageVersion 
} from './storage'

/**
 * Perform migration from V1 to V2
 * 
 * Strategy: Clear old data and start fresh, but preserve API key if exists
 */
export function migrateToV2(): void {
  const version = getStorageVersion()
  
  if (version === '2') {
    console.log('[Migration] Already on V2, skipping migration')
    return
  }
  
  console.log('[Migration] Starting V1 → V2 migration')
  
  try {
    // Step 1: Try to extract API key from old storage
    let oldApiKey = ''
    let oldWorld: World = 'g2'
    
    try {
      oldApiKey = localStorage.getItem('gt:v2:api:key') || ''
      const savedWorld = localStorage.getItem('gt:v2:api:world')
      if (savedWorld === 'g1' || savedWorld === 'g2') {
        oldWorld = savedWorld
      }
    } catch {
      // Ignore errors reading old data
    }
    
    // Step 2: Backup old data (optional, for debugging)
    const oldData: Record<string, string> = {}
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('gt:v2:')) {
          oldData[key] = localStorage.getItem(key) || ''
        }
      })
      console.log('[Migration] Backed up', Object.keys(oldData).length, 'old keys')
    } catch {
      // Continue even if backup fails
    }
    
    // Step 3: Clear all old data
    clearAllWorldData()
    
    // Step 4: Create new V2 structure with API key preserved
    if (oldApiKey) {
      console.log('[Migration] Preserving API key for world', oldWorld)
      
      const newData = createEmptyWorldData(oldWorld, oldApiKey)
      saveWorldData(newData)
      setActiveWorld(oldWorld)
    } else {
      console.log('[Migration] No API key found, starting fresh')
      setActiveWorld('g2')
    }
    
    // Step 5: Mark migration complete
    setStorageVersion('2')
    
    console.log('[Migration] Migration successful')
    
    // User will need to re-import bases via API
    return
    
  } catch (error) {
    console.error('[Migration] Migration failed:', error)
    
    // Don't try to restore backup - just let user start fresh
    // Better to lose data than corrupt it
    alert('Failed to migrate data. Please refresh the page and re-import your bases from the game.')
  }
}

/**
 * Check if user has any V1 data that would be lost
 */
export function hasV1Data(): boolean {
  try {
    const oldBasesKey = 'gt:v2:player:bases:v2'
    const oldBases = localStorage.getItem(oldBasesKey)
    return !!oldBases && oldBases.length > 10 // Has some data
  } catch {
    return false
  }
}
