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
import type { GameData } from './gamedata/types'

function generateChangeId(): string {
  return crypto.randomUUID?.() ?? `change_${Date.now()}_${Math.random()}`
}

/**
 * Tracker helper functions for common change types
 */
export function createChangeTracker(gameData?: GameData) {
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
      })
    },

    /**
     * Track building level change (PER-BASE)
     * @param planetId The planet ID of the base
     * @param buildingInstanceId The instance ID of the building (from playerBases)
     * @param buildingId The building ID
     * @param fromLevel The previous level
     * @param toLevel The new level
     */
    trackBuildingChange(
      planetId: number,
      buildingInstanceId: string,
      buildingId: number,
      fromLevel: number,
      toLevel: number
    ): void {
      const changeId = generateChangeId()
      
      // Retrieve building name from gameData if available
      const building = gameData?.buildings.find(b => b.id === buildingId)
      const buildingName = building?.name ?? `Building ${buildingId}`
      
      // Register the change for state reversion
      registerChange(changeId, {
        changeId,
        type: 'buildingLevel',
        targetId: buildingInstanceId,
        targetField: 'level',
        planetId: planetId,
        originalValue: fromLevel,
        newValue: toLevel,
      })
      
      addChange({
        id: changeId,
        type: 'building',
        planetId: planetId,
        description: `🏢 ${buildingName}: Level ${fromLevel} → ${toLevel}`,
        details: {
          changeId,
          planetId: planetId,
          buildingInstanceId,
          buildingId: buildingId.toString(),
          from: fromLevel,
          to: toLevel,
        },
      })
    },

    /**
     * Track building add (PER-BASE)
     * @param planetId The planet ID of the base
     * @param buildingId The building ID
     * @param instanceId The instance ID (will be assigned after building is added)
     */
    trackAddBuilding(planetId: number, buildingId: number, instanceId?: string): void {
      const changeId = generateChangeId()
      
      // Retrieve building name from gameData if available
      const building = gameData?.buildings.find(b => b.id === buildingId)
      const buildingName = building?.name ?? `Building ${buildingId}`
      
      // Register the change for state reversion
      if (buildingId !== undefined) {
        registerChange(changeId, {
          changeId,
          type: 'buildingAdd',
          targetId: instanceId,  // Will be set after building is added
          planetId: planetId,
          buildingId: buildingId,
        })
      }
      
      addChange({
        id: changeId,
        type: 'building',
        planetId,
        description: `🏢 ${buildingName} added`,
        details: {
          changeId,
          planetId: planetId,
          action: 'add',
          buildingId: buildingId.toString(),
        },
      })
    },

    /**
     * Track building remove (PER-BASE)
     * @param planetId The planet ID of the base
     * @param buildingId The building ID
     * @param instanceId The instance ID of the building being removed
     */
    trackRemoveBuilding(planetId: number, buildingId: number, instanceId?: string): void {
      const changeId = generateChangeId()
      
      // Retrieve building name from gameData if available
      const building = gameData?.buildings.find(b => b.id === buildingId)
      const buildingName = building?.name ?? `Building ${buildingId}`
      
      // Register the change for state reversion
      if (buildingId !== undefined && instanceId !== undefined) {
        registerChange(changeId, {
          changeId,
          type: 'buildingRemove',
          targetId: instanceId,
          planetId: planetId,
          buildingId: buildingId,
        })
      }
      
      addChange({
        id: changeId,
        type: 'building',
        planetId,
        description: `🏢 ${buildingName} removed`,
        details: {
          changeId,
          planetId: planetId,
          action: 'remove',
          buildingId: buildingId.toString(),
          instanceId,
        },
      })
    },

    /**
     * Track recipe add (PER-BASE)
     * @param planetId The planet ID of the base
     * @param recipeId The recipe ID
     * @param instanceId The instance ID (will be assigned after recipe is added)
     */
    trackAddRecipe(planetId: number, recipeId: number, instanceId?: string): void {
      const changeId = generateChangeId()
      
      // Retrieve recipe name from gameData if available
      const recipe = gameData?.recipes.find(r => r.id === recipeId)
      const recipeName = recipe?.output?.name ?? `Recipe ${recipeId}`
      
      // Register the change for state reversion
      registerChange(changeId, {
        changeId,
        type: 'recipeAdd',
        targetId: instanceId,  // Will be set after recipe is added
        planetId: planetId,
        recipeId: recipeId,
      })
      
      addChange({
        id: changeId,
        type: 'recipe',
        planetId,
        description: `➕ ${recipeName} recipe added`,
        details: {
          changeId,
          planetId: planetId,
          action: 'add',
          recipeId: recipeId.toString(),
        },
      })
    },

    /**
     * Track recipe remove (PER-BASE)
     * @param planetId The planet ID of the base
     * @param recipeId The recipe ID
     * @param instanceId The instance ID of the recipe being removed
     */
    trackRemoveRecipe(planetId: number, recipeId: number, instanceId?: string): void {
      const changeId = generateChangeId()
      
      // Retrieve recipe name from gameData if available
      const recipe = gameData?.recipes.find(r => r.id === recipeId)
      const recipeName = recipe?.output?.name ?? `Recipe ${recipeId}`
      
      // Register the change for state reversion
      if (instanceId !== undefined) {
        registerChange(changeId, {
          changeId,
          type: 'recipeRemove',
          targetId: instanceId,
          planetId: planetId,
          recipeId: recipeId,
        })
      }
      
      addChange({
        id: changeId,
        type: 'recipe',
        planetId,
        description: `❌ ${recipeName} recipe removed`,
        details: {
          changeId,
          planetId: planetId,
          action: 'remove',
          recipeId: recipeId.toString(),
          instanceId,
        },
      })
    },

    /**
     * Track recipe count change (PER-BASE)
     * @param planetId The planet ID of the base
     * @param recipeId The recipe ID
     * @param fromCount The previous count
     * @param toCount The new count
     */
    trackRecipeCountChange(
      planetId: number,
      recipeId: number,
      fromCount: number,
      toCount: number
    ): void {
      const changeId = generateChangeId()
      
      // Retrieve recipe name from gameData if available
      const recipe = gameData?.recipes.find(r => r.id === recipeId)
      const recipeName = recipe?.output?.name ?? `Recipe ${recipeId}`
      
      // Register the change for state reversion
      registerChange(changeId, {
        changeId,
        type: 'recipeCount',
        targetId: String(recipeId),
        targetField: 'count',
        planetId: planetId,
        originalValue: fromCount,
        newValue: toCount,
      })
      
      addChange({
        id: changeId,
        type: 'recipe',
        planetId,
        description: `🔄 ${recipeName}: Count ${fromCount} → ${toCount}`,
        details: {
          changeId,
          planetId: planetId,
          recipeId: recipeId.toString(),
          from: fromCount,
          to: toCount,
        },
      })
    },

    /**
     * Track stock change (PER-BASE)
     * @param planetId The planet ID of the base
     * @param materialId The material ID
     * @param fromQty The previous quantity
     * @param toQty The new quantity
     */
    trackStockChange(
      planetId: number,
      materialId: number,
      fromQty: number,
      toQty: number
    ): void {
      const changeId = generateChangeId()
      
      // Retrieve material name from gameData if available
      const material = gameData?.materials.find(m => m.id === materialId)
      const materialName = material?.name ?? `Material ${materialId}`
      
      // Register the change for state reversion
      registerChange(changeId, {
        changeId,
        type: 'stock',
        targetId: materialId.toString(),
        planetId: planetId,
        targetField: 'amount',
        originalValue: fromQty,
        newValue: toQty,
      })
      
      addChange({
        id: changeId,
        type: 'stock',
        planetId,
        description: `📦 ${materialName}: Stock ${fromQty} → ${toQty}`,
        details: {
          changeId,
          planetId: planetId,
          materialId: materialId.toString(),
          from: fromQty,
          to: toQty,
        },
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

export function getChangeTracker(gameData?: GameData) {
  if (!trackerInstance) {
    trackerInstance = createChangeTracker(gameData)
  }
  return trackerInstance
}
