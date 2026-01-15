/**
 * Change Storage - Stores references to planned changes
 * Enables reliable state reversion by tracking exactly what needs to be undone
 */

export interface StoredChange {
  changeId: string
  type: 'buildingLevel' | 'recipeCount' | 'technologyLevel' | 'startingBonus' | 'stock' | 'buildingAdd' | 'buildingRemove' | 'recipeAdd' | 'recipeRemove'
  targetId?: string  // instanceId for building/recipe add/remove, techId for technology, materialId for stock
  targetField?: string  // 'level' for building, 'count' for recipe, 'amount' for stock, etc.
  originalValue?: number  // Optional for add/remove operations
  newValue?: number  // Optional for add/remove operations
  buildingId?: number  // For building add/remove
  recipeId?: number  // For recipe add/remove
  planetId?: number  // Primary identifier for per-base changes (stable across all base types) - optional for global changes
}

// Map: changeId -> StoredChange
const changeMap = new Map<string, StoredChange>()

export function registerChange(changeId: string, change: StoredChange): void {
  console.log('[ChangeStorage] Registering change:', changeId, change)
  changeMap.set(changeId, change)
}

export function getChange(changeId: string): StoredChange | undefined {
  return changeMap.get(changeId)
}

export function unregisterChange(changeId: string): void {
  changeMap.delete(changeId)
}

export function clearStorage(): void {
  changeMap.clear()
}

export function getAllChanges(): StoredChange[] {
  return Array.from(changeMap.values())
}
