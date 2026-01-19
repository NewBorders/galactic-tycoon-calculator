/**
 * Integration test: TODO list auto-completes when API data updates
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useTodoList, syncTodoListWithApiData, resetTodoListService } from '../todoListService'
import { loadGameData } from '../gamedata/service'

describe('TODO List Sync with API Data', () => {
  beforeEach(() => {
    resetTodoListService()
    const { clear } = useTodoList()
    clear()
  })

  it('should auto-complete technology TODO when API level reaches target', async () => {
    await loadGameData(true)
    const { addChange, todoGroups } = useTodoList()

    // Manually add a technology upgrade change
    addChange({
      type: 'technology',
      description: 'Chemistry: Level 1 → 3',
      details: {
        techId: 1,
        from: 1,
        to: 3,
      },
    })

    // Verify TODO was added
    expect(todoGroups.value).toHaveLength(1)
    const initialStep = todoGroups.value[0]?.steps[0]
    expect(initialStep?.changes[0]?.description).toContain('Level 1 → 3')

    // Simulate API data showing technology level 3 has been reached
    syncTodoListWithApiData({
      technology: {
        1: 3, // Chemistry at level 3
      },
    })

    // TODO should be removed (completed)
    expect(todoGroups.value).toHaveLength(0)
    console.log('✓ Technology TODO auto-completed')
  })

  it('should auto-complete building TODO when API level reaches target', async () => {
    const { data: gameData } = await loadGameData(true)
    const { addChange, todoGroups } = useTodoList()

    // Create a building change
    const refinery = gameData.buildings.find((b) => b.name === 'Refinery')
    const planet = gameData.planets.find((p) => p.tier === 1)

    if (!refinery || !planet) {
      throw new Error('Refinery or planet not found')
    }

    addChange({
      type: 'building',
      description: `${refinery.name}: Level 1 → 4`,
      planetId: planet.id,
      details: {
        buildingId: refinery.id,
        from: 1,
        to: 4,
      },
    })

    // Verify TODO was added
    expect(todoGroups.value).toHaveLength(1)
    expect(todoGroups.value[0]?.steps).toHaveLength(1)

    // Simulate API data showing building has reached level 4
    syncTodoListWithApiData({
      buildings: [
        {
          buildingId: refinery.id,
          level: 4,
          planetId: planet.id,
        },
      ],
    })

    // TODO should be removed (completed)
    expect(todoGroups.value).toHaveLength(0)
    console.log('✓ Building TODO auto-completed')
  })

  it('should not remove TODO if API level has not reached target', async () => {
    await loadGameData(true)
    const { addChange, todoGroups } = useTodoList()

    // Add a technology upgrade to level 5
    addChange({
      type: 'technology',
      description: 'Technology: Level 1 → 5',
      details: {
        techId: 1,
        from: 1,
        to: 5,
      },
    })

    expect(todoGroups.value).toHaveLength(1)

    // Simulate API data showing only level 3
    syncTodoListWithApiData({
      technology: {
        1: 3, // Only level 3, target is 5
      },
    })

    // TODO should still be there
    expect(todoGroups.value).toHaveLength(1)
    expect(todoGroups.value[0]?.steps).toHaveLength(1)
    console.log('✓ TODO kept when target not reached')
  })

  it('should handle multiple TODOs and only complete matching ones', async () => {
    await loadGameData(true)
    const { addChange, todoGroups } = useTodoList()

    // Add multiple technology changes
    addChange({
      type: 'technology',
      description: 'Chemistry: Level 1 → 2',
      details: {
        techId: 1,
        from: 1,
        to: 2,
      },
    })

    addChange({
      type: 'technology',
      description: 'Construction: Level 1 → 3',
      details: {
        techId: 2,
        from: 1,
        to: 3,
      },
    })

    expect(todoGroups.value).toHaveLength(1)
    expect(todoGroups.value[0]?.steps).toHaveLength(2) // Two separate steps (Chemistry and Construction)

    // API shows only Chemistry at level 2
    syncTodoListWithApiData({
      technology: {
        1: 2, // Chemistry at level 2 - completes first TODO
        2: 1, // Construction still at level 1
      },
    })

    // Only Chemistry TODO should be removed, Construction should remain
    expect(todoGroups.value).toHaveLength(1)
    expect(todoGroups.value[0]?.steps).toHaveLength(1)  // Only Construction step remains
    expect(todoGroups.value[0]?.steps[0]?.changes[0]?.details?.to).toBe(3) // Remaining is Construction 1→3
    console.log('✓ Partial completion handled correctly')
    console.log('✓ Partial completion handled correctly')
  })

  it('should sync building upgrades with correct level detection', async () => {
    const { data: gameData } = await loadGameData(true)
    const { addChange, todoGroups } = useTodoList()

    const mine = gameData.buildings.find((b) => b.name === 'Mine')
    const planet = gameData.planets.find((p) => p.tier === 1)

    if (!mine || !planet) {
      throw new Error('Mine or planet not found')
    }

    // Add building upgrade 2→5
    addChange({
      type: 'building',
      description: `${mine.name}: Level 2 → 5`,
      planetId: planet.id,
      details: {
        buildingId: mine.id,
        from: 2,
        to: 5,
      },
    })

    expect(todoGroups.value).toHaveLength(1)

    // API shows mine at level 6 (exceeds target of 5)
    syncTodoListWithApiData({
      buildings: [
        {
          buildingId: mine.id,
          level: 6,
          planetId: planet.id,
        },
      ],
    })

    // Should be completed (API level 6 >= target 5)
    expect(todoGroups.value).toHaveLength(0)
    console.log('✓ Building upgrade with exceeded level completed')
  })
})
