/**
 * Change Storage - Stores references to planned changes
 * Enables reliable state reversion by tracking exactly what needs to be undone
 */

export interface StoredChange {
  changeId: string
  type: 'buildingLevel' | 'recipeCount' | 'technologyLevel' | 'startingBonus' | 'stock'
  targetId?: string  // baseId for building/recipe/stock, techId for technology
  targetField?: string  // 'level' for building, 'count' for recipe, etc.
  originalValue: number
  newValue: number
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
