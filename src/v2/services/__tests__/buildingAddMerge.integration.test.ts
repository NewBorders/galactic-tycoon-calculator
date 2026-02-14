import { describe, it, expect, beforeEach } from 'vitest'
import { createChangeTracker } from '../changeTracker'
import { loadGameData } from '../gamedata/service'
import { useTodoList } from '../todoListService'

describe('Todo List - Building add + upgrade merge', () => {
  beforeEach(() => {
    const { clear } = useTodoList()
    clear()
  })

  it('merges added building with subsequent level change', async () => {
    const { data } = await loadGameData(true)
    const tracker = createChangeTracker(data)

    const building = data.buildings.find(b => b.name === 'Colony Barracks')
    const planet = data.planets.find(p => p.tier === 1)

    if (!building || !planet) {
      throw new Error('Colony Barracks or Tier 1 planet not found')
    }

    tracker.trackAddBuilding(planet.id, building.id, 'building-merge', 1)
    tracker.trackBuildingChange(planet.id, 'building-merge', building.id, 1, 2)

    const { todoGroups } = useTodoList()
    const steps = todoGroups.value.flatMap(g => g.steps)
    const changes = steps.flatMap(s => s.changes)

    expect(changes).toHaveLength(1)
    expect(changes[0].description).toContain('Colony Barracks added')
    expect(changes[0].description).toContain('Level 2')
  })
})
