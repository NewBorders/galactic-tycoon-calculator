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

  it('includes material names and amounts for Tier 1', async () => {
    const { data } = await loadGameData(true)
    const tracker = createChangeTracker(data)

    tracker.trackNewBase('Test Base T1', 1)

    const { todoGroups } = useTodoList()
    const steps = todoGroups.value.flatMap(g => g.steps)
    expect(steps.length).toBeGreaterThan(0)

    const change = steps[0]?.changes[0]
    expect(change?.type).toBe('base')

    const cost = String(change?.details?.materialsCost || '')
    expect(cost.length).toBeGreaterThan(0)

    // From gamedata.fallback baseBuildingCost
    expect(cost).toContain('250× Concrete')
    expect(cost).toContain('30× Construction Kit')
    expect(cost).toContain('10× Construction Vehicle')
    expect(cost).toContain('30× Prefab Kit')
  })

  it('supports different tiers (currently same mapping)', async () => {
    const { data } = await loadGameData(true)
    const tracker = createChangeTracker(data)

    tracker.trackNewBase('Test Base T3', 3)

    const { todoGroups } = useTodoList()
    const steps = todoGroups.value.flatMap(g => g.steps)
    expect(steps.length).toBeGreaterThan(0)

    const change = steps[steps.length - 1]?.changes[0]
    expect(change?.type).toBe('base')

    const cost = String(change?.details?.materialsCost || '')
    expect(cost).toContain('250× Concrete')
    expect(cost).toContain('30× Construction Kit')
    expect(cost).toContain('10× Construction Vehicle')
    expect(cost).toContain('30× Prefab Kit')
  })
})
