// ...existing code...
// ...existing code...
// ...existing code...
  // ...existing code...
// ...existing code...
type WorkersHousingInput = {
  workersHousing?:
    | { worker?: number; technician?: number; engineer?: number; scientist?: number }
    | number[]
    | null
}

function normalizeWorkersHousing<T extends WorkersHousingInput>(building: T): T
function normalizeWorkersHousing<T extends WorkersHousingInput>(building: T | undefined): T | undefined
// Hilfsfunktion: workersHousing normalisieren (Objekt → Array)
function normalizeWorkersHousing<T extends WorkersHousingInput>(building: T | undefined): T | undefined {
  if (
    building &&
    building.workersHousing &&
    !Array.isArray(building.workersHousing) &&
    typeof building.workersHousing === 'object' &&
    building.workersHousing !== null &&
    'worker' in building.workersHousing
  ) {
    const wh = building.workersHousing
    return {
      ...building,
      workersHousing: [wh.worker ?? 0, wh.technician ?? 0, wh.engineer ?? 0, wh.scientist ?? 0]
    } as T
  }
  return building
}

// ...existing code...

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
import { getNewBaseCostForTier, computeBuildingUpgradeCost } from '@/v2/services/buildingCosts/buildingCosts.core'
import { computeTechnologyResearchCost } from '@/v2/services/technologyCosts/technologyCosts.core'
import { useWorldData } from './worldData'
import { usePlayerTechnology } from './playerTechnology'
import { usePlanningMode } from './planningMode/state'

function generateChangeId(): string {
  return crypto.randomUUID?.() ?? `change_${Date.now()}_${Math.random()}`
}

/**
 * Tracker helper functions for common change types
 */
export function createChangeTracker(gameData?: GameData) {
  const { addChange } = useTodoList()
  const { current } = useWorldData()
  const { state } = usePlayerTechnology()
  const { isPlanningActive, plannedTechnology } = usePlanningMode()

  /**
   * Get planned tech levels (from planning mode if active, otherwise from playerTechnology)
   */
  function getPlannedTechnologyLevels(): Partial<Record<number, number>> {
    if (isPlanningActive.value && plannedTechnology.value) {
      return plannedTechnology.value
    }
    return state.value?.levels ?? {}
  }

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

      // Calculate total technologies for cost calculation
      // Must include BOTH current levels AND planned level increases
      let totalTechnologies = 0

      // Add current technology levels
      if (current.value?.technology) {
        totalTechnologies = (Object.values(current.value.technology) as number[]).reduce((sum, level) => sum + level, 0)
      }

      // Add planned technology level increases (excluding this current change)
      // This ensures subsequent tech upgrades account for earlier planned upgrades
      const plannedLevels = getPlannedTechnologyLevels()
      Object.entries(plannedLevels).forEach(([tId, plannedLevel]) => {
        const techIdNum = Number(tId)
        if (techIdNum !== techId && current.value?.technology) {
          const currentLevel = current.value.technology[techIdNum] ?? 0
          const increase = Math.max(0, (plannedLevel ?? 0) - currentLevel)
          totalTechnologies += increase
        }
      })

      // Compute materials cost for planned technology upgrade (if configured)
      // Use the fromLevel as passed by the caller (represents the visible state in UI)
      const materialsCost = computeTechnologyResearchCost(
        techId,
        fromLevel,
        toLevel,
        gameData ? { materials: gameData.materials } : undefined,
        totalTechnologies
      )

      addChange({
        id: changeId,
        type: 'technology',
        description: `🔬 ${techName}: Level ${fromLevel} → ${toLevel}`,
        details: {
          changeId,
          technologyId: techId.toString(),
          from: fromLevel,
          to: toLevel,
          materialsCost,
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
     * @param planetTier The tier of the planet (for cost calculation)
     * @param planetId The ID of the planet where the base is being created
     */
    trackNewBase(baseName: string, planetTier?: number, planetId?: number): void {
      const changeId = generateChangeId()
      // Compute materials cost for new base creation by planet tier if provided
      const materialsCost = planetTier != null
        ? getNewBaseCostForTier(planetTier, gameData ? { materials: gameData.materials } : undefined)
        : undefined
      addChange({
        id: changeId,
        type: 'base',
        description: `➕ New Base: ${baseName}`,
        details: {
          changeId,
          action: 'add',
          materialsCost,
          planetId,
        },
      })
    },

    /**
     * Track base removal (GLOBAL)
     * @param baseName The name of the base being removed
     * @param planetId The ID of the planet where the base exists
     * @param baseId The ID of the base being removed
     */
    trackRemoveBase(baseName: string, planetId?: number, baseId?: string): void {
      const changeId = generateChangeId()
      addChange({
        id: changeId,
        type: 'base',
        description: `❌ Remove Base: ${baseName}`,
        details: {
          changeId,
          action: 'remove',
          planetId,
          baseId,
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
      let building = gameData?.buildings.find(b => b.id === buildingId)
      building = normalizeWorkersHousing(building)
      const buildingName = building?.name ?? `Building ${buildingId}`

      // Get planet tier for cost multiplier
      const planet = gameData?.planets.find(p => p.id === planetId)
      const planetTier = planet?.tier ?? 1

      // Compute material costs using per-level scaling and planet tier
      const buildingForCost = normalizeWorkersHousing(building)
      const materialsCost = buildingForCost
        ? computeBuildingUpgradeCost(
            buildingForCost,
            planetTier,
            fromLevel,
            toLevel,
            gameData ? { materials: gameData.materials } : undefined,
          )
        : undefined

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
          materialsCost,
        },
      })
    },

    /**
     * Track building add (PER-BASE)
     * @param planetId The planet ID of the base
     * @param buildingId The building ID
     * @param buildingInstanceId The building instance ID (will be assigned after building is added)
     * @param level The building level (defaults to 1)
     */
    trackAddBuilding(planetId: number, buildingId: number, buildingInstanceId?: string, level: number = 1): void {
      const changeId = generateChangeId()

      // Retrieve building name and costs from gameData if available
      let building = gameData?.buildings.find(b => b.id === buildingId)
      building = normalizeWorkersHousing(building)
      const buildingName = building?.name ?? `Building ${buildingId}`

      // Für neue Gebäude: alle Material- und Zusatzkosten für alle Stufen aufsummieren
      let materialsCost: string | undefined = undefined
      const buildingForCost2 = normalizeWorkersHousing(building)
      if (buildingForCost2?.constructionMaterials && buildingForCost2.constructionMaterials.length > 0) {
        const planetTier = gameData?.planets.find(p => p.id === planetId)?.tier ?? 1
        materialsCost = computeBuildingUpgradeCost(
          buildingForCost2,
          planetTier,
          0,
          level,
          gameData ? { materials: gameData.materials } : undefined
        )
      }

      // Register the change for state reversion
      if (buildingId !== undefined) {
        registerChange(changeId, {
          changeId,
          type: 'buildingAdd',
          targetId: buildingInstanceId,  // Will be set after building is added
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
          buildingInstanceId: buildingInstanceId,
          materialsCost,
        },
      })
    },

    /**
     * Track building remove (PER-BASE)
     * @param planetId The planet ID of the base
     * @param buildingId The building ID
     * @param buildingInstanceId The building instance ID of the building being removed
     */
    trackRemoveBuilding(planetId: number, buildingId: number, buildingInstanceId?: string): void {
      const changeId = generateChangeId()

      // Retrieve building name from gameData if available
      const building = gameData?.buildings.find(b => b.id === buildingId)
      const buildingName = building?.name ?? `Building ${buildingId}`

      // Register the change for state reversion
      if (buildingId !== undefined && buildingInstanceId !== undefined) {
        registerChange(changeId, {
          changeId,
          type: 'buildingRemove',
          targetId: buildingInstanceId,
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
          buildingInstanceId: buildingInstanceId,
        },
      })
    },

    /**
     * Track recipe add (PER-BASE)
     * @param planetId The planet ID of the base
     * @param recipeId The recipe ID
     * @param recipeInstanceId The recipe instance ID (will be assigned after recipe is added)
     */
    trackAddRecipe(planetId: number, recipeId: number, recipeInstanceId?: string): void {
      const changeId = generateChangeId()

      // Retrieve recipe name from gameData if available
      const recipe = gameData?.recipes.find(r => r.id === recipeId)
      const recipeName = recipe?.output?.name ?? `Recipe ${recipeId}`

      // Register the change for state reversion
      registerChange(changeId, {
        changeId,
        type: 'recipeAdd',
        targetId: recipeInstanceId,  // Will be set after recipe is added
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
     * @param recipeInstanceId The recipe instance ID of the recipe being removed
     */
    trackRemoveRecipe(planetId: number, recipeId: number, recipeInstanceId?: string): void {
      const changeId = generateChangeId()

      // Retrieve recipe name from gameData if available
      const recipe = gameData?.recipes.find(r => r.id === recipeId)
      const recipeName = recipe?.output?.name ?? `Recipe ${recipeId}`

      // Register the change for state reversion
      if (recipeInstanceId !== undefined) {
        registerChange(changeId, {
          changeId,
          type: 'recipeRemove',
          targetId: recipeInstanceId,
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
      recipeInstanceId: string,
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
        targetId: recipeInstanceId,  // Use instance ID for DOM updates
        targetField: 'count',
        planetId: planetId,
        recipeId: recipeId,  // Keep recipe ID for reference
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
          recipeInstanceId: recipeInstanceId,  // Add instance ID for cancel-out detection
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
 * Note: gameData can be provided on first call or later updates
 */
let trackerInstance: ReturnType<typeof createChangeTracker> | null = null
let lastGameData: GameData | undefined = undefined

export function getChangeTracker(gameData?: GameData) {
  // If gameData has changed or no instance exists, create/recreate it
  if (!trackerInstance || gameData !== lastGameData) {
    trackerInstance = createChangeTracker(gameData)
    lastGameData = gameData
  }
  return trackerInstance
}
