import { describe, it, expect, beforeEach } from 'vitest'
import { usePlanningHistory } from '../history'
import { usePlanningMode } from '../state'
import { useWorldData } from '../../worldData'
import { clearAllWorldData } from '../../worldData/storage'
import type { PlayerBase } from '../../playerBases'

describe('Planning Mode History (Undo/Redo)', () => {
  beforeEach(() => {
    clearAllWorldData()
    
    // Ensure planning mode is exited
    const { isPlanningActive, exitPlanningMode } = usePlanningMode()
    if (isPlanningActive.value) {
      exitPlanningMode(false)
    }
  })

  describe('undo functionality', () => {
    it('should not undo when not in planning mode', () => {
      const { undo, canUndo } = usePlanningHistory()
      
      expect(canUndo.value).toBe(false)
      const result = undo()
      expect(result).toBe(false)
    })

    it('should not undo when no history', () => {
      const { enterPlanningMode } = usePlanningMode()
      const { undo, canUndo } = usePlanningHistory()
      
      enterPlanningMode()
      
      expect(canUndo.value).toBe(false)
      const result = undo()
      expect(result).toBe(false)
    })

    it('should undo last change', () => {
      const { updateCurrent } = useWorldData()
      const { enterPlanningMode, plannedBases, addHistoryEntry } = usePlanningMode()
      const { undo, canUndo } = usePlanningHistory()
      
      updateCurrent({
        bases: [{ id: 'base-1', planetId: 1, name: 'Original', buildings: [], recipes: [] }] as PlayerBase[],
      })
      
      enterPlanningMode()
      
      // Make change
      const previousState = { name: 'Original' }
      plannedBases.value[0].name = 'Changed'
      const newState = { name: 'Changed' }
      
      addHistoryEntry(
        { type: 'UPDATE_BUILDING', id: 'b1', field: 'level', oldValue: 1, newValue: 3 },
        'base-1',
        'Changed name',
        previousState,
        newState
      )
      
      expect(canUndo.value).toBe(true)
      expect(plannedBases.value[0].name).toBe('Changed')
      
      // Undo
      const result = undo()
      
      expect(result).toBe(true)
      expect(plannedBases.value[0].name).toBe('Original')
      expect(canUndo.value).toBe(false)
    })

    it('should undo multiple changes in sequence', () => {
      const { updateCurrent } = useWorldData()
      const { enterPlanningMode, plannedBases, addHistoryEntry } = usePlanningMode()
      const { undo } = usePlanningHistory()
      
      updateCurrent({
        bases: [{ id: 'base-1', planetId: 1, name: 'V0', buildings: [], recipes: [] }] as PlayerBase[],
      })
      
      enterPlanningMode()
      
      // Change 1
      addHistoryEntry(
        { type: 'UPDATE_BUILDING', id: 'b1', field: 'level', oldValue: 1, newValue: 2 },
        'base-1',
        'Change 1',
        { name: 'V0' },
        { name: 'V1' }
      )
      plannedBases.value[0].name = 'V1'
      
      // Change 2
      addHistoryEntry(
        { type: 'UPDATE_BUILDING', id: 'b1', field: 'level', oldValue: 2, newValue: 3 },
        'base-1',
        'Change 2',
        { name: 'V1' },
        { name: 'V2' }
      )
      plannedBases.value[0].name = 'V2'
      
      // Change 3
      addHistoryEntry(
        { type: 'UPDATE_BUILDING', id: 'b1', field: 'level', oldValue: 3, newValue: 4 },
        'base-1',
        'Change 3',
        { name: 'V2' },
        { name: 'V3' }
      )
      plannedBases.value[0].name = 'V3'
      
      expect(plannedBases.value[0].name).toBe('V3')
      
      // Undo once
      undo()
      expect(plannedBases.value[0].name).toBe('V2')
      
      // Undo twice
      undo()
      expect(plannedBases.value[0].name).toBe('V1')
      
      // Undo third time
      undo()
      expect(plannedBases.value[0].name).toBe('V0')
    })
  })

  describe('redo functionality', () => {
    it('should not redo when no undo history', () => {
      const { enterPlanningMode } = usePlanningMode()
      const { redo, canRedo } = usePlanningHistory()
      
      enterPlanningMode()
      
      expect(canRedo.value).toBe(false)
      const result = redo()
      expect(result).toBe(false)
    })

    it('should redo after undo', () => {
      const { updateCurrent } = useWorldData()
      const { enterPlanningMode, plannedBases, addHistoryEntry } = usePlanningMode()
      const { undo, redo, canRedo } = usePlanningHistory()
      
      updateCurrent({
        bases: [{ id: 'base-1', planetId: 1, name: 'Original', buildings: [], recipes: [] }] as PlayerBase[],
      })
      
      enterPlanningMode()
      
      // Make change
      addHistoryEntry(
        { type: 'UPDATE_BUILDING', id: 'b1', field: 'level', oldValue: 1, newValue: 3 },
        'base-1',
        'Changed',
        { name: 'Original' },
        { name: 'Changed' }
      )
      plannedBases.value[0].name = 'Changed'
      
      // Undo
      undo()
      expect(plannedBases.value[0].name).toBe('Original')
      expect(canRedo.value).toBe(true)
      
      // Redo
      const result = redo()
      
      expect(result).toBe(true)
      expect(plannedBases.value[0].name).toBe('Changed')
      expect(canRedo.value).toBe(false)
    })

    it('should handle multiple undo/redo cycles', () => {
      const { updateCurrent } = useWorldData()
      const { enterPlanningMode, plannedBases, addHistoryEntry } = usePlanningMode()
      const { undo, redo } = usePlanningHistory()
      
      updateCurrent({
        bases: [{ id: 'base-1', planetId: 1, name: 'V0', buildings: [], recipes: [] }] as PlayerBase[],
      })
      
      enterPlanningMode()
      
      // Add 3 changes
      for (let i = 1; i <= 3; i++) {
        addHistoryEntry(
          { type: 'ADD_BUILDING', buildingId: i, level: 1 },
          'base-1',
          `Change ${i}`,
          { name: `V${i - 1}` },
          { name: `V${i}` }
        )
        plannedBases.value[0].name = `V${i}`
      }
      
      expect(plannedBases.value[0].name).toBe('V3')
      
      // Undo all
      undo() // V3 -> V2
      undo() // V2 -> V1
      undo() // V1 -> V0
      expect(plannedBases.value[0].name).toBe('V0')
      
      // Redo 2
      redo() // V0 -> V1
      redo() // V1 -> V2
      expect(plannedBases.value[0].name).toBe('V2')
      
      // Undo 1
      undo() // V2 -> V1
      expect(plannedBases.value[0].name).toBe('V1')
      
      // Redo 2
      redo() // V1 -> V2
      redo() // V2 -> V3
      expect(plannedBases.value[0].name).toBe('V3')
    })

    it('should clear redo stack when new change made after undo', () => {
      const { updateCurrent } = useWorldData()
      const { enterPlanningMode, plannedBases, addHistoryEntry } = usePlanningMode()
      const { undo, canRedo } = usePlanningHistory()
      
      updateCurrent({
        bases: [{ id: 'base-1', planetId: 1, name: 'V0', buildings: [], recipes: [] }] as PlayerBase[],
      })
      
      enterPlanningMode()
      
      // Add 2 changes
      addHistoryEntry({ type: 'ADD_BUILDING', buildingId: 1, level: 1 }, 'base-1', 'Change 1', { name: 'V0' }, { name: 'V1' })
      plannedBases.value[0].name = 'V1'
      
      addHistoryEntry({ type: 'ADD_BUILDING', buildingId: 2, level: 1 }, 'base-1', 'Change 2', { name: 'V1' }, { name: 'V2' })
      plannedBases.value[0].name = 'V2'
      
      // Undo once
      undo()
      expect(plannedBases.value[0].name).toBe('V1')
      expect(canRedo.value).toBe(true)
      
      // Make new change - should clear redo stack
      addHistoryEntry({ type: 'ADD_BUILDING', buildingId: 3, level: 1 }, 'base-1', 'Change 3', { name: 'V1' }, { name: 'V3' })
      plannedBases.value[0].name = 'V3'
      
      expect(canRedo.value).toBe(false)
    })
  })

  describe('history index tracking', () => {
    it('should track history index correctly', () => {
      const { enterPlanningMode, addHistoryEntry } = usePlanningMode()
      const { historyIndex, undo, redo } = usePlanningHistory()
      
      enterPlanningMode()
      
      expect(historyIndex.value).toBe(-1)
      
      addHistoryEntry({ type: 'ADD_BUILDING', buildingId: 1, level: 1 }, 'base-1', 'Entry 1', {}, {})
      expect(historyIndex.value).toBe(0)
      
      addHistoryEntry({ type: 'ADD_BUILDING', buildingId: 2, level: 1 }, 'base-1', 'Entry 2', {}, {})
      expect(historyIndex.value).toBe(1)
      
      addHistoryEntry({ type: 'ADD_BUILDING', buildingId: 3, level: 1 }, 'base-1', 'Entry 3', {}, {})
      expect(historyIndex.value).toBe(2)
      
      undo()
      expect(historyIndex.value).toBe(1)
      
      undo()
      expect(historyIndex.value).toBe(0)
      
      redo()
      expect(historyIndex.value).toBe(1)
    })
  })

  describe('history descriptions', () => {
    it('should retrieve history descriptions', () => {
      const { enterPlanningMode, addHistoryEntry } = usePlanningMode()
      const { getHistoryDescription } = usePlanningHistory()
      
      enterPlanningMode()
      
      addHistoryEntry({ type: 'ADD_BUILDING', buildingId: 1, level: 1 }, 'base-1', 'Added Solar Panel', {}, {})
      addHistoryEntry({ type: 'UPDATE_RECIPE', id: 'r1', field: 'count', oldValue: 1, newValue: 5 }, 'base-1', 'Increased production', {}, {})
      
      expect(getHistoryDescription(0)).toBe('Added Solar Panel')
      expect(getHistoryDescription(1)).toBe('Increased production')
      expect(getHistoryDescription(2)).toBeNull()
    })

    it('should return null when not in planning mode', () => {
      const { getHistoryDescription } = usePlanningHistory()
      expect(getHistoryDescription(0)).toBeNull()
    })
  })

  describe('clear history', () => {
    it('should clear all history', () => {
      const { enterPlanningMode, addHistoryEntry, history } = usePlanningMode()
      const { clearHistory } = usePlanningHistory()
      
      enterPlanningMode()
      
      addHistoryEntry({ type: 'ADD_BUILDING', buildingId: 1, level: 1 }, 'base-1', 'Entry 1', {}, {})
      addHistoryEntry({ type: 'ADD_BUILDING', buildingId: 2, level: 1 }, 'base-1', 'Entry 2', {}, {})
      
      expect(history.value).toHaveLength(2)
      
      clearHistory()
      
      expect(history.value).toHaveLength(0)
    })
  })
})
