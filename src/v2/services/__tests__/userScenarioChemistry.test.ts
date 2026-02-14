import { describe, it, expect, beforeEach } from 'vitest'
import { useTodoList, resetTodoListService } from '../todoListService'
import { createChangeTracker } from '../changeTracker'
import { loadGameData } from '@/v2/services/gamedata/service'
import { clearStorage } from '../changeStorage'

describe('User Scenario - Chemistry Tech Level Changes', () => {
  beforeEach(() => {
    resetTodoListService()
    clearStorage()
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.includes('todoList')) {
        localStorage.removeItem(key)
      }
    })
  })

  it('should handle scenario: 1→2, 2→3, 3→2, 2→3, 3→4, 4→3', async () => {
    const { data: gameData } = await loadGameData(true)
    const tracker = createChangeTracker(gameData)
    const todoList = useTodoList()

    console.log('\n=== Chemistry Tech Scenario ===')

    // Step 1: 1→2 (80 RD)
    console.log('\n1. Planning 1→2...')
    tracker.trackTechnologyChange(1, 'Chemistry', 1, 2)
    let allSteps = todoList.allSteps.value
    console.log(`   Steps: ${allSteps.length}, Cost: ${allSteps[0]?.changes[0]?.details?.materialsCost}`)
    expect(allSteps.length).toBe(1)
    expect(allSteps[0].description).toContain('1 → 2')

    // Step 2: Change to 2→3 (should merge to 1→3 = 80+99)
    console.log('\n2. Changing to 2→3...')
    tracker.trackTechnologyChange(1, 'Chemistry', 2, 3)
    allSteps = todoList.allSteps.value
    console.log(`   Steps: ${allSteps.length}, Cost: ${allSteps[0]?.changes[0]?.details?.materialsCost}`)
    expect(allSteps.length).toBe(1, 'Should still have 1 step (merged)')
    expect(allSteps[0].description).toContain('1 → 3', 'Should show 1→3')

    // Step 3: Downgrade to 3→2 (should replace to show only 80 RD)
    console.log('\n3. Downgrading to 3→2...')
    tracker.trackTechnologyChange(1, 'Chemistry', 3, 2)
    allSteps = todoList.allSteps.value
    console.log(`   Steps: ${allSteps.length}, Description: ${allSteps[0]?.description}, Cost: ${allSteps[0]?.changes[0]?.details?.materialsCost}`)
    expect(allSteps.length).toBe(1, 'Should still have 1 step')
    expect(allSteps[0].description).toContain('1 → 2', 'Should show 1→2 (downgrade)')
    // The cost should now be just 80 (the cost to go from 1→2), not 179

    // Step 4: Upgrade back to 2→3 (should add costs again: 80+99)
    console.log('\n4. Upgrading back to 2→3...')
    tracker.trackTechnologyChange(1, 'Chemistry', 2, 3)
    allSteps = todoList.allSteps.value
    console.log(`   Steps: ${allSteps.length}, Description: ${allSteps[0]?.description}, Cost: ${allSteps[0]?.changes[0]?.details?.materialsCost}`)
    expect(allSteps.length).toBe(1)
    expect(allSteps[0].description).toContain('1 → 3')

    // Step 5: Upgrade to 3→4 (should add 127: 80+99+127)
    console.log('\n5. Upgrading to 3→4...')
    tracker.trackTechnologyChange(1, 'Chemistry', 3, 4)
    allSteps = todoList.allSteps.value
    console.log(`   Steps: ${allSteps.length}, Description: ${allSteps[0]?.description}, Cost: ${allSteps[0]?.changes[0]?.details?.materialsCost}`)
    expect(allSteps.length).toBe(1)
    expect(allSteps[0].description).toContain('1 → 4')

    // Step 6: Downgrade to 4→3 (should replace with cost of 1→3 = 80+99, NOT 99)
    console.log('\n6. Downgrading to 4→3...')
    tracker.trackTechnologyChange(1, 'Chemistry', 4, 3)
    allSteps = todoList.allSteps.value
    const cost4to3 = allSteps[0]?.changes[0]?.details?.materialsCost
    console.log(`   Steps: ${allSteps.length}, Description: ${allSteps[0]?.description}, Cost: ${cost4to3}`)
    expect(allSteps.length).toBe(1)
    expect(allSteps[0].description).toContain('1 → 3')
    // The critical test: 4→3 should have the SAME cost as 1→3, which is 80+99
    // NOT just 99 (single level cost)

    console.log('\n=== Test Complete ===')
  })
})
