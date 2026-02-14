import { describe, it, expect, beforeEach } from 'vitest'
import { usePlanningMode } from '../state'
import { useWorldData } from '../../worldData'
import { clearAllWorldData } from '../../worldData/storage'
import type { PlayerBase } from '../../playerBases'

describe('Planning Mode State', () => {
  beforeEach(() => {
    clearAllWorldData()
    
    // Ensure planning mode is exited
    const { isPlanningActive, exitPlanningMode } = usePlanningMode()
    if (isPlanningActive.value) {
      exitPlanningMode(false)
    }
  })

  describe('enter and exit planning', () => {
    it('should not be in planning mode initially', () => {
      const { isPlanningActive } = usePlanningMode()
      expect(isPlanningActive.value).toBe(false)
    })

    it('should enter planning mode and create snapshot', () => {
      const { updateCurrent } = useWorldData()
      const { enterPlanningMode, isPlanningActive, plannedBases } = usePlanningMode()
      
      // Set up current state
      updateCurrent({
        bases: [
          { id: 'base-1', planetId: 1, name: 'Original', buildings: [], recipes: [] },
        ] as PlayerBase[],
      })
      
      // Enter planning
      enterPlanningMode()
      
      expect(isPlanningActive.value).toBe(true)
      expect(plannedBases.value).toHaveLength(1)
      expect(plannedBases.value[0].name).toBe('Original')
    })

    it('should not create duplicate planning session', () => {
      const { enterPlanningMode, isPlanningActive, plannedBases, addHistoryEntry } = usePlanningMode()
      const { updateCurrent } = useWorldData()
      
      updateCurrent({
        bases: [{ id: 'base-1', planetId: 1, name: 'Original', buildings: [], recipes: [] }] as PlayerBase[],
      })
      
      enterPlanningMode()
      
      // Make a change
      plannedBases.value[0].name = 'Changed'
      addHistoryEntry({ type: 'UPDATE_BUILDING', id: 'b1', field: 'level', oldValue: 1, newValue: 2 }, 'base-1', 'Test', {}, {})
      
      const historyLength1 = usePlanningMode().history.value.length
      
      enterPlanningMode() // Try again - should do nothing
      
      const historyLength2 = usePlanningMode().history.value.length
      
      // History should be preserved, not reset
      expect(historyLength1).toBe(1)
      expect(historyLength2).toBe(1)
      expect(isPlanningActive.value).toBe(true)
      expect(plannedBases.value[0].name).toBe('Changed')
    })

    it('should exit planning mode and discard changes', () => {
      const { updateCurrent } = useWorldData()
      const { enterPlanningMode, discardPlanning, isPlanningActive, plannedBases } = usePlanningMode()
      
      updateCurrent({
        bases: [{ id: 'base-1', planetId: 1, name: 'Original', buildings: [], recipes: [] }] as PlayerBase[],
      })
      
      enterPlanningMode()
      
      // Modify planned bases
      plannedBases.value[0].name = 'Modified'
      
      // Discard
      discardPlanning()
      
      expect(isPlanningActive.value).toBe(false)
      
      // Current should be unchanged
      const { current } = useWorldData()
      expect(current.value.bases[0].name).toBe('Original')
    })

    it('should apply planning changes to current state', () => {
      const { updateCurrent, current } = useWorldData()
      const { enterPlanningMode, applyPlanning, plannedBases } = usePlanningMode()
      
      updateCurrent({
        bases: [{ id: 'base-1', planetId: 1, name: 'Original', buildings: [], recipes: [] }] as PlayerBase[],
      })
      
      enterPlanningMode()
      
      // Modify planned state
      plannedBases.value[0].name = 'Applied'
      
      // Apply changes
      applyPlanning()
      
      // Current should now have the changes
      expect(current.value.bases[0].name).toBe('Applied')
    })
  })

  describe('planned state isolation', () => {
    it('should isolate planned changes from current', () => {
      const { updateCurrent, current } = useWorldData()
      const { enterPlanningMode, plannedBases } = usePlanningMode()
      
      updateCurrent({
        bases: [{ id: 'base-1', planetId: 1, name: 'Current', buildings: [], recipes: [] }] as PlayerBase[],
      })
      
      enterPlanningMode()
      
      // Modify planned
      plannedBases.value[0].name = 'Planned'
      
      // Current should be unchanged
      expect(current.value.bases[0].name).toBe('Current')
      expect(plannedBases.value[0].name).toBe('Planned')
    })

    it('should return current bases when not planning', () => {
      const { updateCurrent, current } = useWorldData()
      const { plannedBases } = usePlanningMode()
      
      updateCurrent({
        bases: [{ id: 'base-1', planetId: 1, buildings: [], recipes: [] }] as PlayerBase[],
      })
      
      // plannedBases should point to current when not planning
      expect(plannedBases.value).toBe(current.value.bases)
    })
  })

  describe('history tracking', () => {
    it('should track change count', () => {
      const { enterPlanningMode, addHistoryEntry, changeCount } = usePlanningMode()
      
      enterPlanningMode()
      
      expect(changeCount.value).toBe(0)
      
      addHistoryEntry(
        { type: 'ADD_BUILDING', buildingId: 1, level: 3 },
        'base-1',
        'Added building',
        {},
        {}
      )
      
      expect(changeCount.value).toBe(1)
      
      addHistoryEntry(
        { type: 'UPDATE_RECIPE', id: 'recipe-1', field: 'count', oldValue: 1, newValue: 5 },
        'base-1',
        'Updated recipe',
        {},
        {}
      )
      
      expect(changeCount.value).toBe(2)
    })

    it('should limit history to 50 entries', () => {
      const { enterPlanningMode, addHistoryEntry, history } = usePlanningMode()
      
      enterPlanningMode()
      
      // Add 60 entries
      for (let i = 0; i < 60; i++) {
        addHistoryEntry(
          { type: 'ADD_BUILDING', buildingId: i, level: 1 },
          'base-1',
          `Entry ${i}`,
          {},
          {}
        )
      }
      
      // Should be capped at 50
      expect(history.value).toHaveLength(50)
      
      // Should keep most recent entries (10-59, oldest 0-9 removed)
      expect(history.value[0].description).toBe('Entry 10')
      expect(history.value[49].description).toBe('Entry 59')
    })

    it('should truncate future history after undo', () => {
      const { enterPlanningMode, addHistoryEntry, history } = usePlanningMode()
      const { worldData } = useWorldData()
      
      enterPlanningMode()
      
      // Add 3 entries
      addHistoryEntry({ type: 'ADD_BUILDING', buildingId: 1, level: 1 }, 'base-1', 'Entry 1', {}, {})
      addHistoryEntry({ type: 'ADD_BUILDING', buildingId: 2, level: 1 }, 'base-1', 'Entry 2', {}, {})
      addHistoryEntry({ type: 'ADD_BUILDING', buildingId: 3, level: 1 }, 'base-1', 'Entry 3', {}, {})
      
      expect(history.value).toHaveLength(3)
      
      // Simulate undo by moving index back
      if (worldData.value.planning) {
        worldData.value.planning.historyIndex = 1
      }
      
      // Add new entry - should truncate entries 2 and 3
      addHistoryEntry({ type: 'ADD_BUILDING', buildingId: 4, level: 1 }, 'base-1', 'Entry 4', {}, {})
      
      expect(history.value).toHaveLength(3) // Entry 1, 2, and new Entry 4
      expect(history.value[2].description).toBe('Entry 4')
    })
  })

  describe('technology planning', () => {
    it('should clone technology state for planning', () => {
      const { updateCurrent, current } = useWorldData()
      const { enterPlanningMode, plannedTechnology } = usePlanningMode()
      
      updateCurrent({ technology: { 1: 5, 2: 3 } })
      
      enterPlanningMode()
      
      expect(plannedTechnology.value).toEqual({ 1: 5, 2: 3 })
      expect(plannedTechnology.value).not.toBe(current.value.technology)
    })

    it('should apply technology changes', () => {
      const { updateCurrent, current } = useWorldData()
      const { enterPlanningMode, plannedTechnology, applyPlanning } = usePlanningMode()
      
      updateCurrent({ technology: { 1: 5 } })
      enterPlanningMode()
      
      // Modify planning
      plannedTechnology.value[1] = 10
      plannedTechnology.value[2] = 3
      
      applyPlanning()
      
      expect(current.value.technology).toEqual({ 1: 10, 2: 3 })
    })
  })

  describe('persistence', () => {
    it('should persist planning state across reload', () => {
      const { updateCurrent } = useWorldData()
      const { enterPlanningMode, plannedBases, addHistoryEntry } = usePlanningMode()
      
      updateCurrent({
        bases: [{ id: 'base-1', planetId: 1, buildings: [], recipes: [] }] as PlayerBase[],
      })
      
      enterPlanningMode()
      
      plannedBases.value[0].name = 'Planned Name'
      
      addHistoryEntry(
        { type: 'UPDATE_BUILDING', id: 'b1', field: 'level', oldValue: 1, newValue: 3 },
        'base-1',
        'Upgraded building',
        {},
        {}
      )
      
      // Simulate reload
      const { isPlanningActive: isPlanningActive2, plannedBases: plannedBases2, changeCount: changeCount2 } = usePlanningMode()
      
      expect(isPlanningActive2.value).toBe(true)
      expect(plannedBases2.value[0].name).toBe('Planned Name')
      expect(changeCount2.value).toBe(1)
    })
  })
})
