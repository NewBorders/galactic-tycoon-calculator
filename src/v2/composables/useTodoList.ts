import { ref, computed } from 'vue'
import { useWorldData } from '@/v2/services/worldData'

export type ChangeType = 'technology' | 'building' | 'recipe' | 'stock' | 'base' | 'starting-bonus'
export type ScopeType = 'global' | 'base' // global = affects all bases, base = specific base

export interface Change {
  type: ChangeType
  timestamp: number
  description: string
  baseName?: string // for base-specific changes
  details?: Record<string, string | number | undefined>
}

export interface TodoStep {
  id: string
  changes: Change[]
  description: string
  createdAt: number
}

/**
 * TodoGroup represents a group of steps scoped to either global or a specific base
 */
export interface TodoGroup {
  scope: ScopeType
  baseName?: string // undefined if global
  steps: TodoStep[]
}

/**
 * Todo List Composable with Undo/Redo support
 * Tracks planned production changes organized by scope (global or per-base)
 */
export function useTodoList() {
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

  // Merge similar changes into existing step
  function shouldMergeWithLastStep(lastStep: TodoStep | undefined, newChange: Change): boolean {
    if (!lastStep || lastStep.changes.length === 0) return false

    const timeDiff = newChange.timestamp - lastStep.createdAt
    if (timeDiff > 2000) return false

    const lastChange = lastStep.changes[lastStep.changes.length - 1]
    if (!lastChange) return false
    if (lastChange.type !== newChange.type) return false
    if (lastChange.baseName !== newChange.baseName) return false

    if (newChange.type === 'building') {
      return lastChange.details?.buildingId === newChange.details?.buildingId
    }

    if (newChange.type === 'technology') {
      return lastChange.details?.technologyId === newChange.details?.technologyId
    }

    return false
  }

  // Add a change to the todo list (organized by scope)
  function addChange(change: Change): void {
    console.log('[TodoList] addChange called:', change)
    // Initialize if empty
    if (todoHistory.value.length === 0) {
      todoHistory.value.push([])
      currentTodoIndex.value = 0
      console.log('[TodoList] Initialized empty history')
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

    if (shouldMergeWithLastStep(lastStep, changeWithTime)) {
      if (!lastStep) return
      const newChanges = [...lastStep.changes]
      const lastChangeInStep = newChanges[newChanges.length - 1]

      if (lastChangeInStep && (changeWithTime.type === 'building' || changeWithTime.type === 'technology')) {
        newChanges[newChanges.length - 1] = {
          ...lastChangeInStep,
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
    
    console.log('[TodoList] After add:', {
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

  // Clear
  function clear(): void {
    todoHistory.value = [[]]
    currentTodoIndex.value = 0
    save()
  }

  // Toggle panel
  function togglePanel(): void {
    isOpen.value = !isOpen.value
  }

  return {
    todoGroups,
    allSteps,
    totalChanges,
    isOpen,
    canUndo,
    canRedo,
    addChange,
    undo,
    redo,
    clear,
    togglePanel,
  }
}
