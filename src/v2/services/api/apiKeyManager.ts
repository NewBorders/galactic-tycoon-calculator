/**
 * API Key Management Service
 * Handles secure storage and retrieval of API keys from localStorage
 */

const API_KEY_LS_KEY = 'gt:v2:api:key'

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
 * Remove stored API key
 */
export function clearApiKey(): void {
  try {
    localStorage.removeItem(API_KEY_LS_KEY)
  } catch {}
}
