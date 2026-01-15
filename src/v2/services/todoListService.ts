/**
 * TodoList Service - Singleton pattern with per-scope histories
 * Each base and global changes have separate undo/redo histories
 */

import { ref, computed } from 'vue'
import type { PlayerBasesService } from './stateReversion'
import { applyStateReversions } from './stateReversion'
import { unregisterChange } from './changeStorage'

export type ChangeType = 'technology' | 'building' | 'recipe' | 'stock' | 'base' | 'starting-bonus'
export type ScopeType = 'global' | 'base'

export interface Change {
  id: string  // Unique ID for this change, used for state reversion
  type: ChangeType
  timestamp: number
  description: string
  planetId?: number
  details?: Record<string, string | number | undefined>
}

export interface TodoStep {
  id: string
  changes: Change[]
  description: string
  createdAt: number
}

export interface TodoGroup {
  scope: ScopeType
  planetId?: number
  steps: TodoStep[]
}

// Scope key format: "global" or "base:{baseName}"
type ScopeKey = string

interface ScopeHistory {
  history: TodoGroup[][]  // Array of states
  currentIndex: number    // Current position in history
}

let todoListInstance: ReturnType<typeof createTodoList> | null = null
let playerBasesInstance: PlayerBasesService | null = null

const TODO_STORAGE_KEY = 'gt:v2:todoList:v2'  // New version for per-scope storage
const OLD_TODO_STORAGE_KEY = 'gt:v2:todoList:v1'  // Old global history format

function getScopeKey(scope: ScopeType, planetId?: number): ScopeKey {
  return scope === 'global' ? 'global' : `base:${planetId}`
}

function createTodoList() {
  // Clean up old storage format (pre-release, can be removed after some time)
  try {
    const oldData = localStorage.getItem(OLD_TODO_STORAGE_KEY)
    if (oldData) {
      console.log('[TodoListService] Clearing old v1 storage format (not compatible with v2)')
      localStorage.removeItem(OLD_TODO_STORAGE_KEY)
    }
  } catch (e) {
    console.error('[TodoListService] Failed to clean old storage:', e)
  }

  // Load from localStorage
  function loadFromStorage(): { histories: Map<ScopeKey, ScopeHistory>; isOpen: boolean } {
    try {
      const stored = localStorage.getItem(TODO_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const historiesMap = new Map<ScopeKey, ScopeHistory>()
        
        if (parsed.histories && typeof parsed.histories === 'object') {
          Object.entries(parsed.histories).forEach(([key, value]) => {
            historiesMap.set(key, value as ScopeHistory)
          })
        }
        
        return {
          histories: historiesMap,
          isOpen: parsed.isOpen ?? true,
        }
      }
    } catch (e) {
      console.error('[TodoListService] Failed to load from storage:', e)
    }
    return { histories: new Map(), isOpen: true }
  }

  // Save to localStorage
  function saveToStorage() {
    try {
      const historiesObj: Record<string, ScopeHistory> = {}
      scopeHistories.value.forEach((history, key) => {
        historiesObj[key] = history
      })
      
      const data = {
        histories: historiesObj,
        isOpen: isOpen.value,
      }
      localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('[TodoListService] Failed to save to storage:', e)
    }
  }

  // Initialize from storage
  const stored = loadFromStorage()
  
  // Per-scope histories
  const scopeHistories = ref<Map<ScopeKey, ScopeHistory>>(stored.histories)
  const isOpen = ref(stored.isOpen)
  
  // Flag to prevent tracking during undo/redo
  let isReverting = false

  // Get or create history for a scope
  function getOrCreateScopeHistory(scopeKey: ScopeKey): ScopeHistory {
    let history = scopeHistories.value.get(scopeKey)
    if (!history) {
      history = {
        history: [[]],  // Start with one empty state
        currentIndex: 0,
      }
      scopeHistories.value.set(scopeKey, history)
    }
    return history
  }

  // Get all current groups (from all scopes at their current indices)
  const todoGroups = computed(() => {
    const allGroups: TodoGroup[] = []
    
    scopeHistories.value.forEach((scopeHistory) => {
      if (scopeHistory.currentIndex >= 0 && scopeHistory.currentIndex < scopeHistory.history.length) {
        const groupsAtIndex = scopeHistory.history[scopeHistory.currentIndex]
        if (groupsAtIndex && Array.isArray(groupsAtIndex)) {
          allGroups.push(...groupsAtIndex)
        }
      }
    })
    
    return allGroups
  })

  // Flatten all steps from all groups for statistics
  const allSteps = computed(() => {
    return todoGroups.value.flatMap(group => group.steps)
  })

  // Display groups - merge consecutive similar changes for cleaner UI
  const displayGroups = computed(() => {
    const merged: TodoGroup[] = []
    
    for (const group of todoGroups.value) {
      const mergedSteps: TodoStep[] = []
      
      for (const step of group.steps) {
        const lastMerged = mergedSteps[mergedSteps.length - 1]
        
        if (lastMerged && step.changes.length === 1 && lastMerged.changes.length === 1) {
          const lastChange = lastMerged.changes[0]
          const currentChange = step.changes[0]
          
          // Try to merge if same type and target
          if (lastChange && currentChange && canMergeWithChange(lastChange, currentChange)) {
            const from = lastChange.details?.from
            const to = currentChange.details?.to
            
            if (from !== undefined && to !== undefined) {
              // Check if changes cancel out (from == to)
              if (from === to) {
                // Remove the last merged step as it cancels out
                mergedSteps.pop()
                continue
              }
              
              // Update the last merged step with new "to" value
              let newDescription = lastChange.description
              if (currentChange.type === 'building' || currentChange.type === 'technology' || currentChange.type === 'stock') {
                newDescription = lastChange.description.replace(
                  /(\d+) → \d+/,
                  `${from} → ${to}`
                )
              }
              
              lastMerged.changes = [{
                ...lastChange,
                description: newDescription,
                details: {
                  ...lastChange.details,
                  to: to,
                },
              }]
              lastMerged.description = newDescription
              continue
            }
          }
        }
        
        // Not mergeable, add as new step
        mergedSteps.push({ ...step })
      }
      
      merged.push({
        scope: group.scope,
        planetId: group.planetId,
        steps: mergedSteps,
      })
    }
    
    return merged
  })

  // Get display groups for a specific scope
  function getDisplayGroupsForScope(scope: ScopeType, planetId?: number): TodoGroup[] {
    const scopeKey = getScopeKey(scope, planetId)
    return displayGroups.value.filter(g => getScopeKey(g.scope, g.planetId) === scopeKey)
  }

  // Check if undo is available for a scope
  function canUndoForScope(scope: ScopeType, planetId?: number): boolean {
    const scopeKey = getScopeKey(scope, planetId)
    const history = scopeHistories.value.get(scopeKey)
    return history ? history.currentIndex > 0 : false
  }

  // Check if redo is available for a scope
  function canRedoForScope(scope: ScopeType, planetId?: number): boolean {
    const scopeKey = getScopeKey(scope, planetId)
    const history = scopeHistories.value.get(scopeKey)
    return history ? history.currentIndex < history.history.length - 1 : false
  }

  // Total number of changes
  const totalChanges = computed(() => allSteps.value.length)

  // Check if two changes are similar enough to merge
  function canMergeWithChange(lastChange: Change, newChange: Change): boolean {
    // Must be same type and same scope
    if (lastChange.planetId !== newChange.planetId) return false

    // Building changes - only merge if both are LEVEL changes (not add/remove)
    if (lastChange.type === 'building' && newChange.type === 'building') {
      // Don't merge add/remove with level changes
      const lastIsAction = !!lastChange.details?.action
      const newIsAction = !!newChange.details?.action
      
      if (lastIsAction || newIsAction) return false

      // Check if same building slot
      const lastSlotId = lastChange.details?.slotId as string
      const newSlotId = newChange.details?.slotId as string
      return lastSlotId === newSlotId
    }

    // Recipe changes - only merge count changes, not add/remove
    if (lastChange.type === 'recipe' && newChange.type === 'recipe') {
      const lastIsAction = !!lastChange.details?.action
      const newIsAction = !!newChange.details?.action
      
      if (lastIsAction || newIsAction) return false

      // Check if same recipe instance
      const lastRecipeId = lastChange.details?.recipeInstanceId as string
      const newRecipeId = newChange.details?.recipeInstanceId as string
      return lastRecipeId === newRecipeId
    }

    // Technology - merge changes to same tech
    if (lastChange.type === 'technology' && newChange.type === 'technology') {
      const lastTechId = lastChange.details?.techId as number
      const newTechId = newChange.details?.techId as number
      return lastTechId === newTechId
    }

    // Starting bonus - always merge
    if (lastChange.type === 'starting-bonus' && newChange.type === 'starting-bonus') {
      return true
    }

    // Stock - merge changes to same material
    if (lastChange.type === 'stock' && newChange.type === 'stock') {
      const lastMaterialId = lastChange.details?.materialId as number
      const newMaterialId = newChange.details?.materialId as number
      return lastMaterialId === newMaterialId
    }

    return false
  }

  function doCancelsOut(change1: Change, change2: Change): boolean {
    // Check if both changes affect the same target
    if (change1.details?.targetId !== change2.details?.targetId) {
      console.log('[doCancelsOut] Different targetIds:', change1.details?.targetId, change2.details?.targetId)
      return false
    }

    // Recipe added then removed
    if (change1.type === 'recipe' && change2.type === 'recipe') {
      const action1 = change1.details?.action as string
      const action2 = change2.details?.action as string
      const recipeName1 = change1.details?.recipeName as string
      const recipeName2 = change2.details?.recipeName as string
      
      // Check if one is add and one is remove, with same recipe name
      return (action1 === 'add' && action2 === 'remove' || action1 === 'remove' && action2 === 'add') 
             && recipeName1 === recipeName2
    }

    // Building changes
    if (change1.type === 'building' && change2.type === 'building') {
      const action1 = change1.details?.action as string
      const action2 = change2.details?.action as string
      
      // Building added then removed (must be same slot)
      if (action1 && action2) {
        const slotId1 = change1.details?.slotId as string
        const slotId2 = change2.details?.slotId as string
        
        // Check if one is add and one is remove, with same slot
        return (action1 === 'add' && action2 === 'remove' || action1 === 'remove' && action2 === 'add')
               && slotId1 === slotId2
      }
      
      // Building level changes (e.g., level 12→11→12)
      const field1 = change1.details?.field as string
      const field2 = change2.details?.field as string
      const originalValue = change1.details?.originalValue
      const newValue2 = change2.details?.newValue
      
      console.log('[doCancelsOut] Building level check:', {
        field1,
        field2,
        originalValue,
        newValue2,
        matches: field1 && field2 && field1 === field2 && originalValue !== undefined && newValue2 !== undefined && originalValue === newValue2
      })
      
      // If change2 reverts back to the original value of change1
      // All values must be defined
      return !!(field1 && field2 && field1 === field2 && originalValue !== undefined && newValue2 !== undefined && originalValue === newValue2)
    }

    // Numeric changes that return to original value (e.g., level 10→11→10)
    if (change1.type === change2.type && change1.type !== 'recipe') {
      const field1 = change1.details?.field as string
      const field2 = change2.details?.field as string
      const originalValue = change1.details?.originalValue
      const newValue2 = change2.details?.newValue
      
      console.log('[doCancelsOut] Numeric check:', {
        type: change1.type,
        field1,
        field2,
        originalValue,
        newValue2,
        matches: field1 && field2 && field1 === field2 && originalValue !== undefined && newValue2 !== undefined && originalValue === newValue2
      })
      
      // If change2 reverts back to the original value of change1
      // All values must be defined
      return !!(field1 && field2 && field1 === field2 && originalValue !== undefined && newValue2 !== undefined && originalValue === newValue2)
    }

    return false
  }

  // Add a change to the appropriate scope's history
  function addChange(change: Omit<Change, 'timestamp'>): void {
    if (isReverting) {
      console.log('[TodoListService] Skipping change during undo/redo reversion')
      return
    }

    // Determine scope based on change type
    const scope: ScopeType = change.type === 'technology' || change.type === 'starting-bonus' || change.type === 'base' ? 'global' : 'base'
    const planetId = change.planetId
    const scopeKey = getScopeKey(scope, planetId)

    // Get or create scope history
    const scopeHistory = getOrCreateScopeHistory(scopeKey)

    // Remove redo stack when new change is made
    if (scopeHistory.currentIndex < scopeHistory.history.length - 1) {
      scopeHistory.history = scopeHistory.history.slice(0, scopeHistory.currentIndex + 1)
    }

    // Work on a COPY to avoid modifying history in-place
    const currentState = scopeHistory.history[scopeHistory.currentIndex]
    if (!currentState) {
      console.error('[TodoListService] Invalid state: currentIndex', scopeHistory.currentIndex, 'history length', scopeHistory.history.length)
      return
    }
    const currentGroups = JSON.parse(JSON.stringify(currentState)) as TodoGroup[]

    // Find or create target group in the copy
    let targetGroup = currentGroups.find(g => g.scope === scope && g.planetId === planetId)
    if (!targetGroup) {
      targetGroup = {
        scope,
        planetId,
        steps: [],
      }
      currentGroups.push(targetGroup)
    }

    const now = Date.now()
    const changeWithTime: Change = { ...change, timestamp: now }

    // Check if this change cancels out the last history entry
    // Look at the CURRENT state (already has the previous change)
    const stateForCancelCheck = scopeHistory.history[scopeHistory.currentIndex]
    if (stateForCancelCheck) {
      const groupForCancelCheck = stateForCancelCheck.find(g => g.scope === scope && g.planetId === planetId)
      
      if (groupForCancelCheck && groupForCancelCheck.steps.length > 0) {
        const lastStep = groupForCancelCheck.steps[groupForCancelCheck.steps.length - 1]
        
        if (lastStep && lastStep.changes.length === 1) {
          const lastChange = lastStep.changes[0]
          console.log('[TodoListService] Checking cancel-out for:', lastChange?.type, changeWithTime.type)
          if (lastChange && doCancelsOut(lastChange, changeWithTime)) {
            console.log('[TodoListService] Changes cancel out, reverting to previous state')
            // Both changes negate each other - go back to the previous history state
            // Unregister both changes to prevent stale references
            const lastChangeId = lastChange.details?.changeId as string | undefined
            if (lastChangeId) {
              unregisterChange(lastChangeId)
            }
            const currentChangeId = changeWithTime.details?.changeId as string | undefined
            if (currentChangeId) {
              unregisterChange(currentChangeId)
            }
            
            // Remove the last history entry (go back one step)
            if (scopeHistory.currentIndex > 0) {
              scopeHistory.currentIndex--
              scopeHistory.history = scopeHistory.history.slice(0, scopeHistory.currentIndex + 1)
            } else {
              // If we're at index 0, just clear the history
              scopeHistory.history = [[]]
              scopeHistory.currentIndex = 0
            }
            saveToStorage()
            return
          }
        }
      }
    }

    // Try to merge with last step if possible
    const lastStep = targetGroup.steps[targetGroup.steps.length - 1]
    
    if (lastStep && lastStep.changes.length === 1) {
      const lastChange = lastStep.changes[0]
      if (lastChange && canMergeWithChange(lastChange, changeWithTime)) {
        // Update the existing step with new values
        const from = lastChange.details?.from
        const to = changeWithTime.details?.to
        const originalValue = lastChange.details?.originalValue  // Keep the true original value
        
        if (from !== undefined && to !== undefined) {
          // Update description
          let newDescription = change.description
          if (change.type === 'building' || change.type === 'technology' || change.type === 'stock') {
            newDescription = change.description.replace(/\d+ → \d+/, `${from} → ${to}`)
          }
          
          lastStep.changes = [{
            ...changeWithTime,
            description: newDescription,
            details: {
              ...changeWithTime.details,
              from: from,  // Keep original from value
              originalValue: originalValue,  // Keep original value for cancel-out detection
            },
          }]
          lastStep.description = newDescription
          
          // Add the modified copy as new history state
          scopeHistory.history.push(currentGroups)
          scopeHistory.currentIndex++
          saveToStorage()
          return
        }
      }
    }

    // Create new step if not merged
    const newStep: TodoStep = {
      id: crypto?.randomUUID?.() ?? `step_${Date.now()}`,
      changes: [changeWithTime],
      description: change.description,
      createdAt: now,
    }
    targetGroup.steps.push(newStep)

    // Add the modified copy as new history state
    scopeHistory.history.push(currentGroups)
    scopeHistory.currentIndex++
    saveToStorage()
  }

  // Undo for a specific scope
  function undoForScope(scope: ScopeType, planetId?: number): void {
    const scopeKey = getScopeKey(scope, planetId)
    const scopeHistory = scopeHistories.value.get(scopeKey)
    
    if (!scopeHistory || scopeHistory.currentIndex <= 0) return

    // Get the current and target states
    const fromGroups = scopeHistory.history[scopeHistory.currentIndex] || []
    const toGroups = scopeHistory.history[scopeHistory.currentIndex - 1] || []

    console.log('[TodoListService] Undo - fromGroups:', fromGroups.length, 'toGroups:', toGroups.length)
    console.log('[TodoListService] playerBasesInstance available:', !!playerBasesInstance)

    isReverting = true
    try {
      // Apply state reversions if playerBases is available
      if (playerBasesInstance) {
        applyStateReversions(fromGroups, toGroups, playerBasesInstance)
      } else {
        console.warn('[TodoListService] Cannot revert state: playerBases not registered')
      }

      scopeHistory.currentIndex--
    } finally {
      isReverting = false
      saveToStorage()
    }
  }

  // Redo for a specific scope
  function redoForScope(scope: ScopeType, planetId?: number): void {
    const scopeKey = getScopeKey(scope, planetId)
    const scopeHistory = scopeHistories.value.get(scopeKey)
    
    if (!scopeHistory || scopeHistory.currentIndex >= scopeHistory.history.length - 1) return

    // Get the current and target states
    const fromGroups = scopeHistory.history[scopeHistory.currentIndex] || []
    const toGroups = scopeHistory.history[scopeHistory.currentIndex + 1] || []

    console.log('[TodoListService] Redo - fromGroups:', fromGroups.length, 'toGroups:', toGroups.length)
    console.log('[TodoListService] playerBasesInstance available:', !!playerBasesInstance)

    isReverting = true
    try {
      // Apply state reversions if playerBases is available
      if (playerBasesInstance) {
        applyStateReversions(fromGroups, toGroups, playerBasesInstance)
      } else {
        console.warn('[TodoListService] Cannot revert state: playerBases not registered')
      }

      scopeHistory.currentIndex++
    } finally {
      isReverting = false
      saveToStorage()
    }
  }

  // Clear all histories
  function clear(): void {
    scopeHistories.value.clear()
    saveToStorage()
  }

  // Clear history for a specific scope
  function clearForScope(scope: ScopeType, planetId?: number): void {
    const scopeKey = getScopeKey(scope, planetId)
    scopeHistories.value.delete(scopeKey)
    saveToStorage()
  }

  // Toggle panel
  function togglePanel(): void {
    isOpen.value = !isOpen.value
    saveToStorage()
  }

  return {
    // State
    todoGroups,
    displayGroups,
    allSteps,
    totalChanges,
    isOpen,

    // Methods
    addChange,
    undoForScope,
    redoForScope,
    canUndoForScope,
    canRedoForScope,
    getDisplayGroupsForScope,
    clear,
    clearForScope,
    togglePanel,
  }
}

/**
 * Get the singleton instance of the todo list
 */
export function useTodoListService() {
  if (!todoListInstance) {
    todoListInstance = createTodoList()
  }
  return todoListInstance
}

/**
 * Register the playerBases service for state reversion
 * This should be called from the main app setup
 */
export function registerPlayerBases(playerBases: PlayerBasesService) {
  playerBasesInstance = playerBases
}

/**
 * Export the composable for use in components
 */
export function useTodoList() {
  return useTodoListService()
}
