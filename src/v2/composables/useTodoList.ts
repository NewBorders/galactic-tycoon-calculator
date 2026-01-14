import { ref, computed } from 'vue'
import { useWorldData } from '@/v2/services/worldData'

export type ChangeType = 'technology' | 'building' | 'recipe' | 'stock' | 'base' | 'starting-bonus'

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

/**
 * Todo List Composable with Undo/Redo support
 * Tracks planned production changes step by step
 */
export function useTodoList() {
  const { save } = useWorldData()

  // Local state for todo list
  const todoHistory = ref<TodoStep[][]>([])
  const currentTodoIndex = ref<number>(-1)
  const isOpen = ref(true)

  // Current visible steps
  const todoSteps = computed(() => {
    if (currentTodoIndex.value < 0) return []
    return todoHistory.value[currentTodoIndex.value] || []
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

  // Add a change to the todo list
  function addChange(change: Change): void {
    // Initialize if empty
    if (todoHistory.value.length === 0) {
      todoHistory.value.push([])
      currentTodoIndex.value = 0
    }

    // Remove redo stack
    if (currentTodoIndex.value < todoHistory.value.length - 1) {
      todoHistory.value = todoHistory.value.slice(0, currentTodoIndex.value + 1)
    }

    const currentSteps = todoHistory.value[currentTodoIndex.value]
    if (!currentSteps) return

    const lastStep = currentSteps[currentSteps.length - 1]
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
      currentSteps.push(newStep)
      
      // Add new history state
      todoHistory.value.push([...currentSteps])
      currentTodoIndex.value++
    }

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
    todoSteps,
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
