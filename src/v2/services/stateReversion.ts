/**
 * State Reversion Service
 * Handles reverting game state when undoing/redoing changes
 */

import type { Change, TodoGroup } from './todoListService'
import { usePlayerTechnology, type TechnologySpecialisation } from './playerTechnology'
import type { GameData } from './gamedata/service'

// Helper type for playerBases service
export interface PlayerBasesService {
  state: { value: { bases: Array<{ id: string; name?: string; buildings: Array<{ id: string }> }> } }
  addBuilding: (baseId: string, buildingId: number, level?: number) => void
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

  // Determine direction: are we undoing (backward) or redoing (forward)?
  const direction = toChanges.length < fromChanges.length ? 'backward' : 'forward'

  // Changes that need to be reverted/applied
  const changes = direction === 'backward' 
    ? fromChanges.slice(toChanges.length)  // Changes to revert
    : toChanges.slice(fromChanges.length)  // Changes to apply

  console.log('[StateReversion] Direction:', direction, 'Changes to apply/revert:', changes.length)

  return { changes, direction }
}

/**
 * Revert a single change to the game state
 */
export function revertChange(change: Change, direction: 'forward' | 'backward', playerBases: PlayerBasesService): void {
  const isRevert = direction === 'backward'

  // Technology changes
  if (change.type === 'technology') {
    const techId = change.details?.technologyId as TechnologySpecialisation | undefined
    if (!techId) return

    const { setLevel } = usePlayerTechnology()
    const targetValue = isRevert 
      ? (change.details?.from as number) 
      : (change.details?.to as number)

    if (targetValue !== undefined) {
      setLevel(techId, targetValue)
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
