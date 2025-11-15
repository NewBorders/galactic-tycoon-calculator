/**
 * API Key and Configuration Management Service
 * Handles secure storage and retrieval of API keys and world settings from localStorage
 */

import type { World } from './types'

const API_KEY_LS_KEY = 'gt:v2:api:key'
const WORLD_LS_KEY = 'gt:v2:api:world'
const DEFAULT_WORLD: World = 'g2'

/**
 * Get stored API key from localStorage
 */
export function getApiKey(): string | null {
  try {
    return localStorage.getItem(API_KEY_LS_KEY) ?? null
  } catch {
    return null
  }
}

/**
 * Store API key in localStorage
 */
export function setApiKey(key: string): boolean {
  try {
    const trimmed = key.trim()
    if (trimmed.length === 0) {
      localStorage.removeItem(API_KEY_LS_KEY)
      return true
    }
    localStorage.setItem(API_KEY_LS_KEY, trimmed)
    return true
  } catch {
    return false
  }
}

/**
 * Check if an API key is configured
 */
export function hasApiKey(): boolean {
  return getApiKey() !== null
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
