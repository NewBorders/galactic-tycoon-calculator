/**
 * Price Alert Types
 * Manages alert definitions and state for market price monitoring
 */

import type { World } from '../api/types'

export type AlertType = 'buy' | 'sell'

export type AlertStatus = 'active' | 'muted' | 'triggered'

export interface PriceAlert {
  id: string
  materialId: number
  materialName: string
  type: AlertType
  targetPrice: number // in cents
  status: AlertStatus
  createdAt: number
  triggeredAt: number | null
  autoCreated: boolean // true if created by stock shortage detection
}

export interface AlertState {
  alerts: PriceAlert[]
}

export interface AlertCheckResult {
  alert: PriceAlert
  currentPrice: number
  triggered: boolean
}

export type AlertSortColumn = 'material' | 'type' | 'price' | 'status'
export type SortDirection = 'asc' | 'desc'
