import { describe, it, expect } from 'vitest'
import { computeBuildingUpgradeCost, getBuildingGrowthMultiplier } from '@/v2/services/buildingCosts/buildingCosts.core'
import { loadGameData } from '@/v2/services/gamedata/service'

describe('Building Cost Debug - Wiki Formula Verification', () => {
  it('should calculate growth multiplier correctly for levels 1-8', () => {
    // Formula: 0.1 × (level-1) + 1.07^(level-1)
    const multipliers = []
    for (let level = 1; level <= 8; level++) {
      const multiplier = getBuildingGrowthMultiplier(level)
      const expected = 0.1 * (level - 1) + Math.pow(1.07, level - 1)
      multipliers.push({ level, multiplier, expected })
      expect(multiplier).toBeCloseTo(expected, 5)
    }

    console.log('\n=== Growth Multipliers (Wiki Formula) ===')
    console.log('Level | Multiplier | Formula')
    multipliers.forEach(({ level, multiplier }) => {
      console.log(`  ${level}   | ${multiplier.toFixed(4)}   | 0.1×${level - 1} + 1.07^${level - 1}`)
    })
  })

  it('should calculate growth multiplier correctly for levels 9-19', () => {
    // Formula: 0.7 + (1.07 ^ 7) + (((level-1) - 6) ^ 1.03) - (0.95 × ((level-1) - 6))
    const multipliers = []
    for (let level = 9; level <= 19; level++) {
      const multiplier = getBuildingGrowthMultiplier(level)
      const expected = 0.7 + Math.pow(1.07, 7) + Math.pow((level-1) - 6, 1.03) - (0.95 * ((level-1) - 6))
      multipliers.push({ level, multiplier, expected })
      expect(multiplier).toBeCloseTo(expected, 5)
    }

    console.log('\n=== Growth Multipliers (Wiki Formula) ===')
    console.log('Level | Multiplier | Formula')
    multipliers.forEach(({ level, multiplier }) => {
      console.log(`  ${level}   | ${multiplier.toFixed(4)}   | 0.7 + 1.07^7 + (${level - 7})^1.03 - 0.95×(${level - 7})`)
    })
  })


  it('should calculate Refinery upgrade costs correctly', async () => {
    const { data: gameData } = await loadGameData(true)
    const refinery = gameData.buildings.find(b => b.name === 'Refinery')

    if (!refinery) {
      throw new Error('Refinery not found in game data')
    }

    // Verify Wiki formula output
    // Note: User reported 4x Amenities, 5× Construction Kit and 8× Prefab Kit for Refinery Level 3→4 on Tier 1 planet
    // Official Wiki formula (0.1×(level-1) + 1.07^(level-1))

    // Test Level 1→2
    // - Level 2 multiplier: (0.1×(2-1) + 1.07^(2-1)) = 1.17
    // - Amenities: ceil(2 × 1.17) = ceil(2.34) = 3
    // - Construction Kit: ceil(3 × 1.17) = ceil(3.51) = 4
    // - Prefab Kit: ceil(5 × 1.17) = ceil(5.85) = 6
    const cost1to2 = computeBuildingUpgradeCost(refinery, 1, 1, 2, gameData)
    expect(cost1to2).toContain('3× Amenities')
    expect(cost1to2).toContain('4× Construction Kit')
    expect(cost1to2).toContain('6× Prefab Kit')

    // Test Level 3→4
    // - Level 4 multiplier: (0.1×(4-1) + 1.07^(4-1)) = 1.525043
    // - Amenities: ceil(2 × 1.525043) = ceil(3.05) = 4
    // - Construction Kit: ceil(3 × 1.525043) = ceil(4.58) = 5
    // - Prefab Kit: ceil(5 × 1.525043) = ceil(7.63) = 8
    const cost3to4 = computeBuildingUpgradeCost(refinery, 1, 3, 4, gameData)
    expect(cost3to4).toContain('4× Amenities')
    expect(cost3to4).toContain('5× Construction Kit')
    expect(cost3to4).toContain('8× Prefab Kit')
  })

  it('should calculate costs for multiple upgrade levels', async () => {
    const { data: gameData } = await loadGameData(true)
    const refinery = gameData.buildings.find(b => b.name === 'Refinery')

    if (!refinery) {
      throw new Error('Refinery not found in game data')
    }

    console.log('\n=== Refinery Upgrade Costs (All Levels) ===')
    for (let level = 1; level <= 8; level++) {
      const cost = computeBuildingUpgradeCost(refinery, 1, level - 1, level, gameData)
      const multiplier = getBuildingGrowthMultiplier(level)
      console.log(`\nLevel ${level - 1}→${level} (multiplier: ${multiplier.toFixed(4)}):`)
      console.log(`  ${cost}`)
    }
  })

  it('should handle Headquarters with reversed growth formula', async () => {
    const { data: gameData } = await loadGameData(true)
    const headquarters = gameData.buildings.find(b => b.name?.toLowerCase().includes('headquarters'))

    if (!headquarters) {
      console.log('\nHeadquarters not found in game data')
      return
    }

    console.log('\n=== Headquarters Costs (0.8^level formula) ===')
    for (let level = 1; level <= 4; level++) {
      const cost = computeBuildingUpgradeCost(headquarters, 1, level - 1, level, gameData)
      const multiplier = Math.pow(0.8, level)
      console.log(`\nLevel ${level - 1}→${level} (multiplier: ${multiplier.toFixed(4)}):`)
      console.log(`  ${cost}`)
    }
  })
})
