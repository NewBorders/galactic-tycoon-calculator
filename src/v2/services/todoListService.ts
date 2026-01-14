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
    return false
  }

  // Merge similar changes into existing step
  function shouldMergeWithLastStep(lastStep: TodoStep | undefined, newChange: Change): boolean {
    if (!lastStep || lastStep.changes.length === 0) return false

    const timeDiff = newChange.timestamp - lastStep.createdAt
    // Allow up to 10 seconds for same building changes
    if (timeDiff > 10000) return false

    const lastChange = lastStep.changes[lastStep.changes.length - 1]
    if (!lastChange) return false
    if (lastChange.baseName !== newChange.baseName) return false

    if (newChange.type === 'building' && lastChange.type === 'building') {
      return lastChange.details?.buildingId === newChange.details?.buildingId
    }

    if (newChange.type === 'technology' && lastChange.type === 'technology') {
      return lastChange.details?.technologyId === newChange.details?.technologyId
    }

    return false
  }

  // Add a change to the todo list (organized by scope)
  function addChange(change: Change): void {
    console.log('[TodoListService] addChange called:', change)
    // Initialize if empty
    if (todoHistory.value.length === 0) {
      todoHistory.value.push([])
      currentTodoIndex.value = 0
      console.log('[TodoListService] Initialized empty history')
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
        console.log('[TodoListService] Changes cancel out, removing step:', lastChange.description, changeWithTime.description)
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

      if (lastChangeInStep && (changeWithTime.type === 'building' || changeWithTime.type === 'technology')) {
        // Update the "to" value while keeping the "from" value
        newChanges[newChanges.length - 1] = {
          ...lastChangeInStep,
          description: lastChangeInStep.description.replace(
            /: Level (\d+) → \d+/,
            `: Level ${lastChangeInStep.details?.from} → ${changeWithTime.details?.to}`
          ),
          details: {
            ...lastChangeInStep.details,
            to: changeWithTime.details?.to,
          },
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

    console.log('[TodoListService] After add:', {
      historyLength: todoHistory.value.length,
      currentIndex: currentTodoIndex.value,
      currentGroups: JSON.stringify(currentGroups, null, 2),
      allSteps: allSteps.value.length
    })

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
