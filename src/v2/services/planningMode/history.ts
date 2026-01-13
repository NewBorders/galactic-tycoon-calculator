/**
 * Planning Mode History (Undo/Redo)
 * 
 * Manages undo/redo functionality for planning mode.
 */

import { useWorldData } from '../worldData'
import { usePlanningMode } from './state'

/**
 * Undo/Redo Composable
 */
export function usePlanningHistory() {
  const { worldData, save } = useWorldData()
  const { canUndo, canRedo, historyIndex } = usePlanningMode()
  
  /**
   * Undo last action
   */
  function undo(): boolean {
    if (!canUndo.value || !worldData.value.planning) {
      console.log('[Planning] Cannot undo')
      return false
    }
    
    const planning = worldData.value.planning
    const entry = planning.history[planning.historyIndex]
    
    if (!entry) return false
    
    console.log('[Planning] Undo:', entry.description)
    
    // Restore previous state
    applyHistoryState(entry.previousState, entry.baseId)
    
    // Move history pointer back
    planning.historyIndex--
    planning.modifiedAt = Date.now()
    
    save()
    return true
  }
  
  /**
   * Redo previously undone action
   */
  function redo(): boolean {
    if (!canRedo.value || !worldData.value.planning) {
      console.log('[Planning] Cannot redo')
      return false
    }
    
    const planning = worldData.value.planning
    const entry = planning.history[planning.historyIndex + 1]
    
    if (!entry) return false
    
    console.log('[Planning] Redo:', entry.description)
    
    // Apply new state
    applyHistoryState(entry.newState, entry.baseId)
    
    // Move history pointer forward
    planning.historyIndex++
    planning.modifiedAt = Date.now()
    
    save()
    return true
  }
  
  /**
   * Apply state from history entry
   */
  function applyHistoryState(state: Record<string, unknown>, baseId: string): void {
    if (!worldData.value.planning) return
    
    const planning = worldData.value.planning
    const base = planning.bases.find(b => b.id === baseId)
    
    if (!base) {
      console.error('[Planning] Base not found:', baseId)
      return
    }
    
    // Merge state into base
    Object.assign(base, state)
  }
  
  /**
   * Clear all history
   */
  function clearHistory(): void {
    if (!worldData.value.planning) return
    
    worldData.value.planning.history = []
    worldData.value.planning.historyIndex = -1
    save()
  }
  
  /**
   * Get description of action at index
   */
  function getHistoryDescription(index: number): string | null {
    if (!worldData.value.planning) return null
    
    const entry = worldData.value.planning.history[index]
    return entry?.description || null
  }
  
  return {
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    getHistoryDescription,
    historyIndex,
  }
}
