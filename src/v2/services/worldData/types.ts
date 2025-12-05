/**
 * World Data Types
 * 
 * Defines the structure for per-world data storage.
 * Each world (G1, G2) has its own isolated data.
 */

import type { PlayerBase } from '../playerBases'
import type { World } from '../api/types'

/**
 * Current state synced from API (read-only)
 */
export interface CurrentState {
  bases: PlayerBase[]
  technology: Record<number, number> // techId -> level
  warehouseStocks: Record<number, number> // materialId -> amount
  fetchedAt: number // timestamp of last sync
}

/**
 * Planning state (user's modifications)
 */
export interface PlanningState {
  sessionId: string
  createdAt: number
  modifiedAt: number
  bases: PlayerBase[] // cloned & modified from current
  technology: Record<number, number>
  history: HistoryEntry[]
  historyIndex: number
}

/**
 * Single action in planning history for undo/redo
 */
export interface HistoryEntry {
  id: string
  timestamp: number
  action: PlanningAction
  baseId: string
  description: string // Human-readable: "Upgraded Mining Facility 3→5"
  previousState: any // State before action
  newState: any // State after action
}

/**
 * All possible planning actions
 */
export type PlanningAction =
  | { type: 'ADD_BUILDING'; buildingId: number; level: number }
  | { type: 'UPDATE_BUILDING'; id: string; field: 'level'; oldValue: number; newValue: number }
  | { type: 'REMOVE_BUILDING'; id: string; buildingId: number }
  | { type: 'ADD_RECIPE'; recipeId: number; count: number }
  | { type: 'UPDATE_RECIPE'; id: string; field: 'count'; oldValue: number; newValue: number }
  | { type: 'REMOVE_RECIPE'; id: string; recipeId: number }
  | { type: 'UPDATE_TECH'; techId: number; oldLevel: number; newLevel: number }
  | { type: 'ADD_BASE'; planetId: number }
  | { type: 'REMOVE_BASE'; baseId: string }

/**
 * Complete data for a single world
 */
export interface WorldData {
  worldId: World
  apiKey: string
  lastSync: Record<string, number> // entity -> timestamp
  current: CurrentState
  planning: PlanningState | null
  uiState: WorldUiState
}

/**
 * UI state per world (collapsed sections, etc.)
 */
export interface WorldUiState {
  basesOpen: Record<string, boolean>
  sections: Record<string, { buildings: boolean; production: boolean; dailySummary: boolean }>
}

/**
 * TODO item for tracking planned changes
 */
export interface TodoItem {
  id: string
  baseId: string
  baseName: string
  action: PlanningAction
  description: string
  status: 'pending' | 'done'
  createdAt: number
  completedAt?: number
}
