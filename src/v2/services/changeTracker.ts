/**
 * Change Tracker Service
 * Tracks changes to planned production and integrates with TodoList
 * 
 * Automatically determines scope:
 * - Global: Technology, Starting Bonus, New Bases (affects all bases)
 * - Per-Base: Buildings, Recipes, Stock (specific to a base)
 */

import { useTodoList, type Change } from './todoListService'
import { registerChange } from './changeStorage'

function generateChangeId(): string {
  return crypto.randomUUID?.() ?? `change_${Date.now()}_${Math.random()}`
}

/**
 * Tracker helper functions for common change types
 */
export function createChangeTracker() {
  const { addChange } = useTodoList()

  return {
    /**
     * Track technology level change (GLOBAL)
     */
    trackTechnologyChange(techId: number, techName: string, fromLevel: number, toLevel: number): void {
      const changeId = generateChangeId()
      
      // Register the change for state reversion
      registerChange(changeId, {
        changeId,
        type: 'technologyLevel',
        targetId: techId.toString(),
        targetField: 'level',
        originalValue: fromLevel,
        newValue: toLevel,
      })
      
      addChange({
        id: changeId,
        type: 'technology',
        description: `🔬 ${techName}: Level ${fromLevel} → ${toLevel}`,
        details: {
          changeId,
          technologyId: techId.toString(),
          from: fromLevel,
          to: toLevel,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track starting bonus change (GLOBAL)
     */
    trackStartingBonusChange(fromBonus: number, toBonus: number): void {
      const changeId = generateChangeId()
      
      // Register the change for state reversion
      registerChange(changeId, {
        changeId,
        type: 'startingBonus',
        targetField: 'bonus',
        originalValue: fromBonus,
        newValue: toBonus,
      })
      
      addChange({
        id: changeId,
        type: 'starting-bonus',
        description: `⭐ Starting Bonus: ${fromBonus.toFixed(2)}× → ${toBonus.toFixed(2)}×`,
        details: {
          changeId,
          from: fromBonus.toFixed(2),
          to: toBonus.toFixed(2),
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track new base creation (GLOBAL)
     * @param baseName The name of the new base being planned
     */
    trackNewBase(baseName: string): void {
      const changeId = generateChangeId()
      addChange({
        id: changeId,
        type: 'base',
        description: `➕ New Base: ${baseName}`,
        details: {
          changeId,
          action: 'add',
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track base removal (GLOBAL)
     */
    trackRemoveBase(baseName: string): void {
      const changeId = generateChangeId()
      addChange({
        id: changeId,
        type: 'base',
        description: `❌ Remove Base: ${baseName}`,
        details: {
          changeId,
          action: 'remove',
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track building level change (PER-BASE)
     * @param baseId Unique base identifier (from playerBases)
     * @param baseName Display name for the base
     * @param buildingInstanceId The instance ID of the building (from playerBases)
     */
    trackBuildingChange(
      baseId: string,
      baseName: string,
      buildingInstanceId: string,
      slotNum: string,
      buildingId: number,
      buildingName: string,
      fromLevel: number,
      toLevel: number
    ): void {
      const changeId = generateChangeId()
      
      // Register the change for state reversion
      registerChange(changeId, {
        changeId,
        type: 'buildingLevel',
        targetId: buildingInstanceId,
        targetField: 'level',
        originalValue: fromLevel,
        newValue: toLevel,
      })
      
      addChange({
        id: changeId,
        type: 'building',
        baseName: baseName,
        description: `🏢 ${buildingName} #${slotNum}: Level ${fromLevel} → ${toLevel}`,
        details: {
          changeId,
          baseId: baseId,
          buildingInstanceId,
          slotId: slotNum,
          buildingId: buildingId.toString(),
          from: fromLevel,
          to: toLevel,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track building add (PER-BASE)
     */
    trackAddBuilding(baseId: string, baseName: string, slotNum: string, buildingName: string, buildingId?: number, instanceId?: string): void {
      const changeId = generateChangeId()
      
      // Register the change for state reversion
      if (buildingId !== undefined) {
        registerChange(changeId, {
          changeId,
          type: 'buildingAdd',
          targetId: instanceId,  // Will be set after building is added
          baseId: baseId,
          buildingId: buildingId,
        })
      }
      
      addChange({
        id: changeId,
        type: 'building',
        baseName,
        description: `🏢 Building added: ${buildingName} #${slotNum}`,
        details: {
          changeId,
          baseId: baseId,
          action: 'add',
          slotId: slotNum,
          buildingName,
          buildingId: buildingId?.toString(),
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track building remove (PER-BASE)
     */
    trackRemoveBuilding(baseId: string, baseName: string, slotNum: string, buildingName: string, buildingId?: number, instanceId?: string): void {
      const changeId = generateChangeId()
      
      // Register the change for state reversion
      if (buildingId !== undefined && instanceId !== undefined) {
        registerChange(changeId, {
          changeId,
          type: 'buildingRemove',
          targetId: instanceId,
          baseId: baseId,
          buildingId: buildingId,
        })
      }
      
      addChange({
        id: changeId,
        type: 'building',
        baseName,
        description: `🏢 Building removed: ${buildingName} #${slotNum}`,
        details: {
          changeId,
          baseId: baseId,
          action: 'remove',
          slotId: slotNum,
          buildingName,
          buildingId: buildingId?.toString(),
          instanceId,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track recipe add (PER-BASE)
     */
    trackAddRecipe(baseId: string, baseName: string, recipeId: number, recipeName: string, instanceId?: string): void {
      const changeId = generateChangeId()
      
      // Register the change for state reversion
      registerChange(changeId, {
        changeId,
        type: 'recipeAdd',
        targetId: instanceId,  // Will be set after recipe is added
        baseId: baseId,
        recipeId: recipeId,
      })
      
      addChange({
        id: changeId,
        type: 'recipe',
        baseName,
        description: `➕ Recipe added: ${recipeName}`,
        details: {
          changeId,
          baseId: baseId,
          action: 'add',
          recipeId: recipeId.toString(),
          recipeName,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track recipe remove (PER-BASE)
     */
    trackRemoveRecipe(baseId: string, baseName: string, recipeId: number, recipeName: string, instanceId?: string): void {
      const changeId = generateChangeId()
      
      // Register the change for state reversion
      if (instanceId !== undefined) {
        registerChange(changeId, {
          changeId,
          type: 'recipeRemove',
          targetId: instanceId,
          baseId: baseId,
          recipeId: recipeId,
        })
      }
      
      addChange({
        id: changeId,
        type: 'recipe',
        baseName,
        description: `❌ Recipe removed: ${recipeName}`,
        details: {
          changeId,
          baseId: baseId,
          action: 'remove',
          recipeId: recipeId.toString(),
          recipeName,
          instanceId,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track recipe count change (PER-BASE)
     */
    trackRecipeCountChange(
      baseId: string,
      baseName: string,
      recipeId: number,
      recipeName: string,
      fromCount: number,
      toCount: number
    ): void {
      const changeId = generateChangeId()
      
      // Register the change for state reversion
      registerChange(changeId, {
        changeId,
        type: 'recipeCount',
        targetId: `${baseId}::recipe-${recipeId}`,
        targetField: 'count',
        originalValue: fromCount,
        newValue: toCount,
      })
      
      addChange({
        id: changeId,
        type: 'recipe',
        baseName,
        description: `🔄 ${recipeName}: Count ${fromCount} → ${toCount}`,
        details: {
          changeId,
          baseId: baseId,
          recipeId: recipeId.toString(),
          recipeName,
          from: fromCount,
          to: toCount,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track stock change (PER-BASE)
     */
    trackStockChange(
      baseId: string,
      baseName: string,
      materialId: number,
      materialName: string,
      fromQty: number,
      toQty: number
    ): void {
      const changeId = generateChangeId()
      
      // Register the change for state reversion
      registerChange(changeId, {
        changeId,
        type: 'stock',
        targetId: materialId.toString(),
        targetField: 'amount',
        originalValue: fromQty,
        newValue: toQty,
      })
      
      addChange({
        id: changeId,
        type: 'stock',
        baseName,
        description: `📦 ${materialName}: Stock ${fromQty} → ${toQty}`,
        details: {
          changeId,
          baseId: baseId,
          materialId: materialId.toString(),
          material: materialName,
          from: fromQty,
          to: toQty,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track custom change
     */
    trackCustomChange(change: Change): void {
      addChange(change)
    },
  }
}

/**
 * Create a simple change tracker instance (singleton)
 */
let trackerInstance: ReturnType<typeof createChangeTracker> | null = null

export function getChangeTracker() {
  if (!trackerInstance) {
    trackerInstance = createChangeTracker()
  }
  return trackerInstance
}
