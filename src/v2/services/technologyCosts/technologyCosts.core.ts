import type { TechnologyMaterial } from './technologyCosts.types';

function computeTechnologyLevelCost(nextLevel: number, totalTechnologies: number): TechnologyMaterial[] {
  const currentLevel = nextLevel - 1
  const valueMultiplier = Math.pow((currentLevel / 4) + 1, 3)
  const techPenalty = Math.pow(totalTechnologies + 1, 1.015) - totalTechnologies
  const techFlat = totalTechnologies * 3000
  const totalValue = (valueMultiplier * 8000) * techPenalty + techFlat

  const tierPart = nextLevel / 5.0
  const materials: TechnologyMaterial[] = []

  const T1_DIVISOR = 1100
  const T2_DIVISOR = 3000
  const T3_DIVISOR = 6000
  const T4_DIVISOR = 10000

  if (tierPart <= 1.0) {
    const t1Amount = Math.ceil((totalValue * 1.0) / T1_DIVISOR)
    if (t1Amount > 0) {
      materials.push({ materialId: 64, amount: t1Amount })
    }
  } else if (tierPart <= 2.0) {
    const progress = tierPart - 1.0
    const t1Percentage = 0.8 - (0.6 * progress)
    const t2Percentage = 0.2 + (0.6 * progress)

    const t1Amount = Math.ceil((totalValue * t1Percentage) / T1_DIVISOR)
    const t2Amount = Math.ceil((totalValue * t2Percentage) / T2_DIVISOR)

    if (t1Amount > 0) {
      materials.push({ materialId: 64, amount: t1Amount })
    }
    if (t2Amount > 0) {
      materials.push({ materialId: 65, amount: t2Amount })
    }
  } else if (tierPart <= 3.0) {
    const progress = tierPart - 2.0
    const t2Percentage = 0.8 - (0.6 * progress)
    const t3Percentage = 0.2 + (0.6 * progress)

    const t2Amount = Math.ceil((totalValue * t2Percentage) / T2_DIVISOR)
    const t3Amount = Math.ceil((totalValue * t3Percentage) / T3_DIVISOR)

    if (t2Amount > 0) {
      materials.push({ materialId: 65, amount: t2Amount })
    }
    if (t3Amount > 0) {
      materials.push({ materialId: 127, amount: t3Amount })
    }
  } else if (tierPart <= 4.0) {
    const progress = tierPart - 3.0
    const t3Percentage = 0.8 - (0.6 * progress)
    const t4Percentage = 0.2 + (0.6 * progress)

    const t3Amount = Math.ceil((totalValue * t3Percentage) / T3_DIVISOR)
    const t4Amount = Math.ceil((totalValue * t4Percentage) / T4_DIVISOR)

    if (t3Amount > 0) {
      materials.push({ materialId: 127, amount: t3Amount })
    }
    if (t4Amount > 0) {
      materials.push({ materialId: 164, amount: t4Amount })
    }
  } else {
    const t4Amount = Math.ceil((totalValue * 1.0) / T4_DIVISOR)
    if (t4Amount > 0) {
      materials.push({ materialId: 164, amount: t4Amount })
    }
  }

  return materials
}

export function formatTechnologyMaterials(
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

export function computeTechnologyResearchCost(
  techId: number,
  fromLevel: number,
  toLevel: number,
  gameData?: { materials: Array<{ id: number; name: string }> },
  totalTechnologies?: number
): string | undefined {
  if (!Number.isFinite(techId) || !Number.isFinite(fromLevel) || !Number.isFinite(toLevel)) return undefined
  if (toLevel === fromLevel) return undefined

  const currentTotal = totalTechnologies ?? 0
  let runningTotal = currentTotal
  const totals = new Map<number, number>()

  if (toLevel > fromLevel) {
    for (let level = fromLevel; level < toLevel; level++) {
      const levelCost = computeTechnologyLevelCost(level + 1, runningTotal)
      levelCost.forEach(material => {
        const current = totals.get(material.materialId) ?? 0
        totals.set(material.materialId, current + material.amount)
      })
      runningTotal += 1
    }
  } else {
    for (let level = fromLevel; level > toLevel; level--) {
      const levelCost = computeTechnologyLevelCost(level, runningTotal)
      levelCost.forEach(material => {
        const current = totals.get(material.materialId) ?? 0
        totals.set(material.materialId, current + material.amount)
      })
      runningTotal = Math.max(0, runningTotal - 1)
    }
  }

  const list = Array.from(totals.entries()).map(([materialId, amount]) => ({ materialId, amount }))
  return formatTechnologyMaterials(list, gameData)
}
