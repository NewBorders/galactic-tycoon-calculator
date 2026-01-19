/**
 * Integration test: Building downgrades should reduce costs in TODO list
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createChangeTracker } from '../changeTracker'
import { useTodoList } from '../todoListService'
import { loadGameData } from '../gamedata/service'

describe('Building Downgrade Costs', () => {
  beforeEach(() => {
    // Clear TODO list
    const { clear } = useTodoList()
    clear()
  })

  it('should recalculate building costs when merging upgrades and downgrades', async () => {
    const { data } = await loadGameData(true)
    const tracker = createChangeTracker(data)
    
    // Find a tier-1 building with construction materials
    const building = data.buildings.find(b => b.tier === 1 && b.constructionMaterials && b.constructionMaterials.length > 0)
    const planet = data.planets.find(p => p.tier === 1)
    
    if (!building || !planet) {
      throw new Error('Could not find suitable building and planet for test')
    }
    
    const { todoGroups } = useTodoList()

    // Step 1: Upgrade from 1 to 2
    tracker.trackBuildingChange(planet.id, 'building-123', building.id, 1, 2)
    
    let steps = todoGroups.value.flatMap(g => g.steps)
    expect(steps.length).toBeGreaterThan(0)
    let changes = steps.flatMap(s => s.changes)
    expect(changes).toHaveLength(1)
    expect(changes[0].description).toContain('Level 1 → 2')

    // Extract cost from first change
    const cost1 = changes[0].details.materialsCost as string
    const cost1Amount = parseInt(cost1.match(/(\d+)×/)?.[1] ?? '0')
    
    console.log('Step 1 - Upgrade 1→2:', cost1)

    // Step 2: Upgrade from 2 to 3 (should merge to 1→3, cost should be 2x cost1)
    tracker.trackBuildingChange(planet.id, 'building-123', building.id, 2, 3)

    steps = todoGroups.value.flatMap(g => g.steps)
    changes = steps.flatMap(s => s.changes)
    expect(changes).toHaveLength(1) // Should be merged
    expect(changes[0].description).toContain('Level 1 → 3')

    const cost2 = changes[0].details.materialsCost as string
    const cost2Amount = parseInt(cost2.match(/(\d+)×/)?.[1] ?? '0')
    
    console.log('Step 2 - Merged 1→3:', cost2)
    expect(cost2Amount).toBe(cost1Amount * 2)

    // Step 3: Downgrade from 3 to 2 (should merge back to 1→2, cost should equal cost1)
    tracker.trackBuildingChange(planet.id, 'building-123', building.id, 3, 2)

    steps = todoGroups.value.flatMap(g => g.steps)
    changes = steps.flatMap(s => s.changes)
    expect(changes).toHaveLength(1) // Should still be merged
    expect(changes[0].description).toContain('Level 1 → 2')

    const cost3 = changes[0].details.materialsCost as string
    const cost3Amount = parseInt(cost3.match(/(\d+)×/)?.[1] ?? '0')

    console.log('Step 3 - After downgrade 3→2, merged result 1→2:', cost3)

    // After downgrade, should be back to original cost (1→2), NOT accumulated
    expect(cost3Amount).toBe(cost1Amount)
    
    // Verify it's NOT showing double or triple accumulated costs
    expect(cost3Amount).not.toBe(cost1Amount * 2)
    expect(cost3Amount).not.toBe(cost1Amount * 3)
  })

  it('should properly cancel out when upgrade is followed by downgrade to same level', async () => {
    const { data } = await loadGameData(true)
    const tracker = createChangeTracker(data)
    
    const building = data.buildings.find(b => b.tier === 1 && b.constructionMaterials && b.constructionMaterials.length > 0)
    const planet = data.planets.find(p => p.tier === 1)
    
    if (!building || !planet) {
      throw new Error('Could not find suitable building and planet for test')
    }
    
    const { todoGroups } = useTodoList()

    // Upgrade from 1 to 2
    tracker.trackBuildingChange(planet.id, 'building-123', building.id, 1, 2)
    
    let steps = todoGroups.value.flatMap(g => g.steps)
    let changes = steps.flatMap(s => s.changes)
    expect(changes).toHaveLength(1)
    
    // Downgrade back from 2 to 1 (should cancel out)
    tracker.trackBuildingChange(planet.id, 'building-123', building.id, 2, 1)
    
    steps = todoGroups.value.flatMap(g => g.steps)
    changes = steps.flatMap(s => s.changes)
    
    console.log('Changes after cancel:', changes.length, changes.map(c => c.description))
    
    // Should have 0 changes (cancelled out)
    expect(changes.length).toBe(0)
  })
})
