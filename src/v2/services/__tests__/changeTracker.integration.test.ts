import { describe, it, expect, beforeEach } from 'vitest'
import { createChangeTracker } from '../changeTracker'
import { getChange } from '../changeStorage'
import { useTodoList } from '../todoListService'

describe('Change Tracker Integration with Storage', () => {
  let tracker: ReturnType<typeof createChangeTracker>

  beforeEach(() => {
    const { clear } = useTodoList()
    clear()
    tracker = createChangeTracker()
  })

  it('should generate and register changeId for building level changes', () => {
    tracker.trackBuildingChange(
      1,
      'building-123',
      5,
      2,
      4
    )

    const { todoGroups } = useTodoList()
    const changes = todoGroups.value.flatMap(g => g.steps.flatMap(s => s.changes))

    expect(changes.length).toBeGreaterThan(0)
    const change = changes[0]
    expect(change.id).toBeDefined()
    expect(change.details?.changeId).toBeDefined()

    // Verify the change is registered in storage
    const storedChange = getChange(change.id)
    expect(storedChange).toBeDefined()
    expect(storedChange?.type).toBe('buildingLevel')
    expect(storedChange?.targetId).toBe('building-123')
    expect(storedChange?.originalValue).toBe(2)
    expect(storedChange?.newValue).toBe(4)
  })

  it('should generate unique IDs for consecutive changes', () => {
    tracker.trackBuildingChange(1, 'building-123', 5, 2, 4)
    tracker.trackBuildingChange(1, 'building-456', 6, 1, 3)

    const { todoGroups } = useTodoList()
    const changes = todoGroups.value.flatMap(g => g.steps.flatMap(s => s.changes))

    expect(changes.length).toBeGreaterThan(0)
    const ids = changes.map(c => c.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should register recipe count changes', () => {
    tracker.trackRecipeCountChange(1, 10, 1, 2)

    const { todoGroups } = useTodoList()
    const changes = todoGroups.value.flatMap(g => g.steps.flatMap(s => s.changes))

    expect(changes.length).toBeGreaterThan(0)
    const change = changes[0]

    const storedChange = getChange(change.id)
    expect(storedChange?.type).toBe('recipeCount')
  })

  it('should register technology changes', () => {
    tracker.trackTechnologyChange(1, 'Armor Plates', 5, 6)

    const { todoGroups } = useTodoList()
    const changes = todoGroups.value.flatMap(g => g.steps.flatMap(s => s.changes))

    expect(changes.length).toBeGreaterThan(0)
    const change = changes[0]

    // Technology changes should have changeId
    expect(change.id).toBeDefined()
    expect(change.details?.changeId).toBeDefined()
  })

  it('should register stock changes', () => {
    tracker.trackStockChange(1, 12, 100, 150)

    const { todoGroups } = useTodoList()
    const changes = todoGroups.value.flatMap(g => g.steps.flatMap(s => s.changes))

    expect(changes.length).toBeGreaterThan(0)
    const change = changes[0]

    const storedChange = getChange(change.id)
    expect(storedChange?.type).toBe('stock')
    expect(storedChange?.originalValue).toBe(100)
    expect(storedChange?.newValue).toBe(150)
  })
})
