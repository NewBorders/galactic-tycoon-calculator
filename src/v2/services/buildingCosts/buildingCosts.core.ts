export function computeSingleBuildingLevelCost(
	building: { constructionMaterials: Array<{ id: number; amount: number }> },
	planetTier: number,
	level: number
): Map<number, number> {
	const result = new Map<number, number>()
	const growth = level === 1 ? 1 : getBuildingGrowthMultiplier(level)

  // TODO: add extra costs for planet tier > 1

	for (const cm of building.constructionMaterials ?? []) {
		const amount = Math.ceil((cm?.amount ?? 0) * growth)
		if (amount > 0) {
			result.set(cm.id, amount)
		}
	}
	return result
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
		workersHousing?:
			| number[]
			| { worker?: number; technician?: number; engineer?: number; scientist?: number }
			| null
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
	building: {
		constructionMaterials: Array<{ id: number; amount: number }>
		tier?: number
		workersHousing?:
			| number[]
			| { worker?: number; technician?: number; engineer?: number; scientist?: number }
			| null
		name?: string
		specialization?: number
	},
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
			const tierExtras = computeBuildingTierExtras(building, planetTier, 1)
			for (const extra of tierExtras) {
				if (extra?.amount > 0) {
					tierExtraTotals.set(extra.materialId, (tierExtraTotals.get(extra.materialId) ?? 0) + extra.amount)
				}
			}
		} else {
			for (let lvl = 1; lvl <= toLevel; lvl++) {
				const tierExtras = computeBuildingTierExtras(building, planetTier, lvl)
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
		let normalizedHousing = workersHousing
		if (
			normalizedHousing &&
			!Array.isArray(normalizedHousing) &&
			typeof normalizedHousing === 'object' &&
			normalizedHousing !== null &&
			'worker' in normalizedHousing
		) {
			const wh = normalizedHousing as { worker?: number; technician?: number; engineer?: number; scientist?: number }
			normalizedHousing = [
				wh.worker ?? 0,
				wh.technician ?? 0,
				wh.engineer ?? 0,
				wh.scientist ?? 0,
			]
		}

		let tierExtras: Array<{ materialId: number; amount: number }> = []
		if (
			['barracks', 'residential', 'comfort', 'stella', 'suite'].some(hn => name.includes(hn)) ||
			(Array.isArray(normalizedHousing) && normalizedHousing.some(x => x > 0))
		) {
			tierExtras = computeBuildingTierExtras(building, planetTier, fromLevel)
		} else if ([2, 3, 4, 5, 6, 8, 10].includes(specialization ?? -1) && ![3, 8].includes(specialization ?? -1)) {
			tierExtras = computeBuildingTierExtras(building, planetTier, toLevel)
		} else {
			tierExtras = computeBuildingTierExtras(building, planetTier, fromLevel)
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
