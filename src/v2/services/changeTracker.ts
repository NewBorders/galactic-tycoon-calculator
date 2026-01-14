/**
 * Change Tracker Service
 * Tracks changes to planned production and integrates with TodoList
 */

import { useTodoList, type Change } from '@/v2/composables/useTodoList'

/**
 * Tracker helper functions for common change types
 */
export function createChangeTracker() {
  const { addChange } = useTodoList()

  return {
    /**
     * Track technology level change
     */
    trackTechnologyChange(techId: number, techName: string, fromLevel: number, toLevel: number): void {
      addChange({
        type: 'technology',
        description: `${techName}: Level ${fromLevel} → ${toLevel}`,
        details: {
          technologyId: techId,
          from: fromLevel,
          to: toLevel,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track starting bonus change
     */
    trackStartingBonusChange(fromBonus: number, toBonus: number): void {
      addChange({
        type: 'starting-bonus',
        description: `Starting Bonus: ${fromBonus.toFixed(2)}× → ${toBonus.toFixed(2)}×`,
        details: {
          from: fromBonus.toFixed(2),
          to: toBonus.toFixed(2),
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track building level change
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
        description: `${buildingName}: Level ${fromLevel} → ${toLevel}`,
        details: {
          buildingId,
          from: fromLevel,
          to: toLevel,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track recipe add/remove
     */
    trackRecipeChange(baseName: string, recipeName: string, action: 'add' | 'remove'): void {
      addChange({
        type: 'recipe',
        baseName,
        description: `Recipe ${action === 'add' ? 'added' : 'removed'}: ${recipeName}`,
        details: {
          action,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track recipe count change
     */
    trackRecipeCountChange(baseName: string, recipeName: string, fromCount: number, toCount: number): void {
      addChange({
        type: 'recipe',
        baseName,
        description: `${recipeName}: Count ${fromCount} → ${toCount}`,
        details: {
          from: fromCount,
          to: toCount,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track stock change
     */
    trackStockChange(baseName: string, materialName: string, fromQty: number, toQty: number): void {
      addChange({
        type: 'stock',
        baseName,
        description: `${materialName}: Stock ${fromQty} → ${toQty}`,
        details: {
          from: fromQty,
          to: toQty,
        },
        timestamp: Date.now(),
      })
    },

    /**
     * Track base add/remove
     */
    trackBaseChange(baseName: string, action: 'add' | 'remove'): void {
      addChange({
        type: 'base',
        description: `Base ${action === 'add' ? 'added' : 'removed'}: ${baseName}`,
        details: {
          action,
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
