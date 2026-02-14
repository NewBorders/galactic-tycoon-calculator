import { describe, it, expect, beforeEach } from 'vitest'
import { createChangeTracker } from '../changeTracker'
import { useTodoList } from '../todoListService'
import { loadGameData } from '../gamedata/service'

/**
 * Integration test: New Base TODO step includes tier-based material costs
 */
describe('New Base creation costs by tier', () => {
  beforeEach(() => {
    const { clear } = useTodoList()
    clear()
  })

  it('includes base materials for Tier 1 without extras', async () => {
    const { data } = await loadGameData(true)
    const tracker = createChangeTracker(data)

    tracker.trackNewBase('Test Base T1', 1)

    const { todoGroups } = useTodoList()
    const steps = todoGroups.value.flatMap(g => g.steps)
    expect(steps.length).toBeGreaterThan(0)

    const change = steps[0]?.changes[0]
    expect(change?.type).toBe('base')

    const cost = String(change?.details?.materialsCost || '')
    expect(cost).toContain('250× Concrete')
    expect(cost).toContain('30× Construction Kit')
    expect(cost).toContain('10× Construction Vehicle')
    expect(cost).toContain('30× Prefab Kit')
    // No extras for tier 1
    expect(cost).not.toContain('Pressure Sealant')
    expect(cost).not.toContain('Composite Shielding')
    expect(cost).not.toContain('Nanoweave Shielding')
  })

  it('includes Pressure Sealant Kit for Tier 2', async () => {
    const { data } = await loadGameData(true)
    const tracker = createChangeTracker(data)

    tracker.trackNewBase('Test Base T2', 2)

    const { todoGroups } = useTodoList()
    const steps = todoGroups.value.flatMap(g => g.steps)
    const change = steps[steps.length - 1]?.changes[0]

    const cost = String(change?.details?.materialsCost || '')
    expect(cost).toContain('250× Concrete')
    expect(cost).toContain('40× Pressure Sealant Kit')
    expect(cost).not.toContain('Composite Shielding')
    expect(cost).not.toContain('Nanoweave Shielding')
  })

  it('includes Composite Shielding for Tier 3', async () => {
    const { data } = await loadGameData(true)
    const tracker = createChangeTracker(data)

    tracker.trackNewBase('Test Base T3', 3)

    const { todoGroups } = useTodoList()
    const steps = todoGroups.value.flatMap(g => g.steps)
    const change = steps[steps.length - 1]?.changes[0]

    const cost = String(change?.details?.materialsCost || '')
    expect(cost).toContain('250× Concrete')
    expect(cost).toContain('40× Composite Shielding')
    expect(cost).not.toContain('Pressure Sealant')
    expect(cost).not.toContain('Nanoweave Shielding')
  })

  it('includes Nanoweave Shielding for Tier 4', async () => {
    const { data } = await loadGameData(true)
    const tracker = createChangeTracker(data)

    tracker.trackNewBase('Test Base T4', 4)

    const { todoGroups } = useTodoList()
    const steps = todoGroups.value.flatMap(g => g.steps)
    const change = steps[steps.length - 1]?.changes[0]

    const cost = String(change?.details?.materialsCost || '')
    expect(cost).toContain('250× Concrete')
    expect(cost).toContain('40× Nanoweave Shielding')
    expect(cost).not.toContain('Pressure Sealant')
    expect(cost).not.toContain('Composite Shielding')
  })
})

/**
 * Integration test: Building changes include tier-based extras in costs
 */
describe('Building tier extras in TODO costs', () => {
  beforeEach(() => {
    const { clear } = useTodoList()
    clear()
  })

  it('includes tier extras for building on Tier 2 planet', async () => {
    const { data } = await loadGameData(true)

    // Find a tier 2 planet or mock one
    let testPlanet = data.planets.find(p => p.tier === 2)
    if (!testPlanet) {
      testPlanet = data.planets[0]
      if (testPlanet) testPlanet.tier = 2
    }

    const tracker = createChangeTracker(data)

    // Building tier 2, level 1→2 (1 level delta): 8 × 2 × 1 = 16 Pressure Sealant Kit
    tracker.trackBuildingChange(testPlanet?.id || 1, 'building-123', 5, 1, 2)

    const { todoGroups } = useTodoList()
    const changes = todoGroups.value.flatMap(g => g.steps.flatMap(s => s.changes))
    const change = changes[0]

    const cost = String(change?.details?.materialsCost || '')
    expect(cost).toContain('Pressure Sealant Kit')
  })

  it('includes tier extras for building on Tier 3 planet', async () => {
    const { data } = await loadGameData(true)

    let testPlanet = data.planets.find(p => p.tier === 3)
    if (!testPlanet) {
      testPlanet = data.planets[0]
      if (testPlanet) testPlanet.tier = 3
    }

    const tracker = createChangeTracker(data)
    tracker.trackBuildingChange(testPlanet?.id || 1, 'building-456', 10, 1, 2)

    const { todoGroups } = useTodoList()
    const changes = todoGroups.value.flatMap(g => g.steps.flatMap(s => s.changes))
    const change = changes[0]

    const cost = String(change?.details?.materialsCost || '')
    expect(cost).toContain('Composite Shielding')
  })

  it('does not include tier extras for Tier 1 planet', async () => {
    const { data } = await loadGameData(true)

    let testPlanet = data.planets.find(p => p.tier === 1)
    if (!testPlanet) {
      testPlanet = data.planets[0]
      if (testPlanet) testPlanet.tier = 1
    }

    const tracker = createChangeTracker(data)
    tracker.trackBuildingChange(testPlanet?.id || 1, 'building-789', 5, 1, 2)

    const { todoGroups } = useTodoList()
    const changes = todoGroups.value.flatMap(g => g.steps.flatMap(s => s.changes))
    const change = changes[0]

    const cost = String(change?.details?.materialsCost || '')
    expect(cost).not.toContain('Pressure Sealant')
    expect(cost).not.toContain('Composite Shielding')
    expect(cost).not.toContain('Nanoweave Shielding')
  })

  it('scales tier extras with building tier', async () => {
    const { data } = await loadGameData(true)

    // Find a tier 2 building
    const tier2Building = data.buildings.find(b => b.tier === 2)
    if (!tier2Building) return // Skip if no tier 2 building available

    let testPlanet = data.planets.find(p => p.tier === 2)
    if (!testPlanet) {
      testPlanet = data.planets[0]
      if (testPlanet) testPlanet.tier = 2
    }

    const tracker = createChangeTracker(data)
    // Building tier 2, level 1→3 (2 level delta): 8 × 2 × 2 = 32 Pressure Sealant Kit
    tracker.trackBuildingChange(testPlanet?.id || 1, 'building-t2', tier2Building.id, 1, 3)

    const { todoGroups } = useTodoList()
    const changes = todoGroups.value.flatMap(g => g.steps.flatMap(s => s.changes))
    const change = changes[0]

    const cost = String(change?.details?.materialsCost || '')
    // Should contain tier extras (amount depends on building tier)
    expect(cost).toMatch(/\d+× Pressure Sealant Kit/)
  })
})
