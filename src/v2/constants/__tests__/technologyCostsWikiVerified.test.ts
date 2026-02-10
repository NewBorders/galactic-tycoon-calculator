import { describe, it, expect } from 'vitest'
import { buildingCostsRepository } from '@/v2/services/buildingCosts/buildingCosts.service'
import { loadGameData } from '@/v2/services/gamedata/service'

describe('Technology Costs - User Verified Wiki Values', () => {
  // All examples use TotalTechnologies = 29
  const TOTAL_TECH = 29

  it('should return 98 research data for level 0→1 (TotalTech=29)', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost = buildingCostsRepository.computeTechnologyResearchCost(1, 0, 1, gameData, TOTAL_TECH)
    console.log('Level 0→1 cost:', cost)
    expect(cost).toContain('98')
    expect(cost).toContain('Research Data')
  })

  it('should return 116 research data for level 1→2 (TotalTech=29)', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost = buildingCostsRepository.computeTechnologyResearchCost(1, 1, 2, gameData, TOTAL_TECH)
    console.log('Level 1→2 cost:', cost)
    expect(cost).toContain('116')
    expect(cost).toContain('Research Data')
  })

  it('should return 180 research data for level 3→4 (TotalTech=29)', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost = buildingCostsRepository.computeTechnologyResearchCost(1, 3, 4, gameData, TOTAL_TECH)
    console.log('Level 3→4 cost:', cost)
    expect(cost).toContain('180')
    expect(cost).toContain('Research Data')
  })

  it('should return 199 research data + 35 advanced research data for level 5→6 (TotalTech=29)', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost = buildingCostsRepository.computeTechnologyResearchCost(1, 5, 6, gameData, TOTAL_TECH)
    console.log('Level 5→6 cost:', cost)
    expect(cost).toContain('199')
    expect(cost).toContain('Research Data')
    expect(cost).toContain('35')
    expect(cost).toContain('Advanced Research Data')
  })

  it('should return 219 advancedresearch data + 86 apex research data for level 11→12 (TotalTech=29)', async () => {
    const { data: gameData } = await loadGameData(true)
    const cost = buildingCostsRepository.computeTechnologyResearchCost(1, 11, 12, gameData, TOTAL_TECH)
    console.log('Level 11→12 cost:', cost)
    expect(cost).toContain('219')
    expect(cost).toContain('Advanced Research Data')
    expect(cost).toContain('86')
    expect(cost).toContain('Apex Research Data')
  })

  it('should show all levels to diagnose the issue (TotalTech=29)', async () => {
    const { data: gameData } = await loadGameData(true)

    for (let level = 0; level <= 10; level++) {
      const cost = buildingCostsRepository.computeTechnologyResearchCost(1, level, level + 1, gameData, TOTAL_TECH)
      console.log(`Level ${level}→${level + 1}: ${cost}`)
    }
  })
})
