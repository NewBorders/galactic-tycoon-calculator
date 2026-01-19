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
/**
 * Technology research costs per level upgrade
 * Source: https://wiki.galactictycoons.com/mechanics/technology#research-requirements
 *
 * Material tiers by level range:
 * - Levels 1-5: Research Data only
 * - Levels 6-10: Research Data + Advanced Research Data
 * - Levels 11-15: Advanced Research Data + Apex Research Data
 * - Levels 16-20: Apex Research Data + Quantum Research Data
 * - Levels 20+: Quantum Research Data only
 *
 * Cost Formula (from wiki):
 * Step 1: Calculate Total Value
 *   ValueMultiplier = ((CurrentLevel / 4) + 1)³
 *   TechPenalty = (TotalTechnologies + 1)^1.015 - TotalTechnologies
 *   TechFlat = TotalTechnologies × 3,000
 *   TotalValue = (ValueMultiplier × 8,000) × TechPenalty + TechFlat
 *
 * Step 2: Determine Material Distribution
 *   tierPart = NextLevel / 5.0
 *   Based on tierPart, distribute TotalValue across material tiers
 *
 * Material IDs:
 * - 64: Research Data (Tier 1)
 * - 65: Advanced Research Data (Tier 2)
 * - 127: Apex Research Data (Tier 3)
 * - 164: Quantum Research Data (Tier 4)
 */

interface TechnologyMaterial {
  materialId: number
  amount: number
}

/**
 * Calculate technology research cost for a single level upgrade
 * Implements exact Wiki formula from: https://wiki.galactictycoons.com/mechanics/technology#cost-calculation
 *
 * @param nextLevel The level being researched (currentLevel + 1)
 * @param totalTechnologies Sum of all technology levels across all fields
 */
function getTechnologyLevelCost(nextLevel: number, totalTechnologies: number): TechnologyMaterial[] {
  // Step 1: Calculate Total Value Cost (per Wiki)
  const currentLevel = nextLevel - 1
  const valueMultiplier = Math.pow((currentLevel / 4) + 1, 3)
  const techPenalty = Math.pow(totalTechnologies + 1, 1.015) - totalTechnologies
  const techFlat = totalTechnologies * 3000
  const totalValue = (valueMultiplier * 8000) * techPenalty + techFlat

  // Step 2: Determine Material Tier Distribution (per Wiki)
  const tierPart = nextLevel / 5.0
  const materials: TechnologyMaterial[] = []

  // Step 3: Convert Value to Research Data Cost with material-specific divisors
  // Each material tier has a different divisor to convert TotalValue to material amounts
  const T1_DIVISOR = 1100  // Research Data
  const T2_DIVISOR = 3000  // Advanced Research Data
  const T3_DIVISOR = 6000  // Apex Research Data
  const T4_DIVISOR = 10000 // Quantum Research Data

  if (tierPart <= 1.0) {
    // Levels 1-5: Pure T1 (Research Data)
    const t1Amount = Math.ceil((totalValue * 1.0) / T1_DIVISOR)
    if (t1Amount > 0) {
      materials.push({ materialId: 64, amount: t1Amount })
    }
  } else if (tierPart <= 2.0) {
    // Levels 6-10: Transition from T1 to T2
    const progress = tierPart - 1.0
    const t1Percentage = 0.8 - (0.6 * progress) // 80% → 20%
    const t2Percentage = 0.2 + (0.6 * progress) // 20% → 80%

    const t1Amount = Math.ceil((totalValue * t1Percentage) / T1_DIVISOR)
    const t2Amount = Math.ceil((totalValue * t2Percentage) / T2_DIVISOR)

    if (t1Amount > 0) {
      materials.push({ materialId: 64, amount: t1Amount })
    }
    if (t2Amount > 0) {
      materials.push({ materialId: 65, amount: t2Amount })
    }
  } else if (tierPart <= 3.0) {
    // Levels 11-15: Transition from T2 to T3
    const progress = tierPart - 2.0
    const t2Percentage = 0.8 - (0.6 * progress) // 80% → 20%
    const t3Percentage = 0.2 + (0.6 * progress) // 20% → 80%

    const t2Amount = Math.ceil((totalValue * t2Percentage) / T2_DIVISOR)
    const t3Amount = Math.ceil((totalValue * t3Percentage) / T3_DIVISOR)

    if (t2Amount > 0) {
      materials.push({ materialId: 65, amount: t2Amount })
    }
    if (t3Amount > 0) {
      materials.push({ materialId: 127, amount: t3Amount })
    }
  } else if (tierPart <= 4.0) {
    // Levels 16-20: Transition from T3 to T4
    const progress = tierPart - 3.0
    const t3Percentage = 0.8 - (0.6 * progress) // 80% → 20%
    const t4Percentage = 0.2 + (0.6 * progress) // 20% → 80%

    const t3Amount = Math.ceil((totalValue * t3Percentage) / T3_DIVISOR)
    const t4Amount = Math.ceil((totalValue * t4Percentage) / T4_DIVISOR)

    if (t3Amount > 0) {
      materials.push({ materialId: 127, amount: t3Amount })
    }
    if (t4Amount > 0) {
      materials.push({ materialId: 164, amount: t4Amount })
    }
  } else {
    // Levels 21+: Pure T4 (Quantum Research Data)
    const t4Amount = Math.ceil((totalValue * 1.0) / T4_DIVISOR)
    if (t4Amount > 0) {
      materials.push({ materialId: 164, amount: t4Amount })
    }
  }

  return materials
}

/**
 * Build the full TECHNOLOGY_COSTS lookup table dynamically
 * Generates costs for levels 0-99 for all 9 technologies
 *
 * Note: This assumes totalTechnologies = 0 for base cost calculation.
 * In actual usage, computeTechnologyResearchCost should recalculate with current totals.
 */
export const TECHNOLOGY_COSTS: Record<number, Record<string, TechnologyMaterial[]>> = {}

// Technology IDs: 1-8, 10 (9 is not used)
const TECHNOLOGY_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 10]

// Generate costs for all technologies up to level 100
TECHNOLOGY_IDS.forEach(techId => {
  TECHNOLOGY_COSTS[techId] = {}

  for (let level = 0; level < 100; level++) {
    const key = `${level}_${level + 1}`
    // Use level as approximation for totalTechnologies in lookup table
    // This provides reasonable base costs; actual computation should use real totals
    TECHNOLOGY_COSTS[techId][key] = getTechnologyLevelCost(level + 1, level)
  }
})

/**
 * New base creation costs per planet tier
 * Format: { tier: [{ materialId, amount }] }
 *
 * These are the costs from baseBuildingCost in GameData, organized by tier
 * Tier 1 = cheapest, Tier 5 = most expensive
 */
export const NEW_BASE_COSTS_BY_TIER: Record<number, Array<{ materialId: number; amount: number }>> = {
  // Base creation costs per tier (from wiki: https://wiki.galactictycoons.com/guide/second-base)
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
    { materialId: 90, amount: 40 },   // Pressure Sealant Kit
  ],
  3: [
    { materialId: 3, amount: 250 },
    { materialId: 26, amount: 30 },
    { materialId: 52, amount: 10 },
    { materialId: 92, amount: 30 },
    { materialId: 120, amount: 40 },  // Composite Shielding
  ],
  4: [
    { materialId: 3, amount: 250 },
    { materialId: 26, amount: 30 },
    { materialId: 52, amount: 10 },
    { materialId: 92, amount: 30 },
    { materialId: 121, amount: 40 },  // Nanoweave Shielding
  ],
  // Tier 5: Not yet available in game
}

/**
 * Compute building tier extras for planet tiers 2-4
 * Formula: 8 × building tier of the specific material per planet tier
 * Source: https://wiki.galactictycoons.com/guide/second-base#building-costs
 *
 * Planet Tier 2: Pressure Sealant Kit (id 90)
 * Planet Tier 3: Composite Shielding (id 120)
 * Planet Tier 4: Nanoweave Shielding (id 121)
 */
export function computeBuildingTierExtras(
  planetTier: number,
  buildingTier: number
): Array<{ materialId: number; amount: number }> {
  if (planetTier === 2) {
    return [{ materialId: 90, amount: 8 * buildingTier }]  // Pressure Sealant Kit
  }
  if (planetTier === 3) {
    return [{ materialId: 120, amount: 8 * buildingTier }] // Composite Shielding
  }
  if (planetTier === 4) {
    return [{ materialId: 121, amount: 8 * buildingTier }] // Nanoweave Shielding
  }
  return []
}

/**
 * Calculate growth multiplier for building upgrade costs based on target level.
 * Formula from Wiki: GrowthMultiplier(level) = 0.1 × level + 1.07^level (for levels 1-8)
 * Source: https://wiki.galactictycoons.com/mechanics/buildings#regular-buildings
 */
export function getBuildingGrowthMultiplier(level: number): number {
  if (level < 1 || level > 8) return 1
  return 0.1 * level + Math.pow(1.07, level)
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
 * Compute building upgrade materials for a level change.
 * Uses Wiki formula: GrowthMultiplier(level) = 0.1 × level + 1.07^level
 * Source: https://wiki.galactictycoons.com/mechanics/buildings#regular-buildings
 * Headquarters use different formula: 0.8^level (reversed growth)
 * Source: https://wiki.galactictycoons.com/mechanics/buildings#headquarters
 * Handles both upgrades and downgrades by summing intermediate levels.
 */
export function computeBuildingUpgradeCost(
  building: { constructionMaterials: Array<{ id: number; amount: number }>; tier?: number; name?: string },
  planetTier: number,
  fromLevel: number,
  toLevel: number,
  gameData?: { materials: Array<{ id: number; name: string }> }
): string | undefined {
  if (!building || !Number.isFinite(fromLevel) || !Number.isFinite(toLevel) || fromLevel === toLevel) {
    return undefined
  }

  const start = Math.min(fromLevel, toLevel)
  const end = Math.max(fromLevel, toLevel)
  const buildingTier = building.tier ?? 1
  const tierMultiplier = getBuildingCostMultiplier(planetTier, buildingTier)
  const tierExtras = computeBuildingTierExtras(planetTier, buildingTier)
  const totals = new Map<number, number>()
  
  // Check if this is Headquarters (uses different formula)
  const isHeadquarters = building.name?.toLowerCase().includes('headquarters') ?? false

  for (let level = start; level < end; level++) {
    const nextLevel = level + 1
    // Use Wiki growth formula based on building type
    const levelMultiplier = isHeadquarters 
      ? Math.pow(0.8, nextLevel) // Headquarters: 0.8^level (costs decrease with level)
      : getBuildingGrowthMultiplier(nextLevel) // Regular: 0.1*level + 1.07^level
    const stepMultiplier = tierMultiplier * levelMultiplier

    for (const cm of building.constructionMaterials ?? []) {
      const amount = Math.ceil((cm?.amount ?? 0) * stepMultiplier)
      if (amount > 0) {
        totals.set(cm.id, (totals.get(cm.id) ?? 0) + amount)
      }
    }

    for (const extra of tierExtras) {
      const amount = Math.ceil((extra?.amount ?? 0) * levelMultiplier)
      if (amount > 0) {
        totals.set(extra.materialId, (totals.get(extra.materialId) ?? 0) + amount)
      }
    }
  }

  if (totals.size === 0) return undefined

  const list = Array.from(totals.entries()).map(([materialId, amount]) => ({ materialId, amount }))
  return formatMaterialList(list, gameData)
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
 * Works for both upgrades (fromLevel < toLevel) and downgrades (fromLevel > toLevel).
 *
 * @param techId Technology ID (1-8, 10)
 * @param fromLevel Starting level
 * @param toLevel Target level
 * @param gameData Game data for material name resolution
 * @param totalTechnologies Sum of all current technology levels across all fields
 * @returns Formatted string of material costs, or undefined if invalid
 */
export function computeTechnologyResearchCost(
  techId: number,
  fromLevel: number,
  toLevel: number,
  gameData?: { materials: Array<{ id: number; name: string }> },
  totalTechnologies?: number
): string | undefined {
  if (!Number.isFinite(techId) || !Number.isFinite(fromLevel) || !Number.isFinite(toLevel)) return undefined
  if (toLevel === fromLevel) return undefined

  // If totalTechnologies not provided, default to 0
  // The caller should calculate this from world data
  const currentTotal = totalTechnologies ?? 0

  // Track the running total to reflect techPenalty growth after each level-up
  let runningTotal = currentTotal

  const totals = new Map<number, number>()

  // Handle both upgrades and downgrades
  if (toLevel > fromLevel) {
    // Upgrade: Calculate costs for each level from fromLevel to toLevel
    for (let level = fromLevel; level < toLevel; level++) {
      const nextLevel = level + 1
      // Use the current running total, then increment for the next step
      const materials = getTechnologyLevelCost(nextLevel, runningTotal)

      // Each researched level increases the total technology sum
      runningTotal += 1

      for (const mat of materials) {
        const prev = totals.get(mat.materialId) || 0
        totals.set(mat.materialId, prev + mat.amount)
      }
    }
  } else {
    // Downgrade: Cost to reach the target level from level 1
    // (Sum all costs from level 1 to the target level)
    for (let level = 1; level < toLevel; level++) {
      const nextLevel = level + 1
      const materials = getTechnologyLevelCost(nextLevel, runningTotal)

      // Keep running total in sync with the levels being accumulated
      runningTotal += 1

      for (const mat of materials) {
        const prev = totals.get(mat.materialId) || 0
        totals.set(mat.materialId, prev + mat.amount)
      }
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
