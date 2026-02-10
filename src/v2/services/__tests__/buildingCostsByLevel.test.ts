import { describe, it, expect } from 'vitest'
import { buildingCostsRepository } from '@/v2/services/buildingCosts/buildingCosts.service'

function getBuildingMine(): { tier: number; constructionMaterials: Array<{ id: number; amount: number }>; workersHousing: number[] | null }  {
  return {
    tier: 1,
    constructionMaterials: [
      { id: 93, amount: 1 }, // amenities
      { id: 62, amount: 5 }, // construction kit
      { id: 92, amount: 4 }, // prefab kit
      { id: 90, amount: 8 }, // pressure sealant kit
    ],
    workersHousing: null,
  }
}

function getBuildingRefinery(): { tier: number; constructionMaterials: Array<{ id: number; amount: number }>; workersHousing: number[] | null }  {
  return {
    tier: 1,
    constructionMaterials: [
      { id: 93, amount: 2 }, // amenities
      { id: 62, amount: 3 }, // construction kit
      { id: 92, amount: 5 }, // prefab kit
      { id: 90, amount: 1 }, // pressure sealant kit
    ],
    workersHousing: null,
  }
}

describe('Mine Baukosten Planet Tier 1', () => {
  const building = getBuildingMine()
  const planetTier = 1

  it('Stufe 1 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 1)
    expect(cost.get(93)).toBe(1) // Amenities
    expect(cost.get(62)).toBe(5) // Construction Kit
    expect(cost.get(92)).toBe(4) // Prefab Kit
  })

  it('Stufe 2 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 2)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(6) // Construction Kit
    expect(cost.get(92)).toBe(5) // Prefab Kit
  })

  it('Stufe 3 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 3)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(7) // Construction Kit
    expect(cost.get(92)).toBe(6) // Prefab Kit
  })

  it('Stufe 4 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 4)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(8) // Construction Kit
    expect(cost.get(92)).toBe(7) // Prefab Kit
  })

  it('Stufe 5 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 5)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(9) // Construction Kit
    expect(cost.get(92)).toBe(7) // Prefab Kit
  })

  it('Stufe 6 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 6)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(10) // Construction Kit
    expect(cost.get(92)).toBe(8) // Prefab Kit
  })

  it('Stufe 7 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 7)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(11) // Construction Kit
    expect(cost.get(92)).toBe(9) // Prefab Kit
  })

  it('Stufe 8 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 8)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(12) // Construction Kit
    expect(cost.get(92)).toBe(10) // Prefab Kit
  })

  it('Stufe 9 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 9)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(13) // Construction Kit
    expect(cost.get(92)).toBe(10) // Prefab Kit
  })

  it('Stufe 10 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 10)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(13) // Construction Kit
    expect(cost.get(92)).toBe(11) // Prefab Kit
  })
})

describe('Refinery Baukosten Planet Tier 1', () => {
  const refinery = getBuildingRefinery()
  const planetTier = 1

  it('Stufe 1 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 1)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(3) // Construction Kit
    expect(cost.get(92)).toBe(5) // Prefab Kit
  })

  it('Stufe 2 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 2)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(4) // Construction Kit
    expect(cost.get(92)).toBe(6) // Prefab Kit
  })

  it('Stufe 3 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 3)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(5) // Construction Kit
    expect(cost.get(92)).toBe(7) // Prefab Kit
  })

  it('Stufe 4 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 4)
    expect(cost.get(93)).toBe(4) // Amenities
    expect(cost.get(62)).toBe(5) // Construction Kit
    expect(cost.get(92)).toBe(8) // Prefab Kit
  })

  it('Stufe 5 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 5)
    expect(cost.get(93)).toBe(4) // Amenities
    expect(cost.get(62)).toBe(6) // Construction Kit
    expect(cost.get(92)).toBe(9) // Prefab Kit
  })

  it('Stufe 6 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 6)
    expect(cost.get(93)).toBe(4) // Amenities
    expect(cost.get(62)).toBe(6) // Construction Kit
    expect(cost.get(92)).toBe(10) // Prefab Kit
  })

  it('Stufe 7 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 7)
    expect(cost.get(93)).toBe(5) // Amenities
    expect(cost.get(62)).toBe(7) // Construction Kit
    expect(cost.get(92)).toBe(11) // Prefab Kit
  })

  it('Stufe 8 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 8)
    expect(cost.get(93)).toBe(5) // Amenities
    expect(cost.get(62)).toBe(7) // Construction Kit
    expect(cost.get(92)).toBe(12) // Prefab Kit
  })

  it('Stufe 9 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 9)
    expect(cost.get(93)).toBe(5) // Amenities
    expect(cost.get(62)).toBe(8) // Construction Kit
    expect(cost.get(92)).toBe(13) // Prefab Kit
  })

  it('Stufe 10 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 10)
    expect(cost.get(93)).toBe(6) // Amenities
    expect(cost.get(62)).toBe(8) // Construction Kit
    expect(cost.get(92)).toBe(13) // Prefab Kit
  })
})


describe('Mine Baukosten Planet Tier 2', () => {
  const building = getBuildingMine()
  const planetTier = 2

  it('Stufe 1 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 1)
    expect(cost.get(93)).toBe(1) // Amenities
    expect(cost.get(62)).toBe(5) // Construction Kit
    expect(cost.get(92)).toBe(4) // Prefab Kit
    expect(cost.get(90)).toBe(8) // Pressure Sealant Kit
  })

  it('Stufe 2 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 2)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(6) // Construction Kit
    expect(cost.get(92)).toBe(5) // Prefab Kit
    expect(cost.get(90)).toBe(10) // Pressure Sealant Kit
  })

  it('Stufe 3 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 3)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(7) // Construction Kit
    expect(cost.get(92)).toBe(6) // Prefab Kit
    expect(cost.get(90)).toBe(11) // Pressure Sealant Kit
  })

  it('Stufe 4 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 4)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(8) // Construction Kit
    expect(cost.get(92)).toBe(7) // Prefab Kit
    expect(cost.get(90)).toBe(13) // Pressure Sealant Kit
  })

  it('Stufe 5 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 5)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(9) // Construction Kit
    expect(cost.get(92)).toBe(7) // Prefab Kit
    expect(cost.get(90)).toBe(14) // Pressure Sealant Kit
  })

  it('Stufe 6 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 6)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(10) // Construction Kit
    expect(cost.get(92)).toBe(8) // Prefab Kit
    expect(cost.get(90)).toBe(16) // Pressure Sealant Kit
  })

  it('Stufe 7 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 7)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(11) // Construction Kit
    expect(cost.get(92)).toBe(9) // Prefab Kit
    expect(cost.get(90)).toBe(17) // Pressure Sealant Kit
  })

  it('Stufe 8 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 8)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(12) // Construction Kit
    expect(cost.get(92)).toBe(10) // Prefab Kit
    expect(cost.get(90)).toBe(19) // Pressure Sealant Kit
  })

  it('Stufe 9 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 9)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(13) // Construction Kit
    expect(cost.get(92)).toBe(10) // Prefab Kit
    expect(cost.get(90)).toBe(20) // Pressure Sealant Kit
  })

  it('Stufe 10 Mine', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(building, planetTier, 10)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(13) // Construction Kit
    expect(cost.get(92)).toBe(11) // Prefab Kit
    expect(cost.get(90)).toBe(21) // Pressure Sealant Kit
  })
})

describe('Refinery Baukosten Planet Tier 2', () => {
  const refinery = getBuildingRefinery()
  const planetTier = 2

  it('Stufe 1 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 1)
    expect(cost.get(93)).toBe(2) // Amenities
    expect(cost.get(62)).toBe(3) // Construction Kit
    expect(cost.get(92)).toBe(5) // Prefab Kit
    expect(cost.get(90)).toBe(1) // Pressure Sealant Kit
  })

  it('Stufe 2 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 2)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(4) // Construction Kit
    expect(cost.get(92)).toBe(6) // Prefab Kit
    expect(cost.get(90)).toBe(2) // Pressure Sealant Kit
  })

  it('Stufe 3 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 3)
    expect(cost.get(93)).toBe(3) // Amenities
    expect(cost.get(62)).toBe(5) // Construction Kit
    expect(cost.get(92)).toBe(7) // Prefab Kit
    expect(cost.get(90)).toBe(2) // Pressure Sealant Kit
  })

  it('Stufe 4 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 4)
    expect(cost.get(93)).toBe(4) // Amenities
    expect(cost.get(62)).toBe(5) // Construction Kit
    expect(cost.get(92)).toBe(8) // Prefab Kit
    expect(cost.get(90)).toBe(2) // Pressure Sealant Kit
  })

  it('Stufe 5 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 5)
    expect(cost.get(93)).toBe(4) // Amenities
    expect(cost.get(62)).toBe(6) // Construction Kit
    expect(cost.get(92)).toBe(9) // Prefab Kit
    expect(cost.get(90)).toBe(2) // Pressure Sealant Kit
  })

  it('Stufe 6 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 6)
    expect(cost.get(93)).toBe(4) // Amenities
    expect(cost.get(62)).toBe(6) // Construction Kit
    expect(cost.get(92)).toBe(10) // Prefab Kit
    expect(cost.get(90)).toBe(2) // Pressure Sealant Kit
  })

  it('Stufe 7 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 7)
    expect(cost.get(93)).toBe(5) // Amenities
    expect(cost.get(62)).toBe(7) // Construction Kit
    expect(cost.get(92)).toBe(11) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Stufe 8 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 8)
    expect(cost.get(93)).toBe(5) // Amenities
    expect(cost.get(62)).toBe(7) // Construction Kit
    expect(cost.get(92)).toBe(12) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Stufe 9 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 9)
    expect(cost.get(93)).toBe(5) // Amenities
    expect(cost.get(62)).toBe(8) // Construction Kit
    expect(cost.get(92)).toBe(13) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Stufe 10 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 10)
    expect(cost.get(93)).toBe(6) // Amenities
    expect(cost.get(62)).toBe(8) // Construction Kit
    expect(cost.get(92)).toBe(13) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Stufe 11 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 11)
    expect(cost.get(93)).toBe(6) // Amenities
    expect(cost.get(62)).toBe(9) // Construction Kit
    expect(cost.get(92)).toBe(14) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Stufe 12 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 12)
    expect(cost.get(93)).toBe(6) // Amenities
    expect(cost.get(62)).toBe(9) // Construction Kit
    expect(cost.get(92)).toBe(15) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Stufe 13 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 13)
    expect(cost.get(93)).toBe(6) // Amenities
    expect(cost.get(62)).toBe(9) // Construction Kit
    expect(cost.get(92)).toBe(15) // Prefab Kit
    expect(cost.get(90)).toBe(3) // Pressure Sealant Kit
  })

  it('Stufe 14 Refinery', () => {
    const cost = buildingCostsRepository.getSingleLevelCost(refinery, planetTier, 14)
    expect(cost.get(93)).toBe(7) // Amenities
    expect(cost.get(62)).toBe(10) // Construction Kit
    expect(cost.get(92)).toBe(16) // Prefab Kit
    expect(cost.get(90)).toBe(4) // Pressure Sealant Kit
  })
})

// TODO test warehouse and barracks on tier 2 planet
