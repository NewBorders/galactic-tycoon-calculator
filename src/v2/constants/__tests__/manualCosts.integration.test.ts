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
    it('Barracks: Tier 2, Level 1 (Objekt)', () => {
      const building = dummyBuilding({ name: 'Barracks', workersHousing: { worker: 100, technician: 0, engineer: 0, scientist: 0 } })
      const extras = computeBuildingTierExtras(building, 2, 1)
      expect(extras[0].amount).toBe(4)
    })
    it('Barracks: Tier 2, Level 2 (Objekt)', () => {
      const building = dummyBuilding({ name: 'Barracks', workersHousing: { worker: 100, technician: 0, engineer: 0, scientist: 0 } })
      const extras = computeBuildingTierExtras(building, 2, 2)
      expect(extras[0].amount).toBe(5)
    })
  it('Barracks: Tier 2, Level 1', () => {
    const building = dummyBuilding({ name: 'Barracks', workersHousing: [100,0,0,0] })
    const extras = computeBuildingTierExtras(building, 2, 1)
    expect(extras[0].amount).toBe(4)
  })
  it('Barracks: Tier 2, Level 2', () => {
    const building = dummyBuilding({ name: 'Barracks', workersHousing: [100,0,0,0] })
    const extras = computeBuildingTierExtras(building, 2, 2)
    expect(extras[0].amount).toBe(5)
  })
  it('Warehouse: Tier 2, Level 1', () => {
    const building = dummyBuilding({ name: 'Warehouse', specialization: 0 })
    const extras = computeBuildingTierExtras(building, 2, 1)
    expect(extras[0].amount).toBe(2)
  })
  it('Warehouse: Tier 2, Level 2', () => {
    const building = dummyBuilding({ name: 'Warehouse', specialization: 0 })
    const extras = computeBuildingTierExtras(building, 2, 2)
    expect(extras[0].amount).toBe(3)
  })
  it('Food Processing Plant: Tier 2, Level 1', () => {
    const building = dummyBuilding({ name: 'Food Processing Plant', specialization: 2 })
    const extras = computeBuildingTierExtras(building, 2, 1)
    expect(extras[0].amount).toBe(1)
  })
  it('Food Processing Plant: Tier 2, Level 2', () => {
    const building = dummyBuilding({ name: 'Food Processing Plant', specialization: 2 })
    const extras = computeBuildingTierExtras(building, 2, 2)
    expect(extras[0].amount).toBe(2)
  })
  it('Refinery: Tier 2, Level 1', () => {
    const building = dummyBuilding({ name: 'Refinery', specialization: 2 })
    const extras = computeBuildingTierExtras(building, 2, 1)
    expect(extras[0].amount).toBe(1)
  })
  it('Refinery: Tier 2, Level 2', () => {
    const building = dummyBuilding({ name: 'Refinery', specialization: 2 })
    const extras = computeBuildingTierExtras(building, 2, 2)
    expect(extras[0].amount).toBe(2)
  })
  it('Farm: Tier 2, Level 1', () => {
    const building = dummyBuilding({ name: 'Farm', specialization: 3 })
    const extras = computeBuildingTierExtras(building, 2, 1)
    expect(extras[0].amount).toBe(8)
  })
  it('Farm: Tier 2, Level 2', () => {
    const building = dummyBuilding({ name: 'Farm', specialization: 3 })
    const extras = computeBuildingTierExtras(building, 2, 2)
    expect(extras[0].amount).toBe(10)
  })
  it('Mine: Tier 2, Level 1', () => {
    const building = dummyBuilding({ name: 'Mine', specialization: 4 })
    const extras = computeBuildingTierExtras(building, 2, 1)
    expect(extras[0].amount).toBe(8)
  })
  it('Mine: Tier 2, Level 2', () => {
    const building = dummyBuilding({ name: 'Mine', specialization: 4 })
    const extras = computeBuildingTierExtras(building, 2, 2)
    expect(extras[0].amount).toBe(10)
  })
  it('Production (fertility): Tier 4, Level 1', () => {
    const building = dummyBuilding({ specialization: 3 })
    const extras = computeBuildingTierExtras(building, 4, 1)
    expect(extras[0].amount).toBe(8)
  })
  it('Production (no fertility): Tier 2, Level 2', () => {
    const building = dummyBuilding({ specialization: 2 })
    const extras = computeBuildingTierExtras(building, 2, 2)
    expect(extras[0].amount).toBe(2)
  })
  it('Production (no fertility): Tier 2, Level 1', () => {
    const building = dummyBuilding({ specialization: 2 })
    const extras = computeBuildingTierExtras(building, 2, 1)
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
