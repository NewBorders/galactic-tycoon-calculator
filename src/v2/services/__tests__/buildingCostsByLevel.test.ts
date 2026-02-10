import { describe, it, expect } from 'vitest'
import { buildingCostsRepository } from '@/v2/services/buildingCosts/buildingCosts.service'
import type { BuildingCostInput } from '@/v2/services/buildingCosts/buildingCosts.core'



function getBuildingMine(): BuildingCostInput {
  return {
    tier: 1,
    specialization: 4,
    constructionMaterials: [
      { id: 93, amount: 1 }, // amenities
      { id: 62, amount: 5 }, // construction kit
      { id: 92, amount: 4 }, // prefab kit
    ],
    workersHousing: null,
  }
}

function getBuildingRefinery(): BuildingCostInput {
  return {
    tier: 1,
    specialization: 6,
    constructionMaterials: [
      { id: 93, amount: 2 }, // amenities
      { id: 62, amount: 3 }, // construction kit
      { id: 92, amount: 5 }, // prefab kit
    ],
    workersHousing: null,
  }
}

describe('Mine costs Planet Tier 1', () => {
  const building = getBuildingMine()
  const planetTier = 1

  it('Level 1 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 1)
    expect(cost.get(93)).toBe(1) // Amenities
    expect(cost.get(62)).toBe(5) // Construction Kit
    expect(cost.get(92)).toBe(4) // Prefab Kit
  })

  it('Level 2 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 2)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(6) // Construction Kit
    expect(cost.get(92)).toBe(5) // Prefab Kit
  })

  it('Level 3 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 3)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(7) // Construction Kit
    expect(cost.get(92)).toBe(6) // Prefab Kit
  })

  it('Level 4 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 4)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(8) // Construction Kit
    expect(cost.get(92)).toBe(7) // Prefab Kit
  })

  it('Level 5 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 5)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(9) // Construction Kit
    expect(cost.get(92)).toBe(7) // Prefab Kit
  })

  it('Level 6 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 6)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(10) // Construction Kit
    expect(cost.get(92)).toBe(8) // Prefab Kit
  })

  it('Level 7 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 7)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(11) // Construction Kit
    expect(cost.get(92)).toBe(9) // Prefab Kit
  })

  it('Level 8 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 8)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(12) // Construction Kit
    expect(cost.get(92)).toBe(10) // Prefab Kit
  })

  it('Level 9 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 9)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(13) // Construction Kit
    expect(cost.get(92)).toBe(10) // Prefab Kit
  })

  it('Level 10 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 10)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(13) // Construction Kit
    expect(cost.get(92)).toBe(11) // Prefab Kit
  })
})

describe('Refinery costs Planet Tier 1', () => {
  const refinery = getBuildingRefinery()
  const planetTier = 1

  it('Level 1 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 1)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(3) // Construction Kit
    expect(cost.get(92)).toBe(5) // Prefab Kit
  })

  it('Level 2 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 2)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(4) // Construction Kit
    expect(cost.get(92)).toBe(6) // Prefab Kit
  })

  it('Level 3 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 3)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(5) // Construction Kit
    expect(cost.get(92)).toBe(7) // Prefab Kit
  })

  it('Level 4 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 4)
    expect(cost.get(93)).toBe(4) // Amenities
    expect(cost.get(62)).toBe(5) // Construction Kit
    expect(cost.get(92)).toBe(8) // Prefab Kit
  })

  it('Level 5 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 5)
    expect(cost.get(93)).toBe(4) // Amenities
    expect(cost.get(62)).toBe(6) // Construction Kit
    expect(cost.get(92)).toBe(9) // Prefab Kit
  })

  it('Level 6 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 6)
    expect(cost.get(93)).toBe(4) // Amenities
    expect(cost.get(62)).toBe(6) // Construction Kit
    expect(cost.get(92)).toBe(10) // Prefab Kit
  })

  it('Level 7 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 7)
    expect(cost.get(93)).toBe(5) // Amenities
    expect(cost.get(62)).toBe(7) // Construction Kit
    expect(cost.get(92)).toBe(11) // Prefab Kit
  })

  it('Level 8 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 8)
    expect(cost.get(93)).toBe(5) // Amenities
    expect(cost.get(62)).toBe(7) // Construction Kit
    expect(cost.get(92)).toBe(12) // Prefab Kit
  })

  it('Level 9 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 9)
    expect(cost.get(93)).toBe(5) // Amenities
    expect(cost.get(62)).toBe(8) // Construction Kit
    expect(cost.get(92)).toBe(13) // Prefab Kit
  })

  it('Level 10 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 10)
    expect(cost.get(93)).toBe(6) // Amenities
    expect(cost.get(62)).toBe(8) // Construction Kit
    expect(cost.get(92)).toBe(13) // Prefab Kit
  })
})

describe('Mine costs Planet Tier 2', () => {
  const building = getBuildingMine()
  const planetTier = 2

  it('Level 1 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 1)
    expect(cost.get(93)).toBe(1) // Amenities
    expect(cost.get(62)).toBe(5) // Construction Kit
    expect(cost.get(92)).toBe(4) // Prefab Kit
    expect(cost.get(90)).toBe(8) // Pressure Sealant Kit
  })

  it('Level 2 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 2)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(6) // Construction Kit
    expect(cost.get(92)).toBe(5) // Prefab Kit
    expect(cost.get(90)).toBe(10) // Pressure Sealant Kit
  })

  it('Level 3 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 3)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(7) // Construction Kit
    expect(cost.get(92)).toBe(6) // Prefab Kit
    expect(cost.get(90)).toBe(11) // Pressure Sealant Kit
  })

  it('Level 4 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 4)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(8) // Construction Kit
    expect(cost.get(92)).toBe(7) // Prefab Kit
    expect(cost.get(90)).toBe(13) // Pressure Sealant Kit
  })

  it('Level 5 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 5)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(9) // Construction Kit
    expect(cost.get(92)).toBe(7) // Prefab Kit
    expect(cost.get(90)).toBe(14) // Pressure Sealant Kit
  })

  it('Level 6 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 6)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(10) // Construction Kit
    expect(cost.get(92)).toBe(8) // Prefab Kit
    expect(cost.get(90)).toBe(16) // Pressure Sealant Kit
  })

  it('Level 7 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 7)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(11) // Construction Kit
    expect(cost.get(92)).toBe(9) // Prefab Kit
    expect(cost.get(90)).toBe(17) // Pressure Sealant Kit
  })

  it('Level 8 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 8)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(12) // Construction Kit
    expect(cost.get(92)).toBe(10) // Prefab Kit
    expect(cost.get(90)).toBe(19) // Pressure Sealant Kit
  })

  it('Level 9 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 9)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(13) // Construction Kit
    expect(cost.get(92)).toBe(10) // Prefab Kit
    expect(cost.get(90)).toBe(20) // Pressure Sealant Kit
  })

  it('Level 10 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 10)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(13) // Construction Kit
    expect(cost.get(92)).toBe(11) // Prefab Kit
    expect(cost.get(90)).toBe(21) // Pressure Sealant Kit
  })
})

describe('Refinery costs Planet Tier 2', () => {
  const refinery = getBuildingRefinery()
  const planetTier = 2

  it('Level 1 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 1)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(3) // Construction Kit
    expect(cost.get(92)).toBe(5) // Prefab Kit
    expect(cost.get(90)).toBe(1) // Pressure Sealant Kit
  })

  it('Level 2 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 2)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(4) // Construction Kit
    expect(cost.get(92)).toBe(6) // Prefab Kit
    expect(cost.get(90)).toBe(2) // Pressure Sealant Kit
  })

  it('Level 3 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 3)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(5) // Construction Kit
    expect(cost.get(92)).toBe(7) // Prefab Kit
    expect(cost.get(90)).toBe(2) // Pressure Sealant Kit
  })

  it('Level 4 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 4)
    expect(cost.get(93)).toBe(4) // Amenities
    expect(cost.get(62)).toBe(5) // Construction Kit
    expect(cost.get(92)).toBe(8) // Prefab Kit
    expect(cost.get(90)).toBe(2) // Pressure Sealant Kit
  })

  it('Level 5 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 5)
    expect(cost.get(93)).toBe(4) // Amenities
    expect(cost.get(62)).toBe(6) // Construction Kit
    expect(cost.get(92)).toBe(9) // Prefab Kit
    expect(cost.get(90)).toBe(2) // Pressure Sealant Kit
  })

  it('Level 6 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 6)
    expect(cost.get(93)).toBe(4) // Amenities
    expect(cost.get(62)).toBe(6) // Construction Kit
    expect(cost.get(92)).toBe(10) // Prefab Kit
    expect(cost.get(90)).toBe(2) // Pressure Sealant Kit
  })

  it('Level 7 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 7)
    expect(cost.get(93)).toBe(5) // Amenities
    expect(cost.get(62)).toBe(7) // Construction Kit
    expect(cost.get(92)).toBe(11) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Level 8 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 8)
    expect(cost.get(93)).toBe(5) // Amenities
    expect(cost.get(62)).toBe(7) // Construction Kit
    expect(cost.get(92)).toBe(12) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Level 9 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 9)
    expect(cost.get(93)).toBe(5) // Amenities
    expect(cost.get(62)).toBe(8) // Construction Kit
    expect(cost.get(92)).toBe(13) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Level 10 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 10)
    expect(cost.get(93)).toBe(6) // Amenities
    expect(cost.get(62)).toBe(8) // Construction Kit
    expect(cost.get(92)).toBe(13) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Level 11 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 11)
    expect(cost.get(93)).toBe(6) // Amenities
    expect(cost.get(62)).toBe(9) // Construction Kit
    expect(cost.get(92)).toBe(14) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Level 12 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 12)
    expect(cost.get(93)).toBe(6) // Amenities
    expect(cost.get(62)).toBe(9) // Construction Kit
    expect(cost.get(92)).toBe(15) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Level 13 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 13)
    expect(cost.get(93)).toBe(6) // Amenities
    expect(cost.get(62)).toBe(9) // Construction Kit
    expect(cost.get(92)).toBe(15) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Level 14 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 14)
    expect(cost.get(93)).toBe(7) // Amenities
    expect(cost.get(62)).toBe(10) // Construction Kit
    expect(cost.get(92)).toBe(16) // Prefab Kit
    expect(cost.get(90)).toBe(4) // Pressure Sealant Kit
  })
})


function getBuildingWarehouse(): BuildingCostInput {
  return {
    tier: 1,
    name: 'Warehouse',
    specialization: 0,
    constructionMaterials: [
      { id: 62, amount: 4 }, // construction kit
      { id: 92, amount: 6 }, // prefab kit
    ],
    workersHousing: null,
  }
}

describe('Warehouse costs Planet Tier 2', () => {
  const building = getBuildingWarehouse()
  const planetTier = 2

  it('Level 1', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 1)
    expect(cost.get(62)).toBe(4) // Construction Kit
    expect(cost.get(92)).toBe(6) // Prefab Kit
    expect(cost.get(90)).toBe(2) // Pressure Sealant Kit
  })

  it('Level 2', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 2)
    expect(cost.get(62)).toBe(5) // Construction Kit
    expect(cost.get(92)).toBe(8) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Level 3', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 3)
    expect(cost.get(62)).toBe(6) // Construction Kit
    expect(cost.get(92)).toBe(9) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Level 4', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 4)
    expect(cost.get(62)).toBe(7) // Construction Kit
    expect(cost.get(92)).toBe(10) // Prefab Kit
    expect(cost.get(90)).toBe(4) // Pressure Sealant Kit
  })
})


function getBuildingBarracks(): BuildingCostInput {
  return {
    tier: 1,
    specialization: 0,
    constructionMaterials: [
      { id: 93, amount: 4 }, // amenities
      { id: 62, amount: 2 }, // construction kit
      { id: 92, amount: 5 }, // prefab kit
    ],
    workersHousing: { worker: 125, technician:0, engineer: 0, scientist: 0 },
  }
}

describe('Barracks costs Planet Tier 2', () => {
  const building = getBuildingBarracks()
  const planetTier = 2

  it('Level 1', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 1)
    expect(cost.get(93)).toBe(4) // Amenities
    expect(cost.get(62)).toBe(2) // Construction Kit
    expect(cost.get(92)).toBe(5) // Prefab Kit
    expect(cost.get(90)).toBe(4) // Pressure Sealant Kit
  })

  it('Level 2', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 2)
    expect(cost.get(93)).toBe(5) // Amenities
    expect(cost.get(62)).toBe(3) // Construction Kit
    expect(cost.get(92)).toBe(6) // Prefab Kit
    expect(cost.get(90)).toBe(5) // Pressure Sealant Kit
  })

  it('Level 3', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 3)
    expect(cost.get(93)).toBe(6) // Amenities
    expect(cost.get(62)).toBe(3) // Construction Kit
    expect(cost.get(92)).toBe(7) // Prefab Kit
    expect(cost.get(90)).toBe(6) // Pressure Sealant Kit
  })

  it('Level 4', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 4)
    expect(cost.get(93)).toBe(7) // Amenities
    expect(cost.get(62)).toBe(4) // Construction Kit
    expect(cost.get(92)).toBe(8) // Prefab Kit
    expect(cost.get(90)).toBe(7) // Pressure Sealant Kit
  })
})
