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
              if (currentChange.type === 'building' || currentChange.type === 'technology' || currentChange.type === 'stock' || currentChange.type === 'recipe') {
                newDescription = lastChange.description.replace(
                  /(\d+) → (\d+)/,
                  `${from} → ${to}`
                )
              }
              
              // Merge material costs if present
              const mergedCost = mergeMaterialsCosts(
                lastChange.details?.materialsCost as string | undefined,
                currentChange.details?.materialsCost as string | undefined
              )
              
              lastMerged.changes = [{
                ...lastChange,
                description: newDescription,
                details: {
                  ...lastChange.details,
                  to: to,
                  materialsCost: mergedCost,
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

  // Helper to merge material costs from two changes
  function mergeMaterialsCosts(cost1?: string, cost2?: string): string | undefined {
    const materialMap = new Map<string, number>()
    const sources = [cost1, cost2]
    for (const src of sources) {
      if (!src || typeof src !== 'string' || src.length === 0) continue
      src.split(',').forEach(part => {
        const match = part.trim().match(/^(\d+)×\s*(.+)$/)
        if (!match) return
        const amount = parseInt(match[1]!, 10)
        const material = match[2]!.trim()
        materialMap.set(material, (materialMap.get(material) || 0) + amount)
      })
    }
    const parts: string[] = []
    materialMap.forEach((amount, material) => {
      parts.push(`${amount}× ${material}`)
    })
    return parts.length > 0 ? parts.join(', ') : undefined
  }

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

      // Check if same building instance
      const lastInst = lastChange.details?.buildingInstanceId as string | undefined
      const newInst = newChange.details?.buildingInstanceId as string | undefined
      return !!lastInst && lastInst === newInst
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
    // For recipe count changes, compare recipeInstanceId instead of targetId
    if (change1.type === 'recipe' && change2.type === 'recipe') {
      const action1 = change1.details?.action as string
      const action2 = change2.details?.action as string
      
      // Recipe added then removed
      if (action1 && action2) {
        // Check if both affect the same target
        if (change1.details?.targetId !== change2.details?.targetId) {
          return false
        }
        return (action1 === 'add' && action2 === 'remove' || action1 === 'remove' && action2 === 'add')
      }
      
      // Recipe count changes - compare by recipeInstanceId
      const instanceId1 = change1.details?.recipeInstanceId as string | undefined
      const instanceId2 = change2.details?.recipeInstanceId as string | undefined
      
      if (!instanceId1 || !instanceId2 || instanceId1 !== instanceId2) {
        console.log('[doCancelsOut] Different recipe instances:', instanceId1, instanceId2)
        return false
      }
      
      // Check if count returns to original value
      const from1 = change1.details?.from as number | undefined
      const to2 = change2.details?.to as number | undefined
      
      if (from1 !== undefined && to2 !== undefined && from1 === to2) {
        console.log('[doCancelsOut] Recipe count reverted:', { from: from1, to: to2 })
        return true
      }
      
      return false
    }
    
    // Check if both changes affect the same target (for non-recipe changes)
    if (change1.details?.targetId !== change2.details?.targetId) {
      console.log('[doCancelsOut] Different targetIds:', change1.details?.targetId, change2.details?.targetId)
      return false
    }

    // Building add/remove (cancel out)
    if (change1.type === 'building' && change2.type === 'building') {
      // Ensure both affect the same building instance
      const inst1 = change1.details?.buildingInstanceId as string | undefined
      const inst2 = change2.details?.buildingInstanceId as string | undefined
      if (!inst1 || !inst2 || inst1 !== inst2) {
        console.log('[doCancelsOut] Different building instances:', inst1, inst2)
        return false
      }

      const action1 = change1.details?.action as string
      const action2 = change2.details?.action as string
      
      // Building added then removed (cancel out)
      if (action1 && action2) {
        return (action1 === 'add' && action2 === 'remove' || action1 === 'remove' && action2 === 'add')
      }
      
      // Building level changes (e.g., level 12→11→12)
      // If fromValue === toValue at the end, they cancel out
      const from1 = change1.details?.from as number | undefined
      const to2 = change2.details?.to as number | undefined
      
      if (from1 !== undefined && to2 !== undefined && from1 === to2) {
        console.log('[doCancelsOut] Building level reverted:', { from: from1, to: to2 })
        return true
      }
    }

    // Technology level changes (e.g., level 2→3→2)
    if (change1.type === 'technology' && change2.type === 'technology') {
      const from1 = change1.details?.from as number | undefined
      const to2 = change2.details?.to as number | undefined
      
      if (from1 !== undefined && to2 !== undefined && from1 === to2) {
        console.log('[doCancelsOut] Technology level reverted:', { from: from1, to: to2 })
        return true
      }
    }

    // Stock count changes that return to original value
    if (change1.type === 'stock' && change2.type === 'stock') {
      const from1 = change1.details?.from as number | undefined
      const to2 = change2.details?.to as number | undefined
      
      if (from1 !== undefined && to2 !== undefined && from1 === to2) {
        console.log('[doCancelsOut] Stock reverted:', { from: from1, to: to2 })
        return true
      }
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
            // Both changes negate each other - go back to the state BEFORE all merged changes
            // Find the first state that doesn't have any changes for this target
            const targetIdentifier = lastChange.details?.buildingInstanceId || 
                                    lastChange.details?.recipeInstanceId || 
                                    lastChange.details?.materialId ||
                                    lastChange.details?.techId
            
            // Go back through history to find the first state without this target
            let targetIndex = scopeHistory.currentIndex - 1
            while (targetIndex >= 0) {
              const state = scopeHistory.history[targetIndex]
              const group = state?.find(g => g.scope === scope && g.planetId === planetId)
              
              if (!group || group.steps.length === 0) {
                // Found a state without any changes for this scope
                break
              }
              
              // Check if this state has changes for the same target
              const hasTargetChanges = group.steps.some(s => s.changes.some(c => {
                const cTarget = c.details?.buildingInstanceId || 
                               c.details?.recipeInstanceId || 
                               c.details?.materialId ||
                               c.details?.techId
                return cTarget === targetIdentifier
              }))
              
              if (!hasTargetChanges) {
                // Found a state without this specific target
                break
              }
              
              targetIndex--
            }
            
            // Unregister all changes that will be removed
            for (let i = targetIndex + 1; i <= scopeHistory.currentIndex; i++) {
              const state = scopeHistory.history[i]
              const group = state?.find(g => g.scope === scope && g.planetId === planetId)
              if (group) {
                group.steps.forEach(step => {
                  step.changes.forEach(c => {
                    const cId = c.details?.changeId as string | undefined
                    if (cId) unregisterChange(cId)
                  })
                })
              }
            }
            
            // Unregister the new change as well
            const currentChangeId = changeWithTime.details?.changeId as string | undefined
            if (currentChangeId) {
              unregisterChange(currentChangeId)
            }
            
            // Update history to remove all merged states
            // targetIndex points to the last state WITHOUT this target, so we keep it
            scopeHistory.currentIndex = targetIndex
            scopeHistory.history = scopeHistory.history.slice(0, scopeHistory.currentIndex + 1)
            
            console.log('[TodoListService] Reverted to index:', targetIndex, 'history length:', scopeHistory.history.length)
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
          if (change.type === 'building' || change.type === 'technology' || change.type === 'stock' || change.type === 'recipe') {
            newDescription = change.description.replace(/(\d+) → (\d+)/, `${from} → ${to}`)
          }

          // Merge material costs if present on building/technology changes
          const mergedCost = mergeMaterialsCosts(
            lastChange.details?.materialsCost as string | undefined,
            changeWithTime.details?.materialsCost as string | undefined
          )
          
          lastStep.changes = [{
            ...changeWithTime,
            description: newDescription,
            details: {
              ...changeWithTime.details,
              from: from,  // Keep original from value
              originalValue: originalValue,  // Keep original value for cancel-out detection
              materialsCost: mergedCost,
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
      // Apply state reversions
      // playerBases is only required for base-specific changes (building, recipe, stock)
      // Global changes (technology, starting-bonus) work without it
      applyStateReversions(fromGroups, toGroups, playerBasesInstance || undefined)

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
      // Apply state reversions
      // playerBases is only required for base-specific changes (building, recipe, stock)
      // Global changes (technology, starting-bonus) work without it
      applyStateReversions(fromGroups, toGroups, playerBasesInstance || undefined)

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
 * Access the registered playerBases instance (read-only usage in UI)
 */
export function getRegisteredPlayerBases(): PlayerBasesService | null {
  return playerBasesInstance
}

/**
 * Get base name (if set) or planet name for a given planetId
 * Returns: baseName > planetName > "Planet <planetId>"
 */
export function getBaseOrPlanetNameByPlanetId(planetId: number): string {
  const playerBases = getRegisteredPlayerBases()
  if (!playerBases) return `Planet ${planetId}`

  const base = playerBases.state.value.bases.find((b) => b.planetId === planetId)
  if (!base) return `Planet ${planetId}`

  // Prefer baseName if set
  if (base.name) return base.name

  // Fallback to planet name from the planets list
  const planet = playerBases.planets.value.find((p) => p.id === planetId)
  return planet?.name ?? `Planet ${planetId}`
}

/**
 * Export the composable for use in components
 */
export function useTodoList() {
  return useTodoListService()
}
