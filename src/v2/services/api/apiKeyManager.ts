/**
 * API Key and Configuration Management Service
 * Handles secure storage and retrieval of API keys and world settings from localStorage
 * 
 * NOTE: This module now integrates with worldData for per-world API keys.
 * These functions provide backward compatibility and convenience.
 */

import { computed } from 'vue'
import type { World } from './types'
import { useWorldData } from '../worldData'

// Get world data composable
let worldDataInstance: ReturnType<typeof useWorldData> | null = null

function getWorldDataInstance() {
  if (!worldDataInstance) {
    worldDataInstance = useWorldData()
  }
  return worldDataInstance
}

/**
 * Get stored API key for current world
 */
export function getApiKey(): string | null {
  const { apiKey } = getWorldDataInstance()
  return apiKey.value || null
}

/**
 * Get reactive API key reference for current world
 */
export function getApiKeyRef() {
  const { apiKey } = getWorldDataInstance()
  return apiKey
}

/**
 * Store API key for current world
 */
export function setApiKey(key: string): boolean {
  try {
    const { setApiKey: setWorldApiKey } = getWorldDataInstance()
    setWorldApiKey(key)
    return true
  } catch {
    return false
  }
}

/**
 * Check if an API key is configured for current world
 */
export function hasApiKey(): boolean {
  const { hasApiKey } = getWorldDataInstance()
  return hasApiKey.value
}

/**
 * Get current active world
 */
export function getWorld(): World {
  const { activeWorld } = getWorldDataInstance()
  return activeWorld.value
}

/**
 * Switch to different world
 */
export function setWorld(world: World): boolean {
  try {
    if (world !== 'g1' && world !== 'g2') {
      return false
    }
    const { switchWorld } = getWorldDataInstance()
    switchWorld(world)
    return true
  } catch {
    return false
  }
}
