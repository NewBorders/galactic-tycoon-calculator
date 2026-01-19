import { describe, it, expect } from 'vitest'
import { computeTechnologyResearchCost } from '../manualCosts'
import { loadGameData } from '@/v2/services/gamedata/service'

describe('Technology Costs - User Verified Wiki Values', () => {
  // All examples use TotalTechnologies = 19
  const TOTAL_TECH = 19

  it('should return 66 research data for level 0→1 (TotalTech=19)', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost = computeTechnologyResearchCost(1, 0, 1, gameData, TOTAL_TECH)
    console.log('Level 0→1 cost:', cost)
    expect(cost).toContain('66')
    expect(cost).toContain('Research Data')
  })

  it('should return 80 research data for level 1→2 (TotalTech=19)', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost = computeTechnologyResearchCost(1, 1, 2, gameData, TOTAL_TECH)
    console.log('Level 1→2 cost:', cost)
    expect(cost).toContain('80')
    expect(cost).toContain('Research Data')
  })

  it('should return 127 research data for level 3→4 (TotalTech=19)', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost = computeTechnologyResearchCost(1, 3, 4, gameData, TOTAL_TECH)
    console.log('Level 3→4 cost:', cost)
    expect(cost).toContain('127')
    expect(cost).toContain('Research Data')
  })

  it('should return 107 research data + 156 advanced research data for level 9→10 (TotalTech=19)', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost = computeTechnologyResearchCost(1, 9, 10, gameData, TOTAL_TECH)
    console.log('Level 9→10 cost:', cost)
    expect(cost).toContain('107')
    expect(cost).toContain('Research Data')
    expect(cost).toContain('156')
    expect(cost).toContain('Advanced Research Data')
  })

  it('should show all levels to diagnose the issue (TotalTech=19)', async () => {
    const { data: gameData } = await loadGameData(true)

    for (let level = 0; level <= 10; level++) {
      const cost = computeTechnologyResearchCost(1, level, level + 1, gameData, TOTAL_TECH)
      console.log(`Level ${level}→${level + 1}: ${cost}`)
    }
  })
})
