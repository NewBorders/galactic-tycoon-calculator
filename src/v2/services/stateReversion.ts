/**
 * State Reversion Service
 * Handles reverting game state when undoing/redoing changes
 */

import type { Change, TodoGroup } from './todoListService'
import { usePlayerTechnology, type TechnologySpecialisation } from './playerTechnology'
import { getChange, type StoredChange } from './changeStorage'

// Helper type for playerBases service
export interface PlayerBasesService {
  state: { value: { bases: Array<{ id: string; name?: string; buildings: Array<{ id: string }> }> } }
  addBuilding: (baseId: string, buildingId: number, level?: number) => string | undefined
  setBuilding: (baseId: string, instanceId: string, patch: { level?: number }) => void
  removeBuilding: (baseId: string, instanceId: string) => void
  addRecipe: (baseId: string, recipeId: number) => string | undefined
  removeRecipe: (baseId: string, recipeInstanceId: string) => void
  setRecipeCount: (baseId: string, recipeInstanceId: string, count: number) => void
  setStock: (baseId: string, stock: Record<number, number>) => void
}

/**
 * Find base by ID
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function findBaseById(playerBases: PlayerBasesService, baseId: string): string | null {
  const base = playerBases.state.value.bases.find(b => b.id === baseId)
  console.log('[StateReversion] findBaseById:', baseId, '→', base?.id || 'NOT FOUND')
  console.log('[StateReversion] Available bases:', playerBases.state.value.bases.map(b => ({ id: b.id, name: b.name || 'Base' })))
  return base?.id || null
}

/**
 * Find recipe instance by recipeId in a base
 */
function findRecipeInstance(playerBases: PlayerBasesService, baseId: string, recipeId: number): string | null {
  const base = playerBases.state.value.bases.find(b => b.id === baseId)
  if (!base) return null
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recipeInstance = (base as any).recipes?.find((r: any) => r.recipeId === recipeId)
  return recipeInstance?.id || null
}

/**
 * Calculate the diff between two TODO states
 * Returns the changes that need to be applied/reverted
 */
export function calculateStateDiff(
  fromGroups: TodoGroup[],
  toGroups: TodoGroup[]
): { changes: Change[], direction: 'forward' | 'backward' } {
  // Flatten all changes from both states
  const fromChanges = fromGroups.flatMap(g => g.steps.flatMap(s => s.changes))
  const toChanges = toGroups.flatMap(g => g.steps.flatMap(s => s.changes))

  console.log('[StateReversion] fromChanges:', fromChanges.length, fromChanges.map(c => c.description))
  console.log('[StateReversion] toChanges:', toChanges.length, toChanges.map(c => c.description))

  // Determine direction primarily by change counts
  let direction: 'forward' | 'backward'
  let changes: Change[] = []

  if (toChanges.length !== fromChanges.length) {
    direction = toChanges.length < fromChanges.length ? 'backward' : 'forward'
    changes = direction === 'backward' 
      ? fromChanges.slice(toChanges.length)  // Changes to revert
      : toChanges.slice(fromChanges.length)  // Changes to apply
  } else {
    // Same number of changes – detect content differences (e.g., merged step with different values)
    // Compare last change first (most recent)
    const lastFrom = fromChanges[fromChanges.length - 1]
    const lastTo = toChanges[toChanges.length - 1]

    // Decide direction by timestamp if available
    if (lastFrom && lastTo) {
      direction = (lastFrom.timestamp || 0) > (lastTo.timestamp || 0) ? 'backward' : 'forward'

      // If target differs (by id or values), include appropriate change
      const sameTarget = lastFrom.details?.targetId === lastTo.details?.targetId
      const sameType = lastFrom.type === lastTo.type
      const sameBase = lastFrom.baseName === lastTo.baseName
      const valueDiff = lastFrom.details?.to !== lastTo.details?.to || lastFrom.details?.from !== lastTo.details?.from

      if (sameTarget && sameType && sameBase && valueDiff) {
        // For backward, revert the 'from' change; for forward, apply the 'to' change
        changes = direction === 'backward' ? [lastFrom] : [lastTo]
      } else {
        // No differences detected; nothing to apply
        changes = []
      }
    } else {
      // Fallback: no changes
      direction = 'backward'
      changes = []
    }
  }

  console.log('[StateReversion] Direction:', direction, 'Changes to apply/revert:', changes.length)

  return { changes, direction }
}

/**
 * Update DOM element value and trigger change event for Vue reactivity
 */
function updateDOMValue(elementId: string, newValue: number): void {
  const inputElement = document.getElementById(elementId) as HTMLInputElement | null
  if (!inputElement) {
    console.warn('[StateReversion] DOM element not found:', elementId)
    return
  }

  console.log('[StateReversion] Updating DOM element:', elementId, 'to value:', newValue)
  
  // Update the value
  inputElement.value = String(newValue)
  
  // Trigger input and change events to notify Vue
  inputElement.dispatchEvent(new Event('input', { bubbles: true }))
  inputElement.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Revert a stored change using precise metadata
 */
function revertStoredChange(storedChange: StoredChange, isUndo: boolean, playerBases: PlayerBasesService): void {
  const baseId = storedChange.baseId || storedChange.targetId?.split('::')[0] // For base-level changes, targetId might be baseId::something
  const targetValue = storedChange.originalValue !== undefined && storedChange.newValue !== undefined 
    ? (isUndo ? storedChange.originalValue : storedChange.newValue)
    : undefined

  console.log('[StateReversion] Reverting stored change:', {
    type: storedChange.type,
    targetId: storedChange.targetId,
    baseId,
    isUndo,
    targetValue
  })

  switch (storedChange.type) {
    case 'buildingLevel':
      if (baseId && storedChange.targetId && targetValue !== undefined) {
        playerBases.setBuilding(baseId, storedChange.targetId, { level: targetValue })
        console.log('[StateReversion] Set building level to:', targetValue)
        
        // Also update DOM
        updateDOMValue(`building-input-${storedChange.targetId}`, targetValue)
      }
      break

    case 'buildingAdd':
      // Undo add = remove, Redo add = add
      if (baseId && storedChange.buildingId !== undefined) {
        if (isUndo && storedChange.targetId) {
          // Remove the building that was added
          playerBases.removeBuilding(baseId, storedChange.targetId)
          console.log('[StateReversion] Removed building:', storedChange.targetId)
        } else {
          // Re-add the building
          const instanceId = playerBases.addBuilding(baseId, storedChange.buildingId)
          console.log('[StateReversion] Added building:', storedChange.buildingId, '→', instanceId)
          
          // Update the stored change with the instance ID for future reversions
          if (instanceId) {
            storedChange.targetId = instanceId
          }
        }
      }
      break

    case 'buildingRemove':
      // Undo remove = add back, Redo remove = remove
      if (baseId && storedChange.buildingId !== undefined) {
        if (isUndo) {
          // Re-add the building that was removed
          const instanceId = playerBases.addBuilding(baseId, storedChange.buildingId)
          console.log('[StateReversion] Re-added removed building:', storedChange.buildingId, '→', instanceId)
        } else if (storedChange.targetId) {
          // Remove the building again
          playerBases.removeBuilding(baseId, storedChange.targetId)
          console.log('[StateReversion] Removed building:', storedChange.targetId)
        }
      }
      break

    case 'recipeCount':
      if (baseId && storedChange.targetId && targetValue !== undefined) {
        playerBases.setRecipeCount(baseId, storedChange.targetId, targetValue)
        console.log('[StateReversion] Set recipe count to:', targetValue)
        
        // Also update DOM
        updateDOMValue(`recipe-input-${storedChange.targetId}`, targetValue)
      }
      break

    case 'recipeAdd':
      // Undo add = remove, Redo add = add
      if (baseId && storedChange.recipeId !== undefined) {
        if (isUndo && storedChange.targetId) {
          // Remove the recipe that was added
          playerBases.removeRecipe(baseId, storedChange.targetId)
          console.log('[StateReversion] Removed recipe:', storedChange.targetId)
        } else {
          // Re-add the recipe
          const instanceId = playerBases.addRecipe(baseId, storedChange.recipeId)
          console.log('[StateReversion] Added recipe:', storedChange.recipeId, '→', instanceId)
          
          // Update the stored change with the instance ID for future reversions
          if (instanceId) {
            storedChange.targetId = instanceId
          }
        }
      }
      break

    case 'recipeRemove':
      // Undo remove = add back, Redo remove = remove
      if (baseId && storedChange.recipeId !== undefined) {
        if (isUndo) {
          // Re-add the recipe that was removed
          const instanceId = playerBases.addRecipe(baseId, storedChange.recipeId)
          console.log('[StateReversion] Re-added removed recipe:', storedChange.recipeId, '→', instanceId)
        } else if (storedChange.targetId) {
          // Remove the recipe again
          playerBases.removeRecipe(baseId, storedChange.targetId)
          console.log('[StateReversion] Removed recipe:', storedChange.targetId)
        }
      }
      break

    case 'technologyLevel':
      if (storedChange.targetId && typeof storedChange.targetId === 'string' && targetValue !== undefined) {
        const { setLevel } = usePlayerTechnology()
        setLevel(storedChange.targetId as unknown as TechnologySpecialisation, targetValue)
        console.log('[StateReversion] Set technology level to:', targetValue)
      }
      break

    case 'startingBonus':
      if (targetValue !== undefined) {
        const { setStartingBonus } = usePlayerTechnology()
        setStartingBonus(targetValue)
        console.log('[StateReversion] Set starting bonus to:', targetValue)
      }
      break

    case 'stock':
      if (baseId && storedChange.targetId && targetValue !== undefined) {
        const base = playerBases.state.value.bases.find(b => b.id === baseId)
        if (base) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const currentStock = (base as any).stock || {}
          const materialId = parseInt(storedChange.targetId)
          playerBases.setStock(baseId, { ...currentStock, [materialId]: targetValue })
          console.log('[StateReversion] Set stock to:', targetValue)
        }
      }
      break
  }
}

/**
 * Revert a single change to the game state
 * First tries to use stored change metadata, falls back to parsing details
 */
export function revertChange(change: Change, direction: 'forward' | 'backward', playerBases: PlayerBasesService): void {
  const isUndo = direction === 'backward'

  // Try to use stored change metadata if available
  const changeId = change.details?.changeId as string | undefined
  if (changeId) {
    const storedChange = getChange(changeId)
    if (storedChange) {
      console.log('[StateReversion] Using stored change for reversion')
      revertStoredChange(storedChange, isUndo, playerBases)
      return
    } else {
      console.warn('[StateReversion] Change ID found but no stored change:', changeId)
    }
  }

  // Fallback to parsing details (for older changes or manual changes)
  console.log('[StateReversion] Falling back to detail parsing for change:', change.type)

  const isRevert = isUndo

  // Technology changes
  if (change.type === 'technology') {
    const techId = change.details?.technologyId as unknown
    if (!techId) return

    const { setLevel } = usePlayerTechnology()
    const targetValue = isRevert 
      ? (change.details?.from as number) 
      : (change.details?.to as number)

    if (targetValue !== undefined && typeof techId === 'string') {
      setLevel(techId as unknown as TechnologySpecialisation, targetValue)
    }
    return
  }

  // Starting bonus changes
  if (change.type === 'starting-bonus') {
    const { setStartingBonus } = usePlayerTechnology()
    const targetValue = isRevert 
      ? (change.details?.from as number) 
      : (change.details?.to as number)

    if (targetValue !== undefined) {
      setStartingBonus(targetValue)
    }
    return
  }

  // Base-specific changes require baseName
  const baseName = change.baseName
  if (!baseName) return

  const baseId = change.details?.baseId as string | undefined
  if (!baseId) {
    console.warn('[StateReversion] Change missing baseId:', change)
    return
  }
  
  console.log('[StateReversion] Processing change for baseId:', baseId)

  // Building changes
  if (change.type === 'building') {
    const action = change.details?.action as string | undefined
    const slotId = change.details?.slotId as string | undefined
    const buildingId = change.details?.buildingId as number | undefined

    // Building add/remove
    if (action && buildingId) {
      if (action === 'add') {
        // Revert add = remove, Apply add = add
        if (isRevert && slotId) {
          playerBases.removeBuilding(baseId, slotId)
        } else if (!isRevert) {
          playerBases.addBuilding(baseId, buildingId)
        }
      } else if (action === 'remove') {
        // Revert remove = add back, Apply remove = remove
        if (isRevert) {
          playerBases.addBuilding(baseId, buildingId)
        } else if (slotId) {
          playerBases.removeBuilding(baseId, slotId)
        }
      }
      return
    }

    // Building level change
    if (slotId && buildingId) {
      const targetLevel = isRevert 
        ? (change.details?.from as number) 
        : (change.details?.to as number)

      console.log('[StateReversion] Building level change - slotId:', slotId, 'targetLevel:', targetLevel)
      
      if (targetLevel !== undefined) {
        playerBases.setBuilding(baseId, slotId, { level: targetLevel })
        console.log('[StateReversion] Building level set to:', targetLevel)
      }
    }
    return
  }

  // Recipe changes
  if (change.type === 'recipe') {
    const action = change.details?.action as string | undefined
    const recipeId = change.details?.recipeId as number | undefined

    // Recipe add/remove
    if (action && recipeId) {
      if (action === 'add') {
        // Revert add = remove, Apply add = add
        if (isRevert) {
          const recipeInstanceId = findRecipeInstance(playerBases, baseId, recipeId)
          if (recipeInstanceId) {
            playerBases.removeRecipe(baseId, recipeInstanceId)
          }
        } else {
          playerBases.addRecipe(baseId, recipeId)
        }
      } else if (action === 'remove') {
        // Revert remove = add back, Apply remove = remove
        if (isRevert) {
          playerBases.addRecipe(baseId, recipeId)
        } else {
          const recipeInstanceId = findRecipeInstance(playerBases, baseId, recipeId)
          if (recipeInstanceId) {
            playerBases.removeRecipe(baseId, recipeInstanceId)
          }
        }
      }
      return
    }

    // Recipe count change
    if (!action && recipeId) {
      const targetCount = isRevert 
        ? (change.details?.from as number) 
        : (change.details?.to as number)

      if (targetCount !== undefined) {
        const recipeInstanceId = findRecipeInstance(playerBases, baseId, recipeId)
        if (recipeInstanceId) {
          playerBases.setRecipeCount(baseId, recipeInstanceId, targetCount)
        }
      }
    }
    return
  }

  // Stock changes
  if (change.type === 'stock') {
    const materialId = change.details?.materialId as number | undefined
    if (!materialId) return

    const targetAmount = isRevert 
      ? (change.details?.from as number) 
      : (change.details?.to as number)

    if (targetAmount !== undefined) {
      const base = playerBases.state.value.bases.find(b => b.id === baseId)
      if (base) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentStock = (base as any).stock || {}
        playerBases.setStock(baseId, { ...currentStock, [materialId]: targetAmount })
      }
    }
    return
  }
}

/**
 * Apply all state reversions for an undo/redo operation
 */
export function applyStateReversions(
  fromGroups: TodoGroup[],
  toGroups: TodoGroup[],
  playerBases: PlayerBasesService
): void {
  const { changes, direction } = calculateStateDiff(fromGroups, toGroups)

  console.log('[StateReversion] Direction:', direction, 'Changes to apply:', changes.length)
  console.log('[StateReversion] Changes:', changes.map(c => ({ type: c.type, desc: c.description })))

  // Apply changes in reverse order for backward direction (undo)
  const orderedChanges = direction === 'backward' ? [...changes].reverse() : changes

  orderedChanges.forEach(change => {
    console.log('[StateReversion] Reverting change:', change.type, change.description)
    revertChange(change, direction, playerBases)
  })
}
