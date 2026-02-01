import { describe, it, expect } from 'vitest'
import { computeBuildingTierExtras, computeBuildingUpgradeCost } from '../manualCosts'

const dummyBuilding = (opts: Partial<any> = {}) => ({
  name: opts.name || 'Test',
  specialization: opts.specialization ?? 2,
  tier: opts.tier ?? 1,
  constructionMaterials: opts.constructionMaterials ?? [{ id: 1, amount: 10 }],
  workersHousing: opts.workersHousing ?? null,
})

describe('computeBuildingTierExtras (Integration)', () => {
  it('Warehouse: Tier 2, Level 1', () => {
    const extras = computeBuildingTierExtras(2, 1, { isWarehouse: true })
    expect(extras[0].amount).toBe(2)
  })
  it('Housing: Tier 3, Level 2', () => {
    const extras = computeBuildingTierExtras(3, 2, { isHousing: true })
    expect(extras[0].amount).toBe(4)
  })
  it('Production (fertility): Tier 4, Level 1', () => {
    const extras = computeBuildingTierExtras(4, 1, { isProduction: true, affectedByFertilityOrAbundance: true })
    expect(extras[0].amount).toBe(8)
  })
  it('Production (no fertility): Tier 2, Level 2', () => {
    const extras = computeBuildingTierExtras(2, 2, { isProduction: true, affectedByFertilityOrAbundance: false })
    expect(extras[0].amount).toBe(2)
  })
  it('Production (no fertility): Tier 2, Level 1', () => {
    const extras = computeBuildingTierExtras(2, 1, { isProduction: true, affectedByFertilityOrAbundance: false })
    expect(extras[0].amount).toBe(1)
  })
})

describe('computeBuildingUpgradeCost (Integration)', () => {
  it('Warehouse: Tier 2, Level 1→2', () => {
    const building = dummyBuilding({ name: 'Warehouse', specialization: 0 })
    const cost = computeBuildingUpgradeCost(building, 2, 1, 2)
    expect(cost).toContain('2×')
  })
  it('Housing: Tier 3, Level 1→2', () => {
    const building = dummyBuilding({ workersHousing: [100,0,0,0] })
    const cost = computeBuildingUpgradeCost(building, 3, 1, 2)
    expect(cost).toContain('4×')
  })
  it('Production (fertility): Tier 4, Level 1→2', () => {
    const building = dummyBuilding({ specialization: 3 })
    const cost = computeBuildingUpgradeCost(building, 4, 1, 2)
    expect(cost).toContain('8×')
  })
  it('Production (no fertility): Tier 2, Level 1→2', () => {
    const building = dummyBuilding({ specialization: 2 })
    const cost = computeBuildingUpgradeCost(building, 2, 1, 2)
    expect(cost).toContain('2×')
  })
})
