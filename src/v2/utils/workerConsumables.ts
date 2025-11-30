/**
 * Worker Consumables Utilities
 * 
 * Single source of truth for identifying worker consumable materials.
 * Extracts material IDs from GameData worker definitions.
 */

import type { GameData } from '@/v2/services/gamedata/types'

/**
 * Get all material IDs that are consumed by workers (any tier, essential or optional)
 * 
 * @param gameData - The game data containing worker definitions
 * @returns Set of material IDs that are worker consumables
 */
export function getWorkerConsumableMaterialIds(gameData: GameData): Set<number> {
  const materialIds = new Set<number>()
  
  gameData.workers.forEach((worker) => {
    worker.consumables.forEach((consumable) => {
      materialIds.add(consumable.matId)
    })
  })
  
  return materialIds
}

/**
 * Get worker consumable material IDs grouped by tier
 * 
 * @param gameData - The game data containing worker definitions
 * @returns Map of tier -> Set of material IDs
 */
export function getWorkerConsumablesByTier(gameData: GameData): Map<number, Set<number>> {
  const byTier = new Map<number, Set<number>>()
  
  gameData.workers.forEach((worker) => {
    const materialIds = new Set<number>()
    worker.consumables.forEach((consumable) => {
      materialIds.add(consumable.matId)
    })
    byTier.set(worker.type, materialIds)
  })
  
  return byTier
}

/**
 * Get essential (non-optional) worker consumable material IDs
 * 
 * @param gameData - The game data containing worker definitions
 * @returns Set of material IDs that are essential worker consumables
 */
export function getEssentialWorkerConsumableMaterialIds(gameData: GameData): Set<number> {
  const materialIds = new Set<number>()
  
  gameData.workers.forEach((worker) => {
    worker.consumables.forEach((consumable) => {
      if (consumable.essential) {
        materialIds.add(consumable.matId)
      }
    })
  })
  
  return materialIds
}

/**
 * Get optional (non-essential) worker consumable material IDs
 * 
 * @param gameData - The game data containing worker definitions
 * @returns Set of material IDs that are optional worker consumables
 */
export function getOptionalWorkerConsumableMaterialIds(gameData: GameData): Set<number> {
  const materialIds = new Set<number>()
  
  gameData.workers.forEach((worker) => {
    worker.consumables.forEach((consumable) => {
      if (!consumable.essential) {
        materialIds.add(consumable.matId)
      }
    })
  })
  
  return materialIds
}

/**
 * Check if a material ID is a worker consumable
 * 
 * @param gameData - The game data containing worker definitions
 * @param materialId - The material ID to check
 * @returns true if the material is consumed by any worker
 */
export function isWorkerConsumable(gameData: GameData, materialId: number): boolean {
  return gameData.workers.some((worker) =>
    worker.consumables.some((consumable) => consumable.matId === materialId)
  )
}
