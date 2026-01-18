/**
 * Manual cost configurations for operations not available in GameData
 * These costs are manually maintained and can be updated as needed.
 */

/**
 * Technology upgrade costs per level
 * Format: { technologyId: { levelFrom_levelTo: [{ materialId, amount }] } }
 * 
 * Example:
 * 1: { // Construction tech
 *   '0_1': [{ materialId: 3, amount: 100 }, { materialId: 26, amount: 50 }],
 *   '1_2': [{ materialId: 3, amount: 200 }, { materialId: 26, amount: 100 }],
 * }
 */
export const TECHNOLOGY_COSTS: Record<number, Record<string, Array<{ materialId: number; amount: number }>>> = {
  // TODO: Fill in technology costs manually
  // Technology IDs: 1=Construction, 2=Manufacturing, 3=Agriculture, 4=ResourceExtraction, 
  // 5=Metallurgy, 6=Chemistry, 7=Electronics, 8=FoodProduction, 10=Science
}

/**
 * New base creation costs per planet tier
 * Format: { tier: [{ materialId, amount }] }
 * 
 * These are the costs from baseBuildingCost in GameData, organized by tier
 * Tier 1 = cheapest, Tier 5 = most expensive
 */
export const NEW_BASE_COSTS_BY_TIER: Record<number, Array<{ materialId: number; amount: number }>> = {
  // Adapted from GameData baseBuildingCost.
  // Current design: same base creation costs across tiers.
  // If the wiki specifies tier-specific differences, update values per tier accordingly.
  1: [
    { materialId: 3, amount: 250 },   // Concrete
    { materialId: 26, amount: 30 },   // Construction Kit
    { materialId: 52, amount: 10 },   // Construction Vehicle
    { materialId: 92, amount: 30 },   // Prefab Kit
  ],
  2: [
    { materialId: 3, amount: 250 },
    { materialId: 26, amount: 30 },
    { materialId: 52, amount: 10 },
    { materialId: 92, amount: 30 },
  ],
  3: [
    { materialId: 3, amount: 250 },
    { materialId: 26, amount: 30 },
    { materialId: 52, amount: 10 },
    { materialId: 92, amount: 30 },
  ],
  4: [
    { materialId: 3, amount: 250 },
    { materialId: 26, amount: 30 },
    { materialId: 52, amount: 10 },
    { materialId: 92, amount: 30 },
  ],
  5: [
    { materialId: 3, amount: 250 },
    { materialId: 26, amount: 30 },
    { materialId: 52, amount: 10 },
    { materialId: 92, amount: 30 },
  ],
}

/**
 * Building cost tier multipliers
 * Buildings have base construction costs, but these are multiplied by planet tier
 * Formula: actualCost = baseCost * getTierMultiplier(planetTier, buildingTier)
 */
export function getBuildingCostMultiplier(planetTier: number, buildingTier: number): number {
  // Simple tier difference multiplier - adjust as needed based on game mechanics
  const tierDiff = Math.max(0, planetTier - buildingTier)
  
  // Each tier above building tier increases cost
  // Tier 1 planet + Tier 1 building = 1x cost
  // Tier 2 planet + Tier 1 building = 1.5x cost
  // Tier 3 planet + Tier 1 building = 2x cost
  // etc.
  return 1 + (tierDiff * 0.5)
}

/**
 * Format a material list to a user-friendly string using material names from gameData
 */
export function formatMaterialList(
  list: Array<{ materialId: number; amount: number }>,
  gameData?: { materials: Array<{ id: number; name: string }> }
): string {
  if (!Array.isArray(list) || list.length === 0) return ''
  return list
    .filter(it => it && Number.isFinite(it.amount) && it.amount > 0)
    .map(it => {
      const name = gameData?.materials.find(m => m.id === it.materialId)?.name ?? `Material ${it.materialId}`
      return `${Math.ceil(it.amount)}× ${name}`
    })
    .join(', ')
}

/**
 * Compute technology research materials cost for a planned upgrade from `fromLevel` to `toLevel`.
 * Uses TECHNOLOGY_COSTS per-level entries and aggregates amounts per material.
 */
export function computeTechnologyResearchCost(
  techId: number,
  fromLevel: number,
  toLevel: number,
  gameData?: { materials: Array<{ id: number; name: string }> }
): string | undefined {
  if (!Number.isFinite(techId) || !Number.isFinite(fromLevel) || !Number.isFinite(toLevel)) return undefined
  if (toLevel <= fromLevel) return undefined
  const config = TECHNOLOGY_COSTS[techId]
  if (!config) return undefined
  const totals = new Map<number, number>()
  for (let lvl = fromLevel; lvl < toLevel; lvl++) {
    const key = `${lvl}_${lvl + 1}`
    const reqs = config[key]
    if (!reqs || reqs.length === 0) continue
    for (const r of reqs) {
      const prev = totals.get(r.materialId) || 0
      totals.set(r.materialId, prev + (r.amount || 0))
    }
  }
  const list: Array<{ materialId: number; amount: number }> = []
  totals.forEach((amount, materialId) => list.push({ materialId, amount }))
  return list.length > 0 ? formatMaterialList(list, gameData) : undefined
}

/**
 * Get new base creation cost for a specific planet tier.
 * Returns a formatted string suitable for TodoList materials display.
 */
export function getNewBaseCostForTier(
  tier: number,
  gameData?: { materials: Array<{ id: number; name: string }> }
): string | undefined {
  if (!Number.isFinite(tier)) return undefined
  const list = NEW_BASE_COSTS_BY_TIER[tier]
  if (!list || list.length === 0) return undefined
  const formatted = formatMaterialList(list, gameData)
  return formatted.length > 0 ? formatted : undefined
}
