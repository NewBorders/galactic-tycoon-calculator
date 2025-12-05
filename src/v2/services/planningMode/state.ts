/**
 * Planning Mode State Management
 * 
 * Core planning mode functionality: enter/exit planning, track changes.
 */

import { computed } from 'vue'
import { useWorldData } from '../worldData'
import type { HistoryEntry, PlanningAction } from '../worldData/types'
import type { PlayerBase } from '../playerBases'

const uid = () => Math.random().toString(36).slice(2, 10)

/**
 * Planning Mode Composable
 */
export function usePlanningMode() {
  const { worldData, isPlanningActive, save } = useWorldData()
  
  /**
   * Create deep clone of bases for planning
   */
  function cloneBases(bases: PlayerBase[]): PlayerBase[] {
    return JSON.parse(JSON.stringify(bases))
  }
  
  /**
   * Enter planning mode
   * Creates a snapshot of current state for modification
   */
  function enterPlanningMode(): void {
    if (worldData.value.planning) {
      console.log('[Planning] Already in planning mode')
      return
    }
    
    console.log('[Planning] Entering planning mode')
    
    worldData.value.planning = {
      sessionId: `session-${Date.now()}-${uid()}`,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      bases: cloneBases(worldData.value.current.bases),
      technology: { ...worldData.value.current.technology },
      history: [],
      historyIndex: -1,
    }
    
    save()
  }
  
  /**
   * Exit planning mode
   * @param apply - If true, apply planned changes to current state
   */
  function exitPlanningMode(apply: boolean = false): void {
    if (!worldData.value.planning) {
      console.log('[Planning] Not in planning mode')
      return
    }
    
    console.log('[Planning] Exiting planning mode, apply:', apply)
    
    if (apply) {
      // Apply planned changes to current state
      worldData.value.current.bases = cloneBases(worldData.value.planning.bases)
      worldData.value.current.technology = { ...worldData.value.planning.technology }
      worldData.value.current.fetchedAt = Date.now()
    }
    
    // Clear planning state
    worldData.value.planning = null
    save()
  }
  
  /**
   * Discard all planning changes
   */
  function discardPlanning(): void {
    exitPlanningMode(false)
  }
  
  /**
   * Apply planning changes to current state
   */
  function applyPlanning(): void {
    exitPlanningMode(true)
  }
  
  /**
   * Add entry to planning history
   */
  function addHistoryEntry(
    action: PlanningAction,
    baseId: string,
    description: string,
    previousState: any,
    newState: any
  ): void {
    if (!worldData.value.planning) return
    
    const planning = worldData.value.planning
    
    // Truncate history if we're in the middle (after undo)
    planning.history = planning.history.slice(0, planning.historyIndex + 1)
    
    // Add new entry
    const entry: HistoryEntry = {
      id: `history-${Date.now()}-${uid()}`,
      timestamp: Date.now(),
      action,
      baseId,
      description,
      previousState,
      newState,
    }
    
    planning.history.push(entry)
    planning.historyIndex = planning.history.length - 1
    planning.modifiedAt = Date.now()
    
    // Limit history size
    const MAX_HISTORY = 50
    if (planning.history.length > MAX_HISTORY) {
      planning.history.shift()
      planning.historyIndex--
    }
    
    save()
  }
  
  /**
   * Get planned bases (or current if not planning)
   */
  const plannedBases = computed(() => {
    return worldData.value.planning?.bases || worldData.value.current.bases
  })
  
  /**
   * Get planned technology (or current if not planning)
   */
  const plannedTechnology = computed(() => {
    return worldData.value.planning?.technology || worldData.value.current.technology
  })
  
  /**
   * Get planning history
   */
  const history = computed(() => {
    return worldData.value.planning?.history || []
  })
  
  /**
   * Get current history index
   */
  const historyIndex = computed(() => {
    return worldData.value.planning?.historyIndex ?? -1
  })
  
  /**
   * Check if can undo
   */
  const canUndo = computed(() => {
    return isPlanningActive.value && historyIndex.value >= 0
  })
  
  /**
   * Check if can redo
   */
  const canRedo = computed(() => {
    return isPlanningActive.value && 
           historyIndex.value < history.value.length - 1
  })
  
  /**
   * Get number of pending changes
   */
  const changeCount = computed(() => {
    return history.value.length
  })
  
  return {
    // State
    isPlanningActive,
    plannedBases,
    plannedTechnology,
    history,
    historyIndex,
    canUndo,
    canRedo,
    changeCount,
    
    // Actions
    enterPlanningMode,
    exitPlanningMode,
    discardPlanning,
    applyPlanning,
    addHistoryEntry,
  }
}
