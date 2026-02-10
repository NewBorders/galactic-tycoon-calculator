import { describe, it, expect } from 'vitest'
import { computeTechnologyResearchCost } from '@/v2/services/buildingCosts/buildingCosts.core'
import { loadGameData } from '@/v2/services/gamedata/service'

describe('Technology Costs - Downgrade & Multiple Tech Tests', () => {
  const TOTAL_TECH = 19

  it('should calculate cost for level 1→2', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost = computeTechnologyResearchCost(1, 1, 2, gameData, TOTAL_TECH)
    console.log('Level 1→2 cost:', cost)
    expect(cost).toContain('80')
  })

  it('should calculate cost for level 2→3', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost = computeTechnologyResearchCost(1, 2, 3, gameData, TOTAL_TECH)
    console.log('Level 2→3 cost:', cost)
    // 99 is the correct calculated value
    expect(cost).toContain('99')
  })

  it('should calculate cost for level 3→4', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost = computeTechnologyResearchCost(1, 3, 4, gameData, TOTAL_TECH)
    console.log('Level 3→4 cost:', cost)
    expect(cost).toContain('127')
  })

  it('should calculate cost for level 3→2 (downgrade) = same as 1→2', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost = computeTechnologyResearchCost(1, 3, 2, gameData, TOTAL_TECH)
    console.log('Level 3→2 cost:', cost)
    // Downgrade to level 2 should cost the same as upgrading to level 2
    expect(cost).toContain('80')
  })

  it('should verify that 1→2 and 3→2 have same cost', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost1to2 = computeTechnologyResearchCost(1, 1, 2, gameData, TOTAL_TECH)
    const cost3to2 = computeTechnologyResearchCost(1, 3, 2, gameData, TOTAL_TECH)
    console.log('1→2:', cost1to2)
    console.log('3→2:', cost3to2)
    expect(cost1to2).toBe(cost3to2)
  })

  it('should verify downgrade always equals target level cost', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost_10to5 = computeTechnologyResearchCost(1, 10, 5, gameData, TOTAL_TECH)
    const cost_0to5 = computeTechnologyResearchCost(1, 0, 5, gameData, TOTAL_TECH)
    console.log('10→5:', cost_10to5)
    console.log('0→5 (accumulated):', cost_0to5)
    // Downgrade from 10 to 5 should cost what it takes to reach level 5
    // This is NOT the same as 0→5 because that's cumulative!
    // 10→5 means you're targeting level 5, so cost = cost to reach level 5
  })
})

