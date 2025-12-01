/**
 * Price Alert Manager
 * Core logic for managing, checking, and triggering alerts
 */

import { ref, computed, watch } from 'vue'
import type { PriceAlert, AlertType, AlertCheckResult, AlertSortColumn, SortDirection } from './types'
import { loadAlerts, saveAlerts } from './storage'
import { getWorld } from '../api/apiKeyManager'

// State
const alerts = ref<PriceAlert[]>([])
const world = computed(() => getWorld())
const lastCheck = ref<number | null>(null)

// Sound files - will be added to public folder
const SOUND_BUY = '/sounds/alert-buy.mp3'
const SOUND_SELL = '/sounds/alert-sell.mp3'

// Load alerts on init and when world changes
function init() {
  alerts.value = loadAlerts(world.value)
}

watch(world, () => {
  alerts.value = loadAlerts(world.value)
})

// Persist on change
watch(
  alerts,
  () => {
    saveAlerts(world.value, alerts.value)
  },
  { deep: true }
)

// Generate unique ID
function generateId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Add or update alert
 */
export function addAlert(
  materialId: number,
  materialName: string,
  type: AlertType,
  targetPrice: number,
  autoCreated = false
): PriceAlert {
  // Check if alert already exists for this material and type
  const existing = alerts.value.find(
    a => a.materialId === materialId && a.type === type
  )

  if (existing) {
    // Update existing
    existing.targetPrice = targetPrice
    existing.status = 'active'
    existing.triggeredAt = null
    return existing
  }

  // Create new
  const alert: PriceAlert = {
    id: generateId(),
    materialId,
    materialName,
    type,
    targetPrice,
    status: 'active',
    createdAt: Date.now(),
    triggeredAt: null,
    autoCreated,
  }

  alerts.value.push(alert)
  return alert
}

/**
 * Remove alert by ID
 */
export function removeAlert(id: string): void {
  const index = alerts.value.findIndex(a => a.id === id)
  if (index >= 0) {
    alerts.value.splice(index, 1)
  }
}

/**
 * Toggle mute status
 */
export function toggleMute(id: string): void {
  const alert = alerts.value.find(a => a.id === id)
  if (!alert) return

  if (alert.status === 'muted') {
    alert.status = alert.triggeredAt ? 'triggered' : 'active'
  } else {
    alert.status = 'muted'
  }
}

/**
 * Reset triggered alert to active
 */
export function resetAlert(id: string): void {
  const alert = alerts.value.find(a => a.id === id)
  if (!alert) return

  alert.status = 'active'
  alert.triggeredAt = null
}

/**
 * Get alert for material and type
 */
export function getAlert(materialId: number, type: AlertType): PriceAlert | undefined {
  return alerts.value.find(a => a.materialId === materialId && a.type === type)
}

/**
 * Check if material has any alert
 */
export function hasAlert(materialId: number): boolean {
  return alerts.value.some(a => a.materialId === materialId)
}

/**
 * Check alerts against current prices
 * Returns list of newly triggered alerts
 */
export function checkAlerts(priceResolver: (materialId: number) => number): AlertCheckResult[] {
  const results: AlertCheckResult[] = []
  const now = Date.now()
  lastCheck.value = now

  alerts.value.forEach(alert => {
    // Skip muted alerts
    if (alert.status === 'muted') return

    const currentPrice = priceResolver(alert.materialId)
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) return

    let triggered = false

    if (alert.type === 'buy') {
      // Buy alert: trigger when current price <= target (good time to buy)
      triggered = currentPrice <= alert.targetPrice
    } else {
      // Sell alert: trigger when current price >= target (good time to sell)
      triggered = currentPrice >= alert.targetPrice
    }

    // Update alert status if newly triggered
    if (triggered && alert.status !== 'triggered') {
      alert.status = 'triggered'
      alert.triggeredAt = now
      results.push({ alert, currentPrice, triggered: true })
    }

    // If previously triggered but no longer meets condition, keep as triggered
    // User must manually reset
  })

  return results
}

/**
 * Play alert sound
 */
export function playAlertSound(type: AlertType): void {
  try {
    const audio = new Audio(type === 'buy' ? SOUND_BUY : SOUND_SELL)
    audio.volume = 0.5
    audio.play().catch(() => {
      // Silently fail if audio can't play
    })
  } catch {
    // Ignore audio errors
  }
}

/**
 * Show browser notification (if permitted)
 */
export async function showNotification(alert: PriceAlert, currentPrice: number): Promise<void> {
  if (!('Notification' in window)) return

  if (Notification.permission === 'granted') {
    const priceFormatted = `$${currentPrice.toFixed(2)}`
    const targetFormatted = `$${alert.targetPrice.toFixed(2)}`
    const title = alert.type === 'buy' ? '💰 Buy Alert' : '📈 Sell Alert'
    const body = `${alert.materialName}: ${priceFormatted} ${alert.type === 'buy' ? '≤' : '≥'} ${targetFormatted}`

    new Notification(title, {
      body,
      icon: '/favicon.svg',
      tag: alert.id,
    })
  } else if (Notification.permission === 'default') {
    // Request permission
    await Notification.requestPermission()
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return await Notification.requestPermission()
}

/**
 * Get current notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

/**
 * Auto-create buy alert for low stock materials
 */
export function autoCreateBuyAlert(
  materialId: number,
  materialName: string,
  averagePrice: number
): void {
  const existing = getAlert(materialId, 'buy')
  
  if (existing) {
    // If exists and is muted, unmute it
    if (existing.status === 'muted') {
      existing.status = 'active'
      existing.triggeredAt = null
    }
  } else {
    // Create new auto-alert
    addAlert(materialId, materialName, 'buy', averagePrice, true)
  }
}

/**
 * Sort alerts
 */
export function sortAlerts(
  alertList: PriceAlert[],
  column: AlertSortColumn,
  direction: SortDirection
): PriceAlert[] {
  const sorted = [...alertList]

  sorted.sort((a, b) => {
    let comparison = 0

    switch (column) {
      case 'material':
        comparison = a.materialName.localeCompare(b.materialName)
        break
      case 'type':
        comparison = a.type.localeCompare(b.type)
        break
      case 'price':
        comparison = a.targetPrice - b.targetPrice
        break
      case 'status':
        comparison = a.status.localeCompare(b.status)
        break
    }

    return direction === 'asc' ? comparison : -comparison
  })

  return sorted
}

// Initialize on module load
init()

// Export composable
export function usePriceAlerts() {
  return {
    alerts: computed(() => alerts.value),
    lastCheck: computed(() => lastCheck.value),
    addAlert,
    removeAlert,
    toggleMute,
    resetAlert,
    getAlert,
    hasAlert,
    checkAlerts,
    playAlertSound,
    showNotification,
    autoCreateBuyAlert,
    sortAlerts,
    requestNotificationPermission,
    getNotificationPermission,
  }
}
