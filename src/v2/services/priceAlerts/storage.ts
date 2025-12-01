/**
 * Price Alerts Storage
 * Handles persistence of alerts in localStorage, world-specific
 */

import type { World } from '../api/types'
import type { AlertState, PriceAlert } from './types'

const STORAGE_KEY_PREFIX = 'gt:v2:priceAlerts'

function getStorageKey(world: World): string {
  return `${STORAGE_KEY_PREFIX}:${world}`
}

export function loadAlerts(world: World): PriceAlert[] {
  try {
    const key = getStorageKey(world)
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const state: AlertState = JSON.parse(raw)
    return Array.isArray(state.alerts) ? state.alerts : []
  } catch {
    return []
  }
}

export function saveAlerts(world: World, alerts: PriceAlert[]): void {
  try {
    const key = getStorageKey(world)
    const state: AlertState = { alerts }
    localStorage.setItem(key, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save price alerts:', e)
  }
}

export function clearAlerts(world: World): void {
  try {
    const key = getStorageKey(world)
    localStorage.removeItem(key)
  } catch (e) {
    console.error('Failed to clear price alerts:', e)
  }
}
