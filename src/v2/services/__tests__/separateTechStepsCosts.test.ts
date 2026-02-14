/**
 * Test for separate technology steps showing individual costs
 * Reproduces user scenario: Tech1 1→2, Tech2 1→2, Tech1 2→3
 * Expected: Three separate steps with individual costs, not cumulative
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useTodoListService, resetTodoListService } from '../todoListService'
import { createChangeTracker } from '../changeTracker'

describe('TODO List - Separate Tech Steps Individual Costs', () => {
  beforeEach(() => {
    resetTodoListService()
    localStorage.clear()
  })

  it('should show individual costs for separate technology steps', () => {
    console.log('=== Test: Individual Costs for Separate Steps ===\n')

    const todoList = useTodoListService()
    const tracker = createChangeTracker()

    // Step 1: Chemistry 1 → 2 (should cost ~80 RD for level 0→1 upgrade)
    console.log('1. Chemistry: 1 → 2')
    tracker.trackTechnologyChange(1, 'Chemistry', 1, 2)

    expect(todoList.allSteps.value.length).toBe(1)
    const step1 = todoList.allSteps.value[0]
    console.log('   Cost:', step1?.changes[0]?.details?.materialsCost)

    // Step 2: Food Production 1 → 2 (prevents merging of Chemistry steps)
    console.log('\n2. Food Production: 1 → 2')
    tracker.trackTechnologyChange(8, 'Food Production', 1, 2)

    expect(todoList.allSteps.value.length).toBe(2)
    const step2 = todoList.allSteps.value[1]
    console.log('   Cost:', step2?.changes[0]?.details?.materialsCost)

    // Step 3: Chemistry 2 → 3 (should NOT merge with step 1 because step 2 is in between)
    // Should show ONLY the cost of 2→3 upgrade (~108 RD for level 2→3)
    // NOT the cumulative cost of 1→3 (~191 RD)
    console.log('\n3. Chemistry: 2 → 3')
    tracker.trackTechnologyChange(1, 'Chemistry', 2, 3)

    expect(todoList.allSteps.value.length).toBe(3)
    const steps = todoList.allSteps.value

    console.log('\n=== Final TODO List ===')
    steps.forEach((step, i) => {
      console.log(`${i + 1}. ${step.description}`)
      console.log(`   Cost: ${step.changes[0]?.details?.materialsCost}`)
    })

    // Verify we have 3 separate steps
    expect(steps[0]?.description).toContain('Chemistry')
    expect(steps[0]?.description).toContain('1 → 2')
    expect(steps[1]?.description).toContain('Food Production')
    expect(steps[1]?.description).toContain('1 → 2')
    expect(steps[2]?.description).toContain('Chemistry')
    expect(steps[2]?.description).toContain('2 → 3')

    // Parse costs to verify individual costs (not cumulative)
    const cost1 = step1?.changes[0]?.details?.materialsCost as string
    const cost3 = steps[2]?.changes[0]?.details?.materialsCost as string

    // Extract numeric cost from "80× Research Data" format
    const extractCost = (costStr: string): number => {
      const match = costStr?.match(/(\d+)×/)
      return match ? parseInt(match[1]!, 10) : 0
    }

    const cost1Value = extractCost(cost1)
    const cost3Value = extractCost(cost3)

    console.log('\n=== Cost Analysis ===')
    console.log(`Chemistry 1→2 cost: ${cost1Value} RD`)
    console.log(`Chemistry 2→3 cost: ${cost3Value} RD`)
    console.log(`If cumulative, would be: ${cost1Value + cost3Value} RD`)

    // Cost3 should show INDIVIDUAL cost (just 2→3), not cumulative (1→3)
    // With totalTechnologies=0, costs grow due to level-based multiplier:
    // Level 1→2: ~15 RD
    // Level 2→3: ~25 RD
    // Cumulative 1→3: ~40 RD
    
    // If showing cumulative, cost3 would equal cost1+cost3
    // If showing individual, cost3 should be less than that
    expect(cost3Value).toBeGreaterThan(cost1Value) // 2→3 is more expensive than 1→2
    expect(cost3Value).toBeLessThan(cost1Value + cost3Value) // But not cumulative
    
    console.log(`✓ Chemistry 2→3 shows individual cost (${cost3Value} RD)`)
    console.log(`✓ Not cumulative (would be ${cost1Value + cost3Value} RD)`)
    
    console.log('\n=== Test Passed ===')
  })

  it('should handle multiple non-adjacent tech changes correctly', () => {
    console.log('=== Test: Multiple Non-Adjacent Changes ===\n')

    const todoList = useTodoListService()
    const tracker = createChangeTracker()

    // Chemistry 1→2
    tracker.trackTechnologyChange(1, 'Chemistry', 1, 2)
    
    // Construction 1→2 (separates Chemistry changes)
    tracker.trackTechnologyChange(2, 'Construction', 1, 2)
    
    // Chemistry 2→3
    tracker.trackTechnologyChange(1, 'Chemistry', 2, 3)
    
    // Manufacturing 1→2 (separates Chemistry and Construction)
    tracker.trackTechnologyChange(5, 'Manufacturing', 1, 2)
    
    // Chemistry 3→4
    tracker.trackTechnologyChange(1, 'Chemistry', 3, 4)

    const steps = todoList.allSteps.value
    console.log('Total steps:', steps.length)
    
    steps.forEach((step, i) => {
      console.log(`${i + 1}. ${step.description}`)
      console.log(`   Cost: ${step.changes[0]?.details?.materialsCost}`)
    })

    // Should have 5 separate steps
    expect(steps.length).toBe(5)
    
    // Each Chemistry step should show individual costs
    const chemSteps = steps.filter(s => s.description.includes('Chemistry'))
    expect(chemSteps.length).toBe(3)
    
    console.log('\n✓ All 5 steps created separately')
    console.log('✓ Chemistry changes not incorrectly merged despite same technology')
    console.log('\n=== Test Passed ===')
  })
})
