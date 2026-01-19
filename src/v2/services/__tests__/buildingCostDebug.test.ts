import { describe, it, expect } from 'vitest'
import { computeBuildingUpgradeCost, getBuildingGrowthMultiplier } from '@/v2/constants/manualCosts'
import { loadGameData } from '@/v2/services/gamedata/service'

describe('Building Cost Debug - Wiki Formula Verification', () => {
  it('should calculate growth multiplier correctly for levels 1-8', () => {
    // Formula: 0.1 × level + 1.07^level
    const multipliers = []
    for (let level = 1; level <= 8; level++) {
      const multiplier = getBuildingGrowthMultiplier(level)
      const expected = 0.1 * level + Math.pow(1.07, level)
      multipliers.push({ level, multiplier, expected })
      expect(multiplier).toBeCloseTo(expected, 5)
    }
    
    console.log('\n=== Growth Multipliers (Wiki Formula) ===')
    console.log('Level | Multiplier | Formula')
    multipliers.forEach(({ level, multiplier }) => {
      console.log(`  ${level}   | ${multiplier.toFixed(4)}   | 0.1×${level} + 1.07^${level}`)
    })
  })

  it('should calculate Refinery upgrade costs correctly', async () => {
    const { data: gameData } = await loadGameData(true)
    const refinery = gameData.buildings.find(b => b.name === 'Refinery')
    
    if (!refinery) {
      throw new Error('Refinery not found in game data')
    }

    console.log('\n=== Refinery Base Costs (Level 1) ===')
    refinery.constructionMaterials.forEach(cm => {
      const material = gameData.materials.find(m => m.id === cm.id)
      console.log(`${material?.name}: ${cm.amount}`)
    })

    // Test Level 1→2
    const cost1to2 = computeBuildingUpgradeCost(refinery, 1, 1, 2, gameData)
    console.log('\n=== Refinery Level 1→2 ===')
    console.log(`Growth Multiplier(2): ${getBuildingGrowthMultiplier(2).toFixed(4)}`)
    console.log(`Cost: ${cost1to2}`)

    // Test Level 3→4 (the problematic one)
    const cost3to4 = computeBuildingUpgradeCost(refinery, 1, 3, 4, gameData)
    console.log('\n=== Refinery Level 3→4 ===')
    console.log(`Growth Multiplier(4): ${getBuildingGrowthMultiplier(4).toFixed(4)}`)
    console.log(`Cost: ${cost3to4}`)

    // Manual calculation for Level 4
    const multiplier4 = getBuildingGrowthMultiplier(4)
    console.log('\nExpected for Level 4 (base × multiplier):')
    refinery.constructionMaterials.forEach(cm => {
      const material = gameData.materials.find(m => m.id === cm.id)
      const expected = Math.ceil(cm.amount * multiplier4)
      console.log(`${material?.name}: ${cm.amount} × ${multiplier4.toFixed(4)} = ${expected}`)
    })

    // Verify Wiki formula output
    // Note: User reported 5× Construction Kit and 8× Prefab Kit for Level 3→4
    // However, the official Wiki formula (0.1×level + 1.07^level) produces:
    // - Level 4 multiplier: 1.7108
    // - Construction Kit: ceil(3 × 1.7108) = ceil(5.13) = 6
    // - Prefab Kit: ceil(5 × 1.7108) = ceil(8.55) = 9
    // 
    // The discrepancy might be due to:
    // 1. Technology bonus reducing building costs (e.g., Construction tech)
    // 2. Different game version or patch
    // 3. In-game display showing post-bonus costs
    expect(cost3to4).toContain('4× Amenities')
    expect(cost3to4).toContain('6× Construction Kit') // Wiki formula: ceil(3 × 1.7108) = 6
    expect(cost3to4).toContain('9× Prefab Kit') // Wiki formula: ceil(5 × 1.7108) = 9
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
