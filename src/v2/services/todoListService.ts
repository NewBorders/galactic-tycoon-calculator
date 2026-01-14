/**
 * TodoList Service - Singleton pattern
 * Ensures only one instance of the todo list exists across the entire app
 */

import { ref, computed } from 'vue'
import { useWorldData } from './worldData'

export type ChangeType = 'technology' | 'building' | 'recipe' | 'stock' | 'base' | 'starting-bonus'
export type ScopeType = 'global' | 'base'

export interface Change {
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

function createTodoList() {
  const { save } = useWorldData()

  // Local state for todo list
  const todoHistory = ref<TodoGroup[][]>([])
  const currentTodoIndex = ref<number>(-1)
  const isOpen = ref(true)

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
    const currentGroups = JSON.parse(JSON.stringify(todoHistory.value[currentTodoIndex.value])) as TodoGroup[]
    if (!currentGroups) return

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
        save()
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
            save()
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

    save()
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
    currentTodoIndex.value--
    save()
  }

  // Redo
  function redo(): void {
    if (!canRedo.value) return
    currentTodoIndex.value++
    save()
  }

  // Clear all
  function clear(): void {
    todoHistory.value = [[]]
    currentTodoIndex.value = 0
    save()
  }

  // Toggle panel
  function togglePanel(): void {
    isOpen.value = !isOpen.value
  }

  // Toggle step detail
  const expandedSteps = ref<Set<string>>(new Set())

  function toggleStepDetail(stepId: string): void {
    if (expandedSteps.value.has(stepId)) {
      expandedSteps.value.delete(stepId)
    } else {
      expandedSteps.value.add(stepId)
    }
  }

  return {
    // State
    todoGroups,
    allSteps,
    totalChanges,
    canUndo,
    canRedo,
    isOpen,
    expandedSteps,

    // Methods
    addChange,
    undo,
    redo,
    clear,
    togglePanel,
    toggleStepDetail,
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
 * Export the composable for use in components
 */
export function useTodoList() {
  return useTodoListService()
}
