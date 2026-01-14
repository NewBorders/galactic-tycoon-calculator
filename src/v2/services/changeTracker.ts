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
     */
    trackBuildingChange(
      baseName: string,
      buildingId: number,
      buildingName: string,
      fromLevel: number,
      toLevel: number
    ): void {
      addChange({
        type: 'building',
        baseName,
        description: `🏢 ${buildingName}: Level ${fromLevel} → ${toLevel}`,
        details: {
          buildingId: buildingId.toString(),
          from: fromLevel,
          to: toLevel,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track recipe add (PER-BASE)
     */
    trackAddRecipe(baseName: string, recipeName: string): void {
      addChange({
        type: 'recipe',
        baseName,
        description: `➕ Recipe added: ${recipeName}`,
        details: {
          action: 'add',
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track recipe remove (PER-BASE)
     */
    trackRemoveRecipe(baseName: string, recipeName: string): void {
      addChange({
        type: 'recipe',
        baseName,
        description: `❌ Recipe removed: ${recipeName}`,
        details: {
          action: 'remove',
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track recipe count change (PER-BASE)
     */
    trackRecipeCountChange(baseName: string, recipeName: string, fromCount: number, toCount: number): void {
      addChange({
        type: 'recipe',
        baseName,
        description: `🔄 ${recipeName}: Count ${fromCount} → ${toCount}`,
        details: {
          from: fromCount,
          to: toCount,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track stock change (PER-BASE)
     */
    trackStockChange(baseName: string, materialName: string, fromQty: number, toQty: number): void {
      addChange({
        type: 'stock',
        baseName,
        description: `📦 ${materialName}: Stock ${fromQty} → ${toQty}`,
        details: {
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
