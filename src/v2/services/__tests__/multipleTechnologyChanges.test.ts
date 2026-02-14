import { describe, it, expect, beforeEach } from 'vitest'
import { useTodoList, resetTodoListService } from '../todoListService'
import { createChangeTracker } from '../changeTracker'
import { loadGameData } from '@/v2/services/gamedata/service'
import { clearStorage } from '../changeStorage'

describe('TODO List - Multiple Technology Changes', () => {
  beforeEach(() => {
    // Reset the singleton for each test
    // This is needed because useTodoList is a singleton
    resetTodoListService()
    clearStorage()

    // Clear localStorage to reset the todo list state
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.includes('todoList')) {
        localStorage.removeItem(key)
      }
    })
  })

  it('should track two different technologies as separate steps', async () => {
    const { data: gameData } = await loadGameData(true)

    // Create a fresh instance for this test
    const tracker = createChangeTracker(gameData)
    const todoList = useTodoList()

    console.log('\n=== Test: Two Different Technologies ===')

    // Track first tech: Chemistry 1→2
    console.log('Tracking Chemistry 1→2...')
    tracker.trackTechnologyChange(1, 'Chemistry', 1, 2)

    let allSteps = todoList.allSteps.value
    console.log(`After Chemistry: ${allSteps.length} steps`)
    allSteps.forEach((s, i) => {
      console.log(`  Step ${i}: "${s.description}" (${s.changes.length} change(s), id=${s.id})`)
      s.changes.forEach(c => {
        console.log(`    - Change: tech=${c.details?.technologyId}, type=${c.type}`)
      })
    })

    // Track second tech: Construction 3→4
    console.log('\nTracking Construction 3→4...')
    tracker.trackTechnologyChange(2, 'Construction', 3, 4)

    allSteps = todoList.allSteps.value
    console.log(`After Construction: ${allSteps.length} steps`)
    allSteps.forEach((s, i) => {
      console.log(`  Step ${i}: "${s.description}" (${s.changes.length} change(s), id=${s.id})`)
      s.changes.forEach(c => {
        console.log(`    - Change: tech=${c.details?.technologyId}, type=${c.type}`)
      })
    })

    // Verify
    console.log('\nVerifying...')
    expect(allSteps.length).toBe(2, `Should have exactly 2 steps, got ${allSteps.length}`)

    const descriptions = allSteps.map(s => s.description)
    console.log('Descriptions:', descriptions)

    expect(descriptions[0]).toContain('Chemistry')
    expect(descriptions[0]).toContain('1 → 2')

    expect(descriptions[1]).toContain('Construction')
    expect(descriptions[1]).toContain('3 → 4')
  })

  it('should have different technology IDs in separate steps', async () => {
    const { data: gameData } = await loadGameData(true)

    const tracker = createChangeTracker(gameData)
    const todoList = useTodoList()

    console.log('\n=== Test: Different Technology IDs ===')

    // Track both techs
    tracker.trackTechnologyChange(1, 'Chemistry', 1, 2)
    tracker.trackTechnologyChange(2, 'Construction', 3, 4)

    const allSteps = todoList.allSteps.value

    console.log(`Total steps: ${allSteps.length}`)

    // Extract all changes
    const allChanges = allSteps.flatMap(s => s.changes || [])
    console.log(`Total changes: ${allChanges.length}`)
    console.log('Changes detail:')
    allChanges.forEach((c, i) => {
      console.log(`  ${i}: type=${c.type}, techId=${c.details?.technologyId}, desc="${c.description}"`)
    })

    // There should be exactly 2 changes (one per tech)
    expect(allChanges.length).toBe(2, `Expected 2 changes, got ${allChanges.length}`)

    // Both should be technology type
    const techChanges = allChanges.filter(c => c.type === 'technology')
    expect(techChanges.length).toBe(2)

    // Should have different tech IDs
    const techIds = techChanges.map(c => String(c.details?.technologyId))
    expect(techIds[0]).not.toBe(techIds[1])
    expect(techIds[0]).toBe('1')
    expect(techIds[1]).toBe('2')
  })
})
