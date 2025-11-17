/**
 * API Key and Configuration Management Service
 * Handles secure storage and retrieval of API keys and world settings from localStorage
 */

import { ref } from 'vue'
import type { World } from './types'

const API_KEY_LS_KEY = 'gt:v2:api:key'
const WORLD_LS_KEY = 'gt:v2:api:world'
const DEFAULT_WORLD: World = 'g2'

// Reactive state for API key
const apiKeyState = ref<string | null>(null)

// Initialize state from localStorage on module load
try {
  apiKeyState.value = localStorage.getItem(API_KEY_LS_KEY) ?? null
} catch {
  apiKeyState.value = null
}

/**
 * Get stored API key from localStorage
 */
export function getApiKey(): string | null {
  return apiKeyState.value
}

/**
 * Get reactive API key reference (for use in computed/watch)
 */
export function getApiKeyRef() {
  return apiKeyState
}

/**
 * Store API key in localStorage
 */
export function setApiKey(key: string): boolean {
  try {
    const trimmed = key.trim()
    if (trimmed.length === 0) {
      localStorage.removeItem(API_KEY_LS_KEY)
      apiKeyState.value = null
      return true
    }
    localStorage.setItem(API_KEY_LS_KEY, trimmed)
    apiKeyState.value = trimmed
    return true
  } catch {
    return false
  }
}

/**
 * Check if an API key is configured
 */
export function hasApiKey(): boolean {
  return apiKeyState.value !== null
}

/**
 * Reset API key state (for testing only)
 */
export function __resetApiKeyState__(): void {
  apiKeyState.value = null
}

/**
 * Get stored world setting
 */
export function getWorld(): World {
  try {
    const world = localStorage.getItem(WORLD_LS_KEY)
    if (world === 'g1' || world === 'g2') {
      return world
    }
    return DEFAULT_WORLD
  } catch {
    return DEFAULT_WORLD
  }
}

/**
 * Store world setting in localStorage
 */
export function setWorld(world: World): boolean {
  try {
    if (world !== 'g1' && world !== 'g2') {
      return false
    }
    localStorage.setItem(WORLD_LS_KEY, world)
    return true
  } catch {
    return false
  }
}
