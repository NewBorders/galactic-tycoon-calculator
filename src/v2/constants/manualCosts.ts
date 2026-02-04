/**
 * Manual cost configurations for operations not available in GameData
 * These costs are manually maintained and can be updated as needed.
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

export const NEW_BASE_COSTS_BY_TIER: Record<number, Array<{ materialId: number; amount: number }>> = {
  1: [
    { materialId: 3, amount: 250 },
    { materialId: 26, amount: 30 },
    { materialId: 52, amount: 10 },
    { materialId: 92, amount: 30 },
  ],
  2: [
    { materialId: 3, amount: 250 },
    { materialId: 26, amount: 30 },
    { materialId: 52, amount: 10 },
    { materialId: 92, amount: 30 },
    { materialId: 90, amount: 40 },
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
/**
 * Compute building tier extras for planet tiers 2-4
 * Neue Regeln (2026):
 * - Warehouse: 2 pro Stufe
 * - Housing: 4 pro Stufe
 * - Production (unabhängig von Fertility/Abundance): 1 pro Stufe (rundt auf 2 auf Stufe Level 2)
 * - sonst: 8 pro Stufe
 *
 * @param planetTier Planetentier (2, 3, 4)
 * @param buildingTier Gebäudetier (meist 1)
 * @param opts Optionale Infos: { specialization, isWarehouse, isHousing, isProduction, affectedByFertilityOrAbundance }
 */
export function computeBuildingTierExtras(
  building: {
    name?: string
    specialization?: number
    workersHousing?: number[] | null
    tier?: number
  },
  planetTier: number,
  targetLevel: number,
): Array<{ materialId: number; amount: number }> {
  // Typ-Erkennung
  const name = building.name?.toLowerCase() || ''
  const specialization = building.specialization
  let workersHousing = building.workersHousing
  // Konvertiere workersHousing zu Array, falls Objekt
  if (
    workersHousing &&
    !Array.isArray(workersHousing) &&
    typeof workersHousing === 'object' &&
    workersHousing !== null &&
    'worker' in workersHousing
  ) {
    const wh = workersHousing as { worker?: number; technician?: number; engineer?: number; scientist?: number }
    workersHousing = [
      wh.worker ?? 0,
      wh.technician ?? 0,
      wh.engineer ?? 0,
      wh.scientist ?? 0,
    ]
  }

  // ...existing code...

  let amount = 0
  if (name.includes('warehouse')) {
    amount = targetLevel === 1 ? 2 : (targetLevel === 2 ? 3 : 1)
  } else if (['barracks', 'residential', 'comfort', 'stella', 'suite'].some(hn => name.includes(hn)) || (Array.isArray(workersHousing) && workersHousing.some(x => x > 0))) {
    amount = targetLevel === 1 ? 4 : (targetLevel === 2 ? 5 : 1)
  } else if (specialization === 3 || specialization === 4) {
    amount = targetLevel === 1 ? 8 : (targetLevel === 2 ? 10 : 2)
  } else if ([2,3,4,5,6,8,10].includes(specialization ?? -1)) {
    amount = targetLevel === 1 ? 1 : (targetLevel === 2 ? 2 : 1)
  }

  let materialId: number | undefined
  if (planetTier === 2) materialId = 90
  else if (planetTier === 3) materialId = 120
  else if (planetTier === 4) materialId = 121

  if (!materialId) return []
  return [{ materialId, amount }]
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
  building: { constructionMaterials: Array<{ id: number; amount: number }>; tier?: number; name?: string; specialization?: number; workersHousing?: number[] | null },
  planetTier: number,
  fromLevel: number,
  toLevel: number,
  gameData?: { materials: Array<{ id: number; name: string }> }
): string | undefined {
  if (!building || !Number.isFinite(fromLevel) || !Number.isFinite(toLevel) || fromLevel === toLevel) {
    return undefined
  }

  // Die Summen-Maps müssen immer existieren, bevor darauf zugegriffen wird
  const materialTotals = new Map<number, number>()
  const tierExtraTotals = new Map<number, number>()
  const totals = new Map<number, number>()

  const start = Math.min(fromLevel, toLevel)
  const end = Math.max(fromLevel, toLevel)
  // Für Tier-Extras ist das Ziel-Level (toLevel) relevant
  const buildingTier = building.tier ?? 1
  // targetLevel entfernt (wurde nicht genutzt)
  const tierMultiplier = getBuildingCostMultiplier(planetTier, buildingTier)

  // Typ-Erkennung wie in computeBuildingTierExtras
  // ...entfernt: name, specialization (werden nicht mehr benötigt)
  let workersHousing = building.workersHousing
  // Konvertiere workersHousing zu Array, falls Objekt
  if (
    workersHousing &&
    !Array.isArray(workersHousing) &&
    typeof workersHousing === 'object' &&
    workersHousing !== null &&
    'worker' in workersHousing
  ) {
    const wh = workersHousing as { worker?: number; technician?: number; engineer?: number; scientist?: number }
    workersHousing = [
      wh.worker ?? 0,
      wh.technician ?? 0,
      wh.engineer ?? 0,
      wh.scientist ?? 0,
    ]
  }

  // ...existing code...

  // 1. Bau-Materialien für alle Levelschritte aufsummieren
  const isHeadquarters = building.name?.toLowerCase().includes('headquarters') ?? false
  if (fromLevel === 0 && toLevel === 1) {
    // Neubau auf Stufe 1: Nur Tier-Multiplikator, API-Daten
    for (const cm of building.constructionMaterials ?? []) {
      const amount = Math.round((cm?.amount ?? 0) * tierMultiplier)
      if (amount > 0) {
        materialTotals.set(cm.id, (materialTotals.get(cm.id) ?? 0) + amount)
      }
    }
  } else {
    for (let level = start; level < end; level++) {
      const nextLevel = level + 1
      let stepMultiplier = tierMultiplier
      if (nextLevel > 1) {
        const levelMultiplier = isHeadquarters
          ? Math.pow(0.8, nextLevel)
          : getBuildingGrowthMultiplier(nextLevel)
        stepMultiplier *= levelMultiplier
      }
      for (const cm of building.constructionMaterials ?? []) {
        const amount = Math.round((cm?.amount ?? 0) * stepMultiplier)
        if (amount > 0) {
          materialTotals.set(cm.id, (materialTotals.get(cm.id) ?? 0) + amount)
        }
      }
    }
  }

  // 2. Tier-Extras getrennt berechnen
  if (fromLevel === 0) {
    if (toLevel === 1) {
      // Neubau auf Stufe 1: Nur Level 1-Tier-Extras
      const tierExtras = computeBuildingTierExtras(building, planetTier, 1);
      for (const extra of tierExtras) {
        if (extra?.amount > 0) {
          tierExtraTotals.set(extra.materialId, (tierExtraTotals.get(extra.materialId) ?? 0) + extra.amount)
        }
      }
    } else {
      // Neubau auf Level >1: Summiere Einzelwerte für alle Level von 1 bis toLevel
      for (let lvl = 1; lvl <= toLevel; lvl++) {
        const tierExtras = computeBuildingTierExtras(building, planetTier, lvl);
        for (const extra of tierExtras) {
          if (extra?.amount > 0) {
            tierExtraTotals.set(extra.materialId, (tierExtraTotals.get(extra.materialId) ?? 0) + extra.amount)
          }
        }
      }
    }
  } else if (fromLevel !== toLevel) {
    // Typ-Erkennung wie in computeBuildingTierExtras
    const name = building.name?.toLowerCase() || ''
    const specialization = building.specialization
    let workersHousing = building.workersHousing
    // Konvertiere workersHousing zu Array, falls Objekt
    if (
      workersHousing &&
      !Array.isArray(workersHousing) &&
      typeof workersHousing === 'object' &&
      workersHousing !== null &&
      'worker' in workersHousing
    ) {
      const wh = workersHousing as { worker?: number; technician?: number; engineer?: number; scientist?: number }
      workersHousing = [
        wh.worker ?? 0,
        wh.technician ?? 0,
        wh.engineer ?? 0,
        wh.scientist ?? 0,
      ]
    }
    // ...existing code...

    let tierExtras: Array<{ materialId: number; amount: number }> = [];
    // Housing
    if ((['barracks', 'residential', 'comfort', 'stella', 'suite'].some(hn => name.includes(hn)) || (Array.isArray(workersHousing) && workersHousing.some(x => x > 0)))) {
      tierExtras = computeBuildingTierExtras(building, planetTier, fromLevel);
    } else if ([2,3,4,5,6,8,10].includes(specialization ?? -1) && ![3,8].includes(specialization ?? -1)) {
      // Production ohne Fertility
      tierExtras = computeBuildingTierExtras(building, planetTier, toLevel);
    } else {
      tierExtras = computeBuildingTierExtras(building, planetTier, fromLevel);
    }
    for (const extra of tierExtras) {
      if (extra?.amount > 0) {
        tierExtraTotals.set(extra.materialId, (tierExtraTotals.get(extra.materialId) ?? 0) + extra.amount)
      }
    }
  }

  // 3. Beide Summen zusammenführen
  materialTotals.forEach((amount, id) => {
    totals.set(id, amount)
  })
  tierExtraTotals.forEach((amount, id) => {
    totals.set(id, (totals.get(id) ?? 0) + amount)
  })

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
