import type { TechnologyMaterial } from './buildingCosts.types';

export function computeSingleBuildingLevelCost(
	building: { constructionMaterials: Array<{ id: number; amount: number }> },
	planetTier: number,
	level: number
): Map<number, number> {
	const result = new Map<number, number>()
	const growth = level === 1 ? 1 : getBuildingGrowthMultiplier(level)
	for (const cm of building.constructionMaterials ?? []) {
		const amount = Math.ceil((cm?.amount ?? 0) * growth)
		if (amount > 0) {
			result.set(cm.id, amount)
		}
	}
	return result
}

function getTechnologyLevelCost(nextLevel: number, totalTechnologies: number): TechnologyMaterial[] {
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
		{ materialId: 120, amount: 40 },
	],
	4: [
		{ materialId: 3, amount: 250 },
		{ materialId: 26, amount: 30 },
		{ materialId: 52, amount: 10 },
		{ materialId: 92, amount: 30 },
		{ materialId: 121, amount: 40 },
	],
}

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
	const name = building.name?.toLowerCase() || ''
	const specialization = building.specialization
	let workersHousing = building.workersHousing
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

	let amount = 0
	if (name.includes('warehouse')) {
		amount = targetLevel === 1 ? 2 : (targetLevel === 2 ? 3 : 1)
	} else if (['barracks', 'residential', 'comfort', 'stella', 'suite'].some(hn => name.includes(hn)) || (Array.isArray(workersHousing) && workersHousing.some(x => x > 0))) {
		amount = targetLevel === 1 ? 4 : (targetLevel === 2 ? 5 : 1)
	} else if (specialization === 4) {
		if (targetLevel === 1) amount = 8;
		else if (targetLevel === 2) amount = 10;
		else if (targetLevel === 3) amount = 11;
		else if (targetLevel === 4) amount = 13;
		else amount = 2;
	} else if (specialization === 3) {
		amount = targetLevel === 1 ? 8 : (targetLevel === 2 ? 10 : 2);
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

export function getBuildingGrowthMultiplier(level: number): number {
	if (level < 2) return 1
	if (level <= 8) {
		const current = level - 1;
		return 0.1 * current + Math.pow(1.07, current)
	}
	const current = level - 1;
	return 0.7 + Math.pow(1.07, 7) + Math.pow(current - 6, 1.03) - (0.95 * (current - 6))
}

export function computeBuildingUpgradeCost(
	building: { constructionMaterials: Array<{ id: number; amount: number }>; tier?: number; workersHousing?: number[] | null; name?: string; specialization?: number },
	planetTier: number,
	fromLevel: number,
	toLevel: number,
	gameData?: { materials: Array<{ id: number; name: string }> }
): string | undefined {
	if (!building || !Number.isFinite(fromLevel) || !Number.isFinite(toLevel) || fromLevel === toLevel) {
		return undefined
	}

	const materialTotals = new Map<number, number>()
	const tierExtraTotals = new Map<number, number>()
	const totals = new Map<number, number>()

	const start = Math.min(fromLevel, toLevel)
	const end = Math.max(fromLevel, toLevel)

	let workersHousing = building.workersHousing
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

	const isHeadquarters = building.name?.toLowerCase().includes('headquarters') ?? false
	if (fromLevel === 0 && toLevel === 1) {
		for (const [id, amount] of computeSingleBuildingLevelCost(building, planetTier, 1)) {
			materialTotals.set(id, amount)
		}
	} else {
		for (let level = start + 1; level <= end; level++) {
			for (const [id, amount] of computeSingleBuildingLevelCost(building, planetTier, level)) {
				materialTotals.set(id, (materialTotals.get(id) ?? 0) + amount)
			}
		}
	}

	if (fromLevel === 0) {
		if (toLevel === 1) {
			const tierExtras = computeBuildingTierExtras(building, planetTier, 1);
			for (const extra of tierExtras) {
				if (extra?.amount > 0) {
					tierExtraTotals.set(extra.materialId, (tierExtraTotals.get(extra.materialId) ?? 0) + extra.amount)
				}
			}
		} else {
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
		const name = building.name?.toLowerCase() || ''
		const specialization = building.specialization
		let workersHousing = building.workersHousing
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

		let tierExtras: Array<{ materialId: number; amount: number }> = [];
		if ((['barracks', 'residential', 'comfort', 'stella', 'suite'].some(hn => name.includes(hn)) || (Array.isArray(workersHousing) && workersHousing.some(x => x > 0)))) {
			tierExtras = computeBuildingTierExtras(building, planetTier, fromLevel);
		} else if ([2,3,4,5,6,8,10].includes(specialization ?? -1) && ![3,8].includes(specialization ?? -1)) {
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

// TODO: technology has nothing to do with building costs, should be moved to a different service/repository
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
			const nextLevel = level + 1
			const materials = getTechnologyLevelCost(nextLevel, runningTotal)
			runningTotal += 1
			for (const mat of materials) {
				const prev = totals.get(mat.materialId) || 0
				totals.set(mat.materialId, prev + mat.amount)
			}
		}
	} else {
		for (let level = 1; level < toLevel; level++) {
			const nextLevel = level + 1
			const materials = getTechnologyLevelCost(nextLevel, runningTotal)
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
