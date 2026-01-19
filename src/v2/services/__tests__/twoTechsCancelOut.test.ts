/**
 * Test for cancel-out behavior with multiple technologies
 * Reproduces user scenario: Tech1 1→2, Tech2 1→2, Tech2 2→1
 * Expected: Only Tech2 should be removed from TODO, Tech1 should remain
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useTodoListService, resetTodoListService } from '../todoListService'
import { createChangeTracker } from '../changeTracker'

describe('TODO List - Two Technologies Cancel-Out', () => {
  beforeEach(() => {
    resetTodoListService()
    localStorage.clear()
  })

  it('should only remove Tech2 when it cancels out, keeping Tech1 intact', () => {
    console.log('=== Test: Two Technologies Cancel-Out ===\n')

    const todoList = useTodoListService()
    const tracker = createChangeTracker()

    // Step 1: Tech 1 (Chemistry) from 1 → 2
    console.log('1. Adding Tech 1 (Chemistry): 1 → 2')
    tracker.trackTechnologyChange(1, 'Chemistry', 1, 2)

    expect(todoList.allSteps.value.length).toBe(1)
    expect(todoList.allSteps.value[0]?.description).toContain('Chemistry')
    expect(todoList.allSteps.value[0]?.description).toContain('1 → 2')
    console.log('   ✓ Tech 1 added, total steps:', todoList.allSteps.value.length)

    // Step 2: Tech 2 (Construction) from 1 → 2
    console.log('\n2. Adding Tech 2 (Construction): 1 → 2')
    tracker.trackTechnologyChange(2, 'Construction', 1, 2)

    expect(todoList.allSteps.value.length).toBe(2)
    const steps = todoList.allSteps.value
    expect(steps[0]?.description).toContain('Chemistry')
    expect(steps[1]?.description).toContain('Construction')
    console.log('   ✓ Tech 2 added, total steps:', todoList.allSteps.value.length)

    // Step 3: Tech 2 (Construction) back from 2 → 1 (cancel out)
    console.log('\n3. Reverting Tech 2 (Construction): 2 → 1 (should cancel out)')
    tracker.trackTechnologyChange(2, 'Construction', 2, 1)

    // Expected: Only Tech 1 (Chemistry) should remain
    expect(todoList.allSteps.value.length).toBe(1)
    expect(todoList.allSteps.value[0]?.description).toContain('Chemistry')
    expect(todoList.allSteps.value[0]?.description).toContain('1 → 2')

    console.log('   ✓ Tech 2 cancelled out, Tech 1 remains')
    console.log('   ✓ Total steps:', todoList.allSteps.value.length)
    console.log('   ✓ Remaining step:', todoList.allSteps.value[0]?.description)
    console.log('\n=== Test Passed ===')
  })

  it('should handle reverse order: Tech1 cancels out while Tech2 remains', () => {
    console.log('=== Test: Reverse Order Cancel-Out ===\n')

    const todoList = useTodoListService()
    const tracker = createChangeTracker()

    // Step 1: Tech 1 (Chemistry) from 1 → 2
    console.log('1. Adding Tech 1 (Chemistry): 1 → 2')
    tracker.trackTechnologyChange(1, 'Chemistry', 1, 2)

    // Step 2: Tech 2 (Construction) from 1 → 2
    console.log('2. Adding Tech 2 (Construction): 1 → 2')
    tracker.trackTechnologyChange(2, 'Construction', 1, 2)

    expect(todoList.allSteps.value.length).toBe(2)

    // Step 3: Tech 1 (Chemistry) back from 2 → 1 (cancel out)
    console.log('3. Reverting Tech 1 (Chemistry): 2 → 1 (should cancel out)')
    tracker.trackTechnologyChange(1, 'Chemistry', 2, 1)

    // Expected: Only Tech 2 (Construction) should remain
    expect(todoList.allSteps.value.length).toBe(1)
    expect(todoList.allSteps.value[0]?.description).toContain('Construction')
    expect(todoList.allSteps.value[0]?.description).toContain('1 → 2')

    console.log('   ✓ Tech 1 cancelled out, Tech 2 remains')
    console.log('   ✓ Total steps:', todoList.allSteps.value.length)
    console.log('   ✓ Remaining step:', todoList.allSteps.value[0]?.description)
    console.log('\n=== Test Passed ===')
  })

  it('should handle three technologies with middle one cancelling out', () => {
    console.log('=== Test: Three Technologies, Middle Cancels ===\n')

    const todoList = useTodoListService()
    const tracker = createChangeTracker()

    // Add three technologies
    console.log('1. Adding Tech 1 (Chemistry): 1 → 2')
    tracker.trackTechnologyChange(1, 'Chemistry', 1, 2)

    console.log('2. Adding Tech 2 (Construction): 1 → 2')
    tracker.trackTechnologyChange(2, 'Construction', 1, 2)

    console.log('3. Adding Tech 3 (Agriculture): 1 → 2')
    tracker.trackTechnologyChange(3, 'Agriculture', 1, 2)

    expect(todoList.allSteps.value.length).toBe(3)

    // Cancel out the middle one (Tech 2)
    console.log('4. Reverting Tech 2 (Construction): 2 → 1 (should cancel out)')
    tracker.trackTechnologyChange(2, 'Construction', 2, 1)

    // Expected: Tech 1 and Tech 3 should remain
    expect(todoList.allSteps.value.length).toBe(2)
    const steps = todoList.allSteps.value
    expect(steps[0]?.description).toContain('Chemistry')
    expect(steps[1]?.description).toContain('Agriculture')

    console.log('   ✓ Tech 2 cancelled out, Tech 1 and 3 remain')
    console.log('   ✓ Total steps:', todoList.allSteps.value.length)
    console.log('   ✓ Remaining steps:')
    steps.forEach((s, i) => console.log(`     ${i + 1}. ${s.description}`))
    console.log('\n=== Test Passed ===')
  })
})
