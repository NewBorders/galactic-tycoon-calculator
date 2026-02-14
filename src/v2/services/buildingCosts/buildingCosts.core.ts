export type WorkersHousingInput =
	| number[]
	| { worker?: number; technician?: number; engineer?: number; scientist?: number }
	| null
	| undefined

export type BuildingCostInput = {
	constructionMaterials: Array<{ id: number; amount: number }>
	name?: string
	specialization?: number
	workersHousing?: WorkersHousingInput
}

function normalizeWorkersHousing(workersHousing: WorkersHousingInput): number[] | null {
	if (!workersHousing) return null
	if (Array.isArray(workersHousing)) return workersHousing
	if (typeof workersHousing === 'object') {
		return [
			workersHousing.worker ?? 0,
			workersHousing.technician ?? 0,
			workersHousing.engineer ?? 0,
			workersHousing.scientist ?? 0,
		]
	}
	return null
}

function getTierExtraMaterialId(planetTier: number): number | undefined {
	if (planetTier === 2) return 90
	if (planetTier === 3) return 120
	if (planetTier === 4) return 121
	return undefined
}

function getTierExtraBaseAmount(building: BuildingCostInput): number {
	const name = building.name?.toLowerCase() || ''
	const specialization = building.specialization
	const workersHousing = normalizeWorkersHousing(building.workersHousing)

	if (name.includes('warehouse')) {
		return 2
	}

	if (
		['barracks', 'residential', 'comfort', 'stella', 'suite'].some(hn => name.includes(hn)) ||
		(Array.isArray(workersHousing) && workersHousing.some(x => x > 0))
	) {
		return 4
	}

	if ([2, 5, 6, 7, 10].includes(specialization ?? -1)) {
		return 1
	}

	return 8
}

export function computeSingleBuildingLevelCost(
	building: BuildingCostInput,
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

	const extraMaterialId = getTierExtraMaterialId(planetTier)
	if (extraMaterialId) {
		const baseAmount = getTierExtraBaseAmount(building)
		const extraAmount = Math.ceil(baseAmount * growth)
		if (extraAmount > 0) {
			result.set(extraMaterialId, (result.get(extraMaterialId) ?? 0) + extraAmount)
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
	const totals = new Map<number, number>()

	const start = Math.min(fromLevel, toLevel)
	const end = Math.max(fromLevel, toLevel)

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

	materialTotals.forEach((amount, id) => {
		totals.set(id, amount)
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
