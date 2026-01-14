/**
 * Change Tracker Service
 * Tracks changes to planned production and integrates with TodoList
 * 
 * Automatically determines scope:
 * - Global: Technology, Starting Bonus, New Bases (affects all bases)
 * - Per-Base: Buildings, Recipes, Stock (specific to a base)
 */

import { useTodoList, type Change } from './todoListService'

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
      addChange({
        type: 'technology',
        description: `🔬 ${techName}: Level ${fromLevel} → ${toLevel}`,
        details: {
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
      addChange({
        type: 'starting-bonus',
        description: `⭐ Starting Bonus: ${fromBonus.toFixed(2)}× → ${toBonus.toFixed(2)}×`,
        details: {
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
      addChange({
        type: 'base',
        description: `➕ New Base: ${baseName}`,
        details: {
          action: 'add',
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track base removal (GLOBAL)
     */
    trackRemoveBase(baseName: string): void {
      addChange({
        type: 'base',
        description: `❌ Remove Base: ${baseName}`,
        details: {
          action: 'remove',
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track building level change (PER-BASE)
     * @param baseId Unique base identifier (from playerBases)
     * @param baseName Display name for the base
     */
    trackBuildingChange(
      baseId: string,
      baseName: string,
      slotNum: string,
      buildingId: number,
      buildingName: string,
      fromLevel: number,
      toLevel: number
    ): void {
      addChange({
        type: 'building',
        baseName: baseName,
        description: `🏢 ${buildingName} #${slotNum}: Level ${fromLevel} → ${toLevel}`,
        details: {
          baseId: baseId,
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
    trackAddBuilding(baseId: string, baseName: string, slotNum: string, buildingName: string): void {
      addChange({
        type: 'building',
        baseName,
        description: `🏢 Building added: ${buildingName} #${slotNum}`,
        details: {
          baseId: baseId,
          action: 'add',
          slotId: slotNum,
          buildingName,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track building remove (PER-BASE)
     */
    trackRemoveBuilding(baseId: string, baseName: string, slotNum: string, buildingName: string): void {
      addChange({
        type: 'building',
        baseName,
        description: `🏢 Building removed: ${buildingName} #${slotNum}`,
        details: {
          baseId: baseId,
          action: 'remove',
          slotId: slotNum,
          buildingName,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track recipe add (PER-BASE)
     */
    trackAddRecipe(baseId: string, baseName: string, recipeId: number, recipeName: string): void {
      addChange({
        type: 'recipe',
        baseName,
        description: `➕ Recipe added: ${recipeName}`,
        details: {
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
    trackRemoveRecipe(baseId: string, baseName: string, recipeId: number, recipeName: string): void {
      addChange({
        type: 'recipe',
        baseName,
        description: `❌ Recipe removed: ${recipeName}`,
        details: {
          baseId: baseId,
          action: 'remove',
          recipeId: recipeId.toString(),
          recipeName,
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
      addChange({
        type: 'recipe',
        baseName,
        description: `🔄 ${recipeName}: Count ${fromCount} → ${toCount}`,
        details: {
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
      addChange({
        type: 'stock',
        baseName,
        description: `📦 ${materialName}: Stock ${fromQty} → ${toQty}`,
        details: {
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
