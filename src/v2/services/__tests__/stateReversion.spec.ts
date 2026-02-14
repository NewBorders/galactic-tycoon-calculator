import { describe, it, expect } from 'vitest'
import { type StoredChange } from '../changeStorage'
import { applyStateReversions } from '../stateReversion'
import type { TodoGroup } from '../todoListService'

// Minimal PlayerBasesService mock
type MockBase = { id: string; planetId?: number; name?: string; buildings: Array<{ id: string }>; recipes: Array<{ id: string; recipeId: number }>; stock: Record<number, number> }

const createPlayerBasesMock = () => {
  const bases: MockBase[] = [
    { id: 'base-1', planetId: 42, name: 'Alpha', buildings: [], recipes: [], stock: {} },
  ]

  return {
    state: { value: { bases } },
    addBuilding: (baseId: string, buildingId: number, level?: number) => {
      void baseId; void buildingId; void level; return 'inst-1'
    },
    setBuilding: (baseId: string, instanceId: string, patch: { level?: number }) => {
      void baseId; void instanceId; void patch
    },
    removeBuilding: (baseId: string, instanceId: string) => {
      void baseId; void instanceId
    },
    addRecipe: (baseId: string, recipeId: number) => { void baseId; void recipeId; return 'rec-1' },
    removeRecipe: (baseId: string, recipeInstanceId: string) => { void baseId; void recipeInstanceId },
    setRecipeCount: (baseId: string, recipeInstanceId: string, count: number) => { void baseId; void recipeInstanceId; void count },
    setStock: (baseId: string, stock: Record<number, number>) => {
      const base = bases.find(b => b.id === baseId)
      if (base) base.stock = stock
    },
  }
}

// Helper to build a TodoGroup with one change referencing a storedChange
const createGroupWithChange = (storedChange: StoredChange, description: string): TodoGroup[] => {
  const change = {
    id: storedChange.changeId,
    type: storedChange.type === 'stock' ? 'stock' : 'building',
    timestamp: Date.now(),
    description,
    planetId: 42,
    details: {
      changeId: storedChange.changeId,
      planetId: 42,
      // Provide sufficient detail for fallback reversion
      materialId: storedChange.type === 'stock' ? parseInt(storedChange.targetId as string, 10) : undefined,
      from: storedChange.originalValue,
      to: storedChange.newValue,
    },
  }
  const step = { id: 'step-1', changes: [change], description, createdAt: Date.now() }
  const group: TodoGroup = { scope: 'base', planetId: 42, steps: [step] }
  return [group]
}

describe('stateReversion planetId fallback', () => {
  it('reverts stock change using planetId when baseId missing', () => {
    const playerBases = createPlayerBasesMock()

    const storedChange: StoredChange = {
      changeId: 'c-1',
      type: 'stock',
      targetId: '100', // material id
      targetField: 'amount',
      originalValue: 5,
      newValue: 10,
      planetId: 42,
    }

    // fromGroups contains a change; toGroups is empty (previous state) → backward
    const from = createGroupWithChange(storedChange, 'Stock 5 → 10')
    const to: TodoGroup[] = []

    // Pre-set stock to 10
    playerBases.state.value.bases[0].stock = { 100: 10 }

    applyStateReversions(from, to, playerBases)

    const finalStock = playerBases.state.value.bases[0].stock
    expect(finalStock[100]).toBe(5)
  })
})
