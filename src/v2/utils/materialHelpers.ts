import type { GameData } from '@/v2/services/gamedata/types'
import { formatNumber } from '@/v2/utils/formatNumber'

/**
 * Get the weight in tonnes for a given material
 */
export function getMaterialWeight(gameData: GameData, materialId: number): number {
  const material = gameData.materials.find((m) => m.id === materialId)
  return material?.weightInTonnes ?? 0
}

/**
 * Format the total weight for a given amount of material
 * @param amount The amount of material (absolute value will be used)
 * @param materialId The material ID
 * @param gameData The game data containing material information
 * @returns Formatted weight string (e.g., "125.3t")
 */
export function formatWeight(gameData: GameData, amount: number, materialId: number): string {
  const weight = getMaterialWeight(gameData, materialId) * Math.abs(amount)
  return `${formatNumber(weight, 1)}t`
}
