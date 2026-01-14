/**
 * TodoList Service - Singleton pattern
 * Ensures only one instance of the todo list exists across the entire app
 */

import { ref, computed } from 'vue'
import type { PlayerBasesService } from './stateReversion'
import { applyStateReversions } from './stateReversion'

export type ChangeType = 'technology' | 'building' | 'recipe' | 'stock' | 'base' | 'starting-bonus'
export type ScopeType = 'global' | 'base'

export interface Change {
  id: string  // Unique ID for this change, used for state reversion
  type: ChangeType
  timestamp: number
  description: string
  baseName?: string
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
  baseName?: string
  steps: TodoStep[]
}

let todoListInstance: ReturnType<typeof createTodoList> | null = null
let playerBasesInstance: PlayerBasesService | null = null

const TODO_STORAGE_KEY = 'gt:v2:todoList:v1'

function createTodoList() {
  // Load from localStorage
  function loadFromStorage(): { history: TodoGroup[][]; currentIndex: number; isOpen: boolean } {
    try {
      const stored = localStorage.getItem(TODO_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          history: parsed.history || [],
          currentIndex: parsed.currentIndex ?? -1,
          isOpen: parsed.isOpen ?? true,
        }
      }
    } catch (e) {
      console.error('[TodoListService] Failed to load from storage:', e)
    }
    return { history: [], currentIndex: -1, isOpen: true }
  }

  // Save to localStorage
  function saveToStorage() {
    try {
      const data = {
        history: todoHistory.value,
        currentIndex: currentTodoIndex.value,
        isOpen: isOpen.value,
      }
      localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('[TodoListService] Failed to save to storage:', e)
    }
  }

  // Initialize from storage
  const stored = loadFromStorage()
  
  // Local state for todo list
  const todoHistory = ref<TodoGroup[][]>(stored.history)
  const currentTodoIndex = ref<number>(stored.currentIndex)
  const isOpen = ref(stored.isOpen)
  
  // Flag to prevent tracking during undo/redo
  let isReverting = false

  // Current visible groups
  const todoGroups = computed(() => {
    if (currentTodoIndex.value < 0) return []
    return todoHistory.value[currentTodoIndex.value] || []
  })

  // Flatten all steps from all groups for statistics
  const allSteps = computed(() => {
    return todoGroups.value.flatMap(group => group.steps)
  })

  // Get total change count
  const totalChanges = computed(() => {
    return allSteps.value.reduce((sum, step) => sum + step.changes.length, 0)
  })

  // Can undo?
  const canUndo = computed(() => currentTodoIndex.value > 0)

  // Can redo?
  const canRedo = computed(() => currentTodoIndex.value < todoHistory.value.length - 1)

  // Check if two changes cancel each other out (add then remove)
  function doCancelsOut(change1: Change, change2: Change): boolean {
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

    // Building added then removed (must be same slot)
    if (change1.type === 'building' && change2.type === 'building') {
      const action1 = change1.details?.action as string
      const action2 = change2.details?.action as string
      const slotId1 = change1.details?.slotId as string
      const slotId2 = change2.details?.slotId as string
      
      // Check if one is add and one is remove, with same slot
      return (action1 === 'add' && action2 === 'remove' || action1 === 'remove' && action2 === 'add')
             && slotId1 === slotId2
    }

    return false
  }

  // Check if two changes are similar enough to merge
  // Merge if they affect the same object (same building SLOT, same technology, etc)
  function canMergeWithChange(lastChange: Change, newChange: Change): boolean {
    // Must be same type and same scope
    if (lastChange.baseName !== newChange.baseName) return false

    // Building changes - only merge if both are LEVEL changes (not add/remove)
    if (lastChange.type === 'building' && newChange.type === 'building') {
      // Don't merge add/remove with level changes
      const lastIsAction = !!lastChange.details?.action
      const newIsAction = !!newChange.details?.action
      
      // Only merge if both are level changes (no action field) and same slot
      if (lastIsAction || newIsAction) return false
      
      return lastChange.details?.slotId === newChange.details?.slotId
    }

    // Technology level changes - merge if same technology
    if (lastChange.type === 'technology' && newChange.type === 'technology') {
      return lastChange.details?.technologyId === newChange.details?.technologyId
    }

    // Stock changes - merge if same material
    if (lastChange.type === 'stock' && newChange.type === 'stock') {
      return lastChange.details?.material === newChange.details?.material
    }

    // Recipe count changes - merge if same recipe
    if (lastChange.type === 'recipe' && newChange.type === 'recipe') {
      // Only merge if both are count changes (not add/remove)
      return (
        !lastChange.details?.action &&
        !newChange.details?.action &&
        lastChange.details?.recipeName === newChange.details?.recipeName
      )
    }

    return false
  }

  // Merge similar changes into existing step
  function shouldMergeWithLastStep(lastStep: TodoStep | undefined, newChange: Change): boolean {
    if (!lastStep || lastStep.changes.length === 0) return false

    const lastChange = lastStep.changes[lastStep.changes.length - 1]
    if (!lastChange) return false

    return canMergeWithChange(lastChange, newChange)
  }

  // Add a change to the todo list (organized by scope)
  function addChange(change: Change): void {
        // Don't track changes during undo/redo
        if (isReverting) {
          console.log('[TodoListService] Skipping change tracking during revert:', change.description)
          return
        }
    
    // Initialize if empty
    if (todoHistory.value.length === 0) {
      todoHistory.value.push([])
      currentTodoIndex.value = 0
    }

    // Remove redo stack when new change is made
    if (currentTodoIndex.value < todoHistory.value.length - 1) {
      todoHistory.value = todoHistory.value.slice(0, currentTodoIndex.value + 1)
    }

    // Determine scope based on change type
    const scope: ScopeType = change.type === 'technology' || change.type === 'starting-bonus' || change.type === 'base' ? 'global' : 'base'
    const baseName = change.baseName

    // Work on a COPY to avoid modifying history in-place
    const currentState = todoHistory.value[currentTodoIndex.value]
    if (!currentState) {
      console.error('[TodoListService] Invalid state: currentTodoIndex', currentTodoIndex.value, 'history length', todoHistory.value.length)
      return
    }
    const currentGroups = JSON.parse(JSON.stringify(currentState)) as TodoGroup[]

    // Find or create target group in the copy
    let targetGroup = currentGroups.find(g => g.scope === scope && g.baseName === baseName)
    if (!targetGroup) {
      targetGroup = {
        scope,
        baseName,
        steps: [],
      }
      currentGroups.push(targetGroup)
    }

    const lastStep = targetGroup.steps[targetGroup.steps.length - 1]
    const now = Date.now()
    const changeWithTime: Change = { ...change, timestamp: now }

    // Check if this change cancels out the last step
    if (lastStep && lastStep.changes.length === 1) {
      const lastChange = lastStep.changes[0]
      if (lastChange && doCancelsOut(lastChange, changeWithTime)) {
        // Remove the last step (it cancels out)
        targetGroup.steps.pop()
        // Add the modified copy as new history state
        todoHistory.value.push(currentGroups)
        currentTodoIndex.value++
        saveToStorage()
        return
      }
    }

    // Try to merge with last step
    if (shouldMergeWithLastStep(lastStep, changeWithTime)) {
      if (!lastStep) return
      const newChanges = [...lastStep.changes]
      const lastChangeInStep = newChanges[newChanges.length - 1]

      if (lastChangeInStep) {
        // For any numeric change, update the "to" value while keeping the "from" value
        const from = lastChangeInStep.details?.from ?? lastChangeInStep.details?.from
        const to = changeWithTime.details?.to

        if (from !== undefined && to !== undefined) {
          // Check if changes cancel out (from == to)
          if (from === to) {
            console.log('[TodoListService] Changes cancel out (from == to), removing step')
            // Remove the last step (they cancel out)
            targetGroup.steps.pop()
            // Add the modified copy as new history state
            todoHistory.value.push(currentGroups)
            currentTodoIndex.value++
            saveToStorage()
            return
          }

          // Generate new description showing from → to
          let newDescription = lastChangeInStep.description
          
          // Pattern: "something: Value X → Y" or "something: Level X → Y"
          if (changeWithTime.type === 'building' || changeWithTime.type === 'technology' || changeWithTime.type === 'stock') {
            newDescription = lastChangeInStep.description.replace(
              /(\d+) → \d+/,
              `${from} → ${to}`
            )
          }

          newChanges[newChanges.length - 1] = {
            ...lastChangeInStep,
            description: newDescription,
            details: {
              ...lastChangeInStep.details,
              to: to,
            },
          }
        }
      }

      lastStep.changes = newChanges
      lastStep.description = generateStepDescription(newChanges)
    } else {
      const newStep: TodoStep = {
        id: `step-${now}-${Math.random()}`,
        changes: [changeWithTime],
        description: generateStepDescription([changeWithTime]),
        createdAt: now,
      }
      targetGroup.steps.push(newStep)
    }

    // Add the modified copy as new history state
    todoHistory.value.push(currentGroups)
    currentTodoIndex.value++

    saveToStorage()
  }

  // Generate description for a step
  function generateStepDescription(changes: Change[]): string {
    if (changes.length === 0) return 'Changes'
    if (changes.length === 1) {
      const change = changes[0]
      return change?.description || 'Change'
    }

    const grouped: Record<ChangeType, number> = {
      technology: 0,
      building: 0,
      recipe: 0,
      stock: 0,
      base: 0,
      'starting-bonus': 0,
    }

    changes.forEach(c => {
      grouped[c.type]++
    })

    const parts: string[] = []
    if (grouped.technology > 0) parts.push(`${grouped.technology} tech`)
    if (grouped.building > 0) parts.push(`${grouped.building} building(s)`)
    if (grouped.recipe > 0) parts.push(`${grouped.recipe} recipe(s)`)
    if (grouped.stock > 0) parts.push(`${grouped.stock} stock`)

    return parts.join(', ') || 'Changes'
  }

  // Undo
  function undo(): void {
    if (!canUndo.value) return

    console.log('[TodoListService] Undo called - currentIndex:', currentTodoIndex.value)

    // Get the current and target states
    const fromGroups = todoHistory.value[currentTodoIndex.value] || []
    const toGroups = todoHistory.value[currentTodoIndex.value - 1] || []

    console.log('[TodoListService] Undo - currentIndex:', currentTodoIndex.value, 'history.length:', todoHistory.value.length)
    console.log('[TodoListService] fromGroups:', fromGroups.length, 'groups')
    console.log('[TodoListService] toGroups:', toGroups.length, 'groups')
    console.log('[TodoListService] playerBasesInstance available:', !!playerBasesInstance)

    isReverting = true
    try {
      // Apply state reversions if playerBases is available
      if (playerBasesInstance) {
        applyStateReversions(fromGroups, toGroups, playerBasesInstance)
      } else {
        console.warn('[TodoListService] Cannot revert state: playerBases not registered')
      }

      currentTodoIndex.value--

      console.log('[TodoListService] After undo - new currentIndex:', currentTodoIndex.value)
      console.log('[TodoListService] New todoGroups:', todoGroups.value.length, 'groups')
      console.log('[TodoListService] New todoGroups steps:', todoGroups.value.flatMap(g => g.steps).length, 'steps')
    } finally {
      isReverting = false
      saveToStorage()
    }
  }

  // Redo
  function redo(): void {
    if (!canRedo.value) return

    // Get the current and target states
    const fromGroups = todoHistory.value[currentTodoIndex.value] || []
    const toGroups = todoHistory.value[currentTodoIndex.value + 1] || []

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

      currentTodoIndex.value++
    } finally {
      isReverting = false
      saveToStorage()
    }
  }

  // Clear all
  function clear(): void {
    todoHistory.value = [[]]
    currentTodoIndex.value = 0
    saveToStorage()
  }
  // Toggle panel
  function togglePanel(): void {
    isOpen.value = !isOpen.value
  }

  return {
    // State
    todoGroups,
    allSteps,
    totalChanges,
    canUndo,
    canRedo,
    isOpen,

    // Methods
    addChange,
    undo,
    redo,
    clear,
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
