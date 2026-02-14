type WorkersHousingInput = {
  workersHousing?:
    | { worker?: number; technician?: number; engineer?: number; scientist?: number }
    | number[]
    | null
}

function normalizeWorkersHousing<T extends WorkersHousingInput>(building: T): T
function normalizeWorkersHousing<T extends WorkersHousingInput>(building: T | undefined): T | undefined
// Hilfsfunktion: workersHousing normalisieren (Objekt → Array)
function normalizeWorkersHousing<T extends WorkersHousingInput>(building: T | undefined): T | undefined {
  if (
    building &&
    building.workersHousing &&
    !Array.isArray(building.workersHousing) &&
    typeof building.workersHousing === 'object' &&
    building.workersHousing !== null &&
    'worker' in building.workersHousing
  ) {
    const wh = building.workersHousing
    return {
      ...building,
      workersHousing: [wh.worker ?? 0, wh.technician ?? 0, wh.engineer ?? 0, wh.scientist ?? 0]
    } as T
  }
  return building
}
/**
 * TodoList Service - Singleton pattern with per-scope histories
 * Each base and global changes have separate undo/redo histories
 */

import { ref, computed } from 'vue'
import type { PlayerBasesService } from './stateReversion'
import { applyStateReversions } from './stateReversion'
import { unregisterChange } from './changeStorage'
import { computeBuildingUpgradeCost } from '@/v2/services/buildingCosts/buildingCosts.core'
import { computeTechnologyResearchCost } from '@/v2/services/technologyCosts/technologyCosts.core'
import { useWorldData } from './worldData'
import { usePlanningMode } from './planningMode/state'
import { getGameData } from './gamedata/gameDataRepository'

export type ChangeType = 'technology' | 'building' | 'recipe' | 'stock' | 'base' | 'starting-bonus'
export type ScopeType = 'global' | 'base'

export interface Change {
  id: string  // Unique ID for this change, used for state reversion
  type: ChangeType
  timestamp: number
  description: string
  planetId?: number
  details?: Record<string, string | number | undefined>
}

export interface TodoStep {
  id: string
  changes: Change[]
  description: string
  createdAt: number
}

export interface TodoGroup {
  scope: ScopeType
  planetId?: number
  steps: TodoStep[]
}

// Scope key format: "global" or "base:{baseName}"
type ScopeKey = string

interface ScopeHistory {
  history: TodoGroup[][]  // Array of states
  currentIndex: number    // Current position in history
}

let todoListInstance: ReturnType<typeof createTodoList> | null = null
let playerBasesInstance: PlayerBasesService | null = null

const TODO_STORAGE_KEY = 'gt:v2:todoList:v2'  // New version for per-scope storage
const OLD_TODO_STORAGE_KEY = 'gt:v2:todoList:v1'  // Old global history format

function getScopeKey(scope: ScopeType, planetId?: number): ScopeKey {
  return scope === 'global' ? 'global' : `base:${planetId}`
}

function createTodoList() {
  // Clean up old storage format (pre-release, can be removed after some time)
  try {
    const oldData = localStorage.getItem(OLD_TODO_STORAGE_KEY)
    if (oldData) {
      console.log('[TodoListService] Clearing old v1 storage format (not compatible with v2)')
      localStorage.removeItem(OLD_TODO_STORAGE_KEY)
    }
  } catch (e) {
    console.error('[TodoListService] Failed to clean old storage:', e)
  }

  // Load from localStorage
  function loadFromStorage(): { histories: Map<ScopeKey, ScopeHistory>; isOpen: boolean } {
    try {
      const stored = localStorage.getItem(TODO_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const historiesMap = new Map<ScopeKey, ScopeHistory>()

        if (parsed.histories && typeof parsed.histories === 'object') {
          Object.entries(parsed.histories).forEach(([key, value]) => {
            historiesMap.set(key, value as ScopeHistory)
          })
        }

        return {
          histories: historiesMap,
          isOpen: parsed.isOpen ?? true,
        }
      }
    } catch (e) {
      console.error('[TodoListService] Failed to load from storage:', e)
    }
    return { histories: new Map(), isOpen: true }
  }

  // Save to localStorage
  function saveToStorage() {
    try {
      const historiesObj: Record<string, ScopeHistory> = {}
      scopeHistories.value.forEach((history, key) => {
        historiesObj[key] = history
      })

      const data = {
        histories: historiesObj,
        isOpen: isOpen.value,
      }
      localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('[TodoListService] Failed to save to storage:', e)
    }
  }

  // Initialize from storage
  const stored = loadFromStorage()

  // Per-scope histories
  const scopeHistories = ref<Map<ScopeKey, ScopeHistory>>(stored.histories)
  const isOpen = ref(stored.isOpen)

  // Flag to prevent tracking during undo/redo
  let isReverting = false

  // Get or create history for a scope
  function getOrCreateScopeHistory(scopeKey: ScopeKey): ScopeHistory {
    let history = scopeHistories.value.get(scopeKey)
    if (!history) {
      history = {
        history: [[]],  // Start with one empty state
        currentIndex: 0,
      }
      scopeHistories.value.set(scopeKey, history)
    }
    return history
  }

  // Get all current groups (from all scopes at their current indices)
  const todoGroups = computed(() => {
    const allGroups: TodoGroup[] = []

    scopeHistories.value.forEach((scopeHistory) => {
      if (scopeHistory.currentIndex >= 0 && scopeHistory.currentIndex < scopeHistory.history.length) {
        const groupsAtIndex = scopeHistory.history[scopeHistory.currentIndex]
        if (groupsAtIndex && Array.isArray(groupsAtIndex)) {
          allGroups.push(...groupsAtIndex)
        }
      }
    })

    return allGroups
  })

  // Flatten all steps from all groups for statistics
  const allSteps = computed(() => {
    return todoGroups.value.flatMap(group => group.steps)
  })

  // Display groups - merge consecutive similar changes for cleaner UI
  const displayGroups = computed(() => {
    const merged: TodoGroup[] = []

    for (const group of todoGroups.value) {
      const mergedSteps: TodoStep[] = []

      for (const step of group.steps) {
        const lastMerged = mergedSteps[mergedSteps.length - 1]

        if (lastMerged && step.changes.length === 1 && lastMerged.changes.length === 1) {
          const lastChange = lastMerged.changes[0]
          const currentChange = step.changes[0]

          // Try to merge if same type and target
          if (lastChange && currentChange && canMergeWithChange(lastChange, currentChange)) {
            const from = lastChange.details?.from
            const to = currentChange.details?.to

            if (from !== undefined && to !== undefined) {
              // Check if changes cancel out (from == to)
              if (from === to) {
                // Remove the last merged step as it cancels out
                mergedSteps.pop()
                continue
              }

              // Update the last merged step with new "to" value
              let newDescription = lastChange.description
              if (currentChange.type === 'building' || currentChange.type === 'technology' || currentChange.type === 'stock' || currentChange.type === 'recipe') {
                newDescription = lastChange.description.replace(
                  /(\d+) → (\d+)/,
                  `${from} → ${to}`
                )
              }

              // Merge material costs if present
              const mergedCost = mergeMaterialsCosts(
                lastChange.details?.materialsCost as string | undefined,
                currentChange.details?.materialsCost as string | undefined
              )

              lastMerged.changes = [{
                ...lastChange,
                description: newDescription,
                details: {
                  ...lastChange.details,
                  to: to,
                  materialsCost: mergedCost,
                },
              }]
              lastMerged.description = newDescription
              continue
            }
          }
        }

        // Not mergeable, add as new step
        mergedSteps.push({ ...step })
      }

      merged.push({
        scope: group.scope,
        planetId: group.planetId,
        steps: mergedSteps,
      })
    }

    return merged
  })

  // Get display groups for a specific scope
  function getDisplayGroupsForScope(scope: ScopeType, planetId?: number): TodoGroup[] {
    const scopeKey = getScopeKey(scope, planetId)
    return displayGroups.value.filter(g => getScopeKey(g.scope, g.planetId) === scopeKey)
  }

  // Check if undo is available for a scope
  function canUndoForScope(scope: ScopeType, planetId?: number): boolean {
    const scopeKey = getScopeKey(scope, planetId)
    const history = scopeHistories.value.get(scopeKey)
    return history ? history.currentIndex > 0 : false
  }

  // Check if redo is available for a scope
  function canRedoForScope(scope: ScopeType, planetId?: number): boolean {
    const scopeKey = getScopeKey(scope, planetId)
    const history = scopeHistories.value.get(scopeKey)
    return history ? history.currentIndex < history.history.length - 1 : false
  }

  // Total number of changes
  const totalChanges = computed(() => allSteps.value.length)

  // Helper to merge material costs from two changes
  function mergeMaterialsCosts(cost1?: string, cost2?: string): string | undefined {
    const materialMap = new Map<string, number>()
    const sources = [cost1, cost2]
    for (const src of sources) {
      if (!src || typeof src !== 'string' || src.length === 0) continue
      src.split(',').forEach(part => {
        const match = part.trim().match(/^(\d+)×\s*(.+)$/)
        if (!match) return
        const amount = parseInt(match[1]!, 10)
        const material = match[2]!.trim()
        materialMap.set(material, (materialMap.get(material) || 0) + amount)
      })
    }
    const parts: string[] = []
    materialMap.forEach((amount, material) => {
      parts.push(`${amount}× ${material}`)
    })
    return parts.length > 0 ? parts.join(', ') : undefined
  }

  // Check if two changes are similar enough to merge
  function canMergeWithChange(lastChange: Change, newChange: Change): boolean {
    // Must be same type and same scope
    if (lastChange.planetId !== newChange.planetId) return false

    // Building changes - only merge if both are LEVEL changes (not add/remove)
    if (lastChange.type === 'building' && newChange.type === 'building') {
      // Don't merge add/remove with level changes
      const lastIsAction = !!lastChange.details?.action
      const newIsAction = !!newChange.details?.action

      if (lastIsAction || newIsAction) {
        const lastAction = lastChange.details?.action as string | undefined
        if (lastAction === 'add' && !newIsAction) {
          const lastInst = lastChange.details?.buildingInstanceId as string | undefined
          const newInst = newChange.details?.buildingInstanceId as string | undefined
          return !!lastInst && lastInst === newInst
        }
        return false
      }

      // Check if same building instance
      const lastInst = lastChange.details?.buildingInstanceId as string | undefined
      const newInst = newChange.details?.buildingInstanceId as string | undefined
      return !!lastInst && lastInst === newInst
    }

    // Recipe changes - only merge count changes, not add/remove
    if (lastChange.type === 'recipe' && newChange.type === 'recipe') {
      const lastIsAction = !!lastChange.details?.action
      const newIsAction = !!newChange.details?.action

      if (lastIsAction || newIsAction) return false

      // Check if same recipe instance
      const lastRecipeId = lastChange.details?.recipeInstanceId as string
      const newRecipeId = newChange.details?.recipeInstanceId as string
      return lastRecipeId === newRecipeId
    }

    // Technology - merge changes to same tech
    if (lastChange.type === 'technology' && newChange.type === 'technology') {
      const lastTechId = (lastChange.details?.technologyId ?? lastChange.details?.techId) as string | number
      const newTechId = (newChange.details?.technologyId ?? newChange.details?.techId) as string | number
      return String(lastTechId) === String(newTechId)
    }

    // Starting bonus - always merge
    if (lastChange.type === 'starting-bonus' && newChange.type === 'starting-bonus') {
      return true
    }

    // Stock - merge changes to same material
    if (lastChange.type === 'stock' && newChange.type === 'stock') {
      const lastMaterialId = lastChange.details?.materialId as number
      const newMaterialId = newChange.details?.materialId as number
      return lastMaterialId === newMaterialId
    }

    return false
  }

  function doCancelsOut(change1: Change, change2: Change): boolean {
    // For recipe count changes, compare recipeInstanceId instead of targetId
    if (change1.type === 'recipe' && change2.type === 'recipe') {
      const action1 = change1.details?.action as string
      const action2 = change2.details?.action as string

      // Recipe added then removed
      if (action1 && action2) {
        // Check if both affect the same target
        if (change1.details?.targetId !== change2.details?.targetId) {
          return false
        }
        return (action1 === 'add' && action2 === 'remove' || action1 === 'remove' && action2 === 'add')
      }

      // Recipe count changes - compare by recipeInstanceId
      const instanceId1 = change1.details?.recipeInstanceId as string | undefined
      const instanceId2 = change2.details?.recipeInstanceId as string | undefined

      if (!instanceId1 || !instanceId2 || instanceId1 !== instanceId2) {
        console.log('[doCancelsOut] Different recipe instances:', instanceId1, instanceId2)
        return false
      }

      // Check if count returns to original value
      const from1 = change1.details?.from as number | undefined
      const to2 = change2.details?.to as number | undefined

      if (from1 !== undefined && to2 !== undefined && from1 === to2) {
        console.log('[doCancelsOut] Recipe count reverted:', { from: from1, to: to2 })
        return true
      }

      return false
    }

    // Check if both changes affect the same target (for non-recipe changes)
    if (change1.details?.targetId !== change2.details?.targetId) {
      console.log('[doCancelsOut] Different targetIds:', change1.details?.targetId, change2.details?.targetId)
      return false
    }

    // Building add/remove (cancel out)
    if (change1.type === 'building' && change2.type === 'building') {
      // Ensure both affect the same building instance
      const inst1 = change1.details?.buildingInstanceId as string | undefined
      const inst2 = change2.details?.buildingInstanceId as string | undefined
      if (!inst1 || !inst2 || inst1 !== inst2) {
        console.log('[doCancelsOut] Different building instances:', inst1, inst2)
        return false
      }

      const action1 = change1.details?.action as string
      const action2 = change2.details?.action as string

      // Building added then removed (cancel out)
      if (action1 && action2) {
        return (action1 === 'add' && action2 === 'remove' || action1 === 'remove' && action2 === 'add')
      }

      // Building level changes (e.g., level 12→11→12)
      // If fromValue === toValue at the end, they cancel out
      const from1 = change1.details?.from as number | undefined
      const to2 = change2.details?.to as number | undefined

      if (from1 !== undefined && to2 !== undefined && from1 === to2) {
        console.log('[doCancelsOut] Building level reverted:', { from: from1, to: to2 })
        return true
      }
    }

    // Technology level changes (e.g., level 2→3→2)
    if (change1.type === 'technology' && change2.type === 'technology') {
      const tech1Id = (change1.details?.technologyId ?? change1.details?.techId) as string | number | undefined
      const tech2Id = (change2.details?.technologyId ?? change2.details?.techId) as string | number | undefined
      const from1 = change1.details?.from as number | undefined
      const to2 = change2.details?.to as number | undefined

      if (String(tech1Id) === String(tech2Id) && from1 !== undefined && to2 !== undefined && from1 === to2) {
        console.log('[doCancelsOut] Technology level reverted:', { from: from1, to: to2 })
        return true
      }
    }

    // Stock count changes that return to original value
    if (change1.type === 'stock' && change2.type === 'stock') {
      const from1 = change1.details?.from as number | undefined
      const to2 = change2.details?.to as number | undefined

      if (from1 !== undefined && to2 !== undefined && from1 === to2) {
        console.log('[doCancelsOut] Stock reverted:', { from: from1, to: to2 })
        return true
      }
    }

    return false
  }

  // Add a change to the appropriate scope's history
  function addChange(change: Omit<Change, 'timestamp'>): void {
    if (isReverting) {
      console.log('[TodoListService] Skipping change during undo/redo reversion')
      return
    }

    // Generate ID if not provided
    const changeId = change.id || (crypto?.randomUUID?.() ?? `change_${Date.now()}_${Math.random()}`)

    // Determine scope based on change type
    const scope: ScopeType = change.type === 'technology' || change.type === 'starting-bonus' || change.type === 'base' ? 'global' : 'base'
    const planetId = change.planetId
    const scopeKey = getScopeKey(scope, planetId)

    // Get or create scope history
    const scopeHistory = getOrCreateScopeHistory(scopeKey)

    // Remove redo stack when new change is made
    if (scopeHistory.currentIndex < scopeHistory.history.length - 1) {
      scopeHistory.history = scopeHistory.history.slice(0, scopeHistory.currentIndex + 1)
    }

    // Work on a COPY to avoid modifying history in-place
    const currentState = scopeHistory.history[scopeHistory.currentIndex]
    if (!currentState) {
      console.error('[TodoListService] Invalid state: currentIndex', scopeHistory.currentIndex, 'history length', scopeHistory.history.length)
      return
    }
    const currentGroups = JSON.parse(JSON.stringify(currentState)) as TodoGroup[]

    // Find or create target group in the copy
    let targetGroup = currentGroups.find(g => g.scope === scope && g.planetId === planetId)
    if (!targetGroup) {
      targetGroup = {
        scope,
        planetId,
        steps: [],
      }
      currentGroups.push(targetGroup)
    }

    const now = Date.now()
    const changeWithTime: Change = { ...change, id: changeId, timestamp: now }

    // Check if this change cancels out any existing change
    // Look at the CURRENT state (already has the previous changes)
    const stateForCancelCheck = scopeHistory.history[scopeHistory.currentIndex]
    if (stateForCancelCheck) {
      const groupForCancelCheck = stateForCancelCheck.find(g => g.scope === scope && g.planetId === planetId)

      if (groupForCancelCheck && groupForCancelCheck.steps.length > 0) {
        // Search through ALL steps to find the one that cancels out (not just the last one)
        let cancelledStepIndex = -1
        let cancelledChange: Change | null = null

        for (let i = groupForCancelCheck.steps.length - 1; i >= 0; i--) {
          const step = groupForCancelCheck.steps[i]
          if (step && step.changes.length === 1) {
            const existingChange = step.changes[0]
            if (existingChange && doCancelsOut(existingChange, changeWithTime)) {
              cancelledStepIndex = i
              cancelledChange = existingChange
              console.log('[TodoListService] Found cancel-out at step', i, ':', existingChange.type, existingChange.description)
              break
            }
          }
        }

        if (cancelledStepIndex >= 0 && cancelledChange) {
          console.log('[TodoListService] Changes cancel out, removing step', cancelledStepIndex)

          // Unregister the cancelled change
          const cancelledChangeId = cancelledChange.details?.changeId as string | undefined
          if (cancelledChangeId) {
            unregisterChange(cancelledChangeId)
          }

          // Unregister the new change as well (it cancels out)
          const currentChangeId = changeWithTime.details?.changeId as string | undefined
          if (currentChangeId) {
            unregisterChange(currentChangeId)
          }

          // Create a new state by removing the cancelled step from the current groups
          const newGroups = JSON.parse(JSON.stringify(currentGroups)) as TodoGroup[]
          const newTargetGroup = newGroups.find(g => g.scope === scope && g.planetId === planetId)

          if (newTargetGroup) {
            // Remove the cancelled step
            newTargetGroup.steps.splice(cancelledStepIndex, 1)

            // Add this as a new history state
            scopeHistory.history.push(newGroups)
            scopeHistory.currentIndex++

            console.log('[TodoListService] Removed step at index', cancelledStepIndex, ', history length:', scopeHistory.history.length)
            saveToStorage()
            return
          }
        }
      }
    }

    // Try to merge with last step if possible
    const lastStep = targetGroup.steps[targetGroup.steps.length - 1]

    if (lastStep && lastStep.changes.length === 1) {
      const lastChange = lastStep.changes[0]
      if (lastChange && canMergeWithChange(lastChange, changeWithTime)) {
        // Update the existing step with new values
        const from = lastChange.details?.from
        const to = changeWithTime.details?.to
        const newFrom = changeWithTime.details?.from
        const originalValue = lastChange.details?.originalValue  // Keep the true original value

        if (
          lastChange.type === 'building' &&
          changeWithTime.type === 'building' &&
          lastChange.details?.action === 'add' &&
          !changeWithTime.details?.action
        ) {
          const targetLevel = typeof to === 'number' ? to : Number(to)
          if (!Number.isFinite(targetLevel)) return

          let mergedCost = mergeMaterialsCosts(
            lastChange.details?.materialsCost as string | undefined,
            changeWithTime.details?.materialsCost as string | undefined
          )

          const buildingId = changeWithTime.details?.buildingId ? Number(changeWithTime.details.buildingId) : undefined
          const planetId = changeWithTime.planetId
          if (buildingId !== undefined && planetId !== undefined) {
            try {
              const gd = getGameData()
              const building = gd?.buildings.find(b => b.id === buildingId)
              const planet = gd?.planets.find(p => p.id === planetId)
              if (building && planet) {
                const buildingForCost = normalizeWorkersHousing(building)
                const recalculatedCost = computeBuildingUpgradeCost(
                  buildingForCost,
                  planet.tier ?? 1,
                  0,
                  targetLevel,
                  gd ? { materials: gd.materials } : undefined
                )
                if (recalculatedCost !== undefined) {
                  mergedCost = recalculatedCost
                }
              }
            } catch (e) {
              console.warn('[TodoListService] Failed to recalculate add+upgrade costs:', e)
            }
          }

          const lastName = lastChange.description.replace(/^🏢\s*/, '').replace(/\s+added.*$/, '')
          const newDescription = `🏢 ${lastName} added (Level ${targetLevel})`

          lastStep.changes = [{
            ...changeWithTime,
            description: newDescription,
            details: {
              ...changeWithTime.details,
              action: 'add',
              from: 0,
              to: targetLevel,
              buildingInstanceId: changeWithTime.details?.buildingInstanceId ?? lastChange.details?.buildingInstanceId,
              materialsCost: mergedCost,
            },
          }]
          lastStep.description = newDescription

          scopeHistory.history.push(currentGroups)
          scopeHistory.currentIndex++
          saveToStorage()
          return
        }

        if (from !== undefined && to !== undefined) {
          // Update description
          let newDescription = change.description
          if (change.type === 'building' || change.type === 'technology' || change.type === 'stock' || change.type === 'recipe') {
            newDescription = change.description.replace(/(\d+) → (\d+)/, `${from} → ${to}`)
          }

          // Merge material costs - special handling for technology downgrades
          // If the new change is a downgrade (to < from in the NEW change), replace costs instead of adding
          let mergedCost: string | undefined
          if (change.type === 'technology' && newFrom !== undefined && to !== undefined && to < newFrom) {
            // New change is a downgrade: use only the new cost (replaces the old upgrade plan)
            mergedCost = changeWithTime.details?.materialsCost as string | undefined
          } else {
            // Upgrade or other changes: add costs
            mergedCost = mergeMaterialsCosts(
              lastChange.details?.materialsCost as string | undefined,
              changeWithTime.details?.materialsCost as string | undefined
            )
          }

            // For technology changes, recalculate merged costs to account for non-linear techPenalty
            // Use the CURRENT (API) level as base, not the old change's level
            if (change.type === 'technology' && from !== undefined && to !== undefined && to > from) {
              const techId = changeWithTime.details?.technologyId ? Number(changeWithTime.details.technologyId) : undefined
              if (techId !== undefined) {
                try {
                  const { current } = useWorldData()
                  const { isPlanningActive, plannedTechnology } = usePlanningMode()
                  const currentLevel = current.value?.technology?.[techId] ?? 0
                  const targetLevel = typeof to === 'number' ? to : Number(to)

                  if (!Number.isFinite(targetLevel)) {
                    console.warn('[TodoListService] Invalid target level for tech merge recalculation:', to)
                    throw new Error('Invalid target level')
                  }

                  // Only recalculate if we're actually changing from current level
                  if (targetLevel !== currentLevel) {
                    let totalTechnologies = 0
                    if (current.value?.technology) {
                      totalTechnologies = Object.values(current.value.technology).reduce((sum, level) => sum + level, 0)
                    }

                    // Don't count this tech's own planned increase
                    const plannedLevels = isPlanningActive.value && plannedTechnology.value ? plannedTechnology.value : {}
                    Object.entries(plannedLevels).forEach(([tId, plannedLevel]) => {
                      const techIdNum = Number(tId)
                      if (techIdNum !== techId && current.value?.technology) {
                        const currentLvl = current.value.technology[techIdNum] ?? 0
                        const inc = Math.max(0, plannedLevel - currentLvl)
                        totalTechnologies += inc
                      }
                    })

                    const gd = getGameData()
                    const recalculatedCost = computeTechnologyResearchCost(
                      techId,
                      currentLevel,
                      targetLevel,
                      gd ? { materials: gd.materials } : undefined,
                      totalTechnologies
                    )
                    if (recalculatedCost) {
                      mergedCost = recalculatedCost
                    }
                  }
                } catch (e) {
                  // If recalculation fails, fall back to the merged costs
                  console.warn('[TodoListService] Failed to recalculate merged costs:', e)
                }
              }
            }

            // For building changes, recalculate merged costs with per-level scaling and planet tier
            if (change.type === 'building' && from !== undefined && to !== undefined) {
              const buildingId = changeWithTime.details?.buildingId ? Number(changeWithTime.details.buildingId) : undefined
              const planetId = changeWithTime.planetId

              if (buildingId !== undefined && planetId !== undefined) {
                try {
                  const gd = getGameData()
                  const building = gd?.buildings.find(b => b.id === buildingId)
                  const planet = gd?.planets.find(p => p.id === planetId)

                  if (building && planet) {
                    const buildingForCost = normalizeWorkersHousing(building)
                    const recalculatedCost = computeBuildingUpgradeCost(
                      buildingForCost,
                      planet.tier ?? 1,
                      Number(from),
                      Number(to),
                      gd ? { materials: gd.materials } : undefined
                    )
                    if (recalculatedCost !== undefined) {
                      mergedCost = recalculatedCost
                    } else {
                      mergedCost = undefined
                    }
                  }
                } catch (e) {
                  console.warn('[TodoListService] Failed to recalculate building costs:', e)
                }
              }
            }

          lastStep.changes = [{
            ...changeWithTime,
            description: newDescription,
            details: {
              ...changeWithTime.details,
              from: from,  // Keep original from value
              originalValue: originalValue,  // Keep original value for cancel-out detection
              materialsCost: mergedCost,
            },
          }]
          lastStep.description = newDescription

          // Add the modified copy as new history state
          scopeHistory.history.push(currentGroups)
          scopeHistory.currentIndex++
          saveToStorage()
          return
        }
      }
    }

    // Create new step if not merged
    const newStep: TodoStep = {
      id: crypto?.randomUUID?.() ?? `step_${Date.now()}`,
      changes: [changeWithTime],
      description: change.description,
      createdAt: now,
    }
    targetGroup.steps.push(newStep)

    // Add the modified copy as new history state
    scopeHistory.history.push(currentGroups)
    scopeHistory.currentIndex++
    saveToStorage()
  }

  // Undo for a specific scope
  function undoForScope(scope: ScopeType, planetId?: number): void {
    const scopeKey = getScopeKey(scope, planetId)
    const scopeHistory = scopeHistories.value.get(scopeKey)

    if (!scopeHistory || scopeHistory.currentIndex <= 0) return

    // Get the current and target states
    const fromGroups = scopeHistory.history[scopeHistory.currentIndex] || []
    const toGroups = scopeHistory.history[scopeHistory.currentIndex - 1] || []

    console.log('[TodoListService] Undo - fromGroups:', fromGroups.length, 'toGroups:', toGroups.length)
    console.log('[TodoListService] playerBasesInstance available:', !!playerBasesInstance)

    isReverting = true
    try {
      // Apply state reversions
      // playerBases is only required for base-specific changes (building, recipe, stock)
      // Global changes (technology, starting-bonus) work without it
      applyStateReversions(fromGroups, toGroups, playerBasesInstance || undefined)

      scopeHistory.currentIndex--
    } finally {
      isReverting = false
      saveToStorage()
    }
  }

  // Redo for a specific scope
  function redoForScope(scope: ScopeType, planetId?: number): void {
    const scopeKey = getScopeKey(scope, planetId)
    const scopeHistory = scopeHistories.value.get(scopeKey)

    if (!scopeHistory || scopeHistory.currentIndex >= scopeHistory.history.length - 1) return

    // Get the current and target states
    const fromGroups = scopeHistory.history[scopeHistory.currentIndex] || []
    const toGroups = scopeHistory.history[scopeHistory.currentIndex + 1] || []

    console.log('[TodoListService] Redo - fromGroups:', fromGroups.length, 'toGroups:', toGroups.length)
    console.log('[TodoListService] playerBasesInstance available:', !!playerBasesInstance)

    isReverting = true
    try {
      // Apply state reversions
      // playerBases is only required for base-specific changes (building, recipe, stock)
      // Global changes (technology, starting-bonus) work without it
      applyStateReversions(fromGroups, toGroups, playerBasesInstance || undefined)

      scopeHistory.currentIndex++
    } finally {
      isReverting = false
      saveToStorage()
    }
  }

  // Clear all histories
  function clear(): void {
    // Reset all planning state (global + all bases)
    if (playerBasesInstance) {
      // Remove all new bases (those without current counterpart)
      const bases = playerBasesInstance.state.value.bases.slice()
      for (const base of bases) {
        // Annahme: Neue Basen haben keine currentBuildings (API) oder ein Flag
        if (!base.currentBuildings || base.currentBuildings.length === 0) {
          playerBasesInstance.removeBase(base.id)
        } else {
          // Reset planned buildings/recipes to current
          base.buildings = base.currentBuildings.map(cur => ({
            id: `planned_${cur.buildingId}_${Math.random().toString(36).slice(2, 10)}`,
            buildingId: cur.buildingId,
            level: cur.level,
            slotId: cur.slotId,
          }))
          if (base.recipes && base.currentRecipes) {
            base.recipes = base.currentRecipes.map(cur => ({
              id: `planned_${cur.recipeId}_${Math.random().toString(36).slice(2, 10)}`,
              recipeId: cur.recipeId,
              count: cur.currentCount,
              currentCount: cur.currentCount,
            }))
          }
        }
      }
    }
    // Reset global planning state (technology, starting-bonus)
    try {
      const { worldData } = useWorldData()
      if (worldData.value.planning && worldData.value.current) {
        worldData.value.planning.technology = { ...worldData.value.current.technology }
        worldData.value.planning.startingBonus = worldData.value.current.startingBonus
        worldData.value.planning.modifiedAt = Date.now()
      }
    } catch {}
    scopeHistories.value.clear()
    saveToStorage()
  }

  // Clear history for a specific scope
  function clearForScope(scope: ScopeType, planetId?: number): void {
    const scopeKey = getScopeKey(scope, planetId)
    scopeHistories.value.delete(scopeKey)
    // Reset planning for this scope
    if (playerBasesInstance) {
      if (scope === 'base' && planetId !== undefined) {
        const base = playerBasesInstance.state.value.bases.find(b => b.planetId === planetId)
        if (base) {
          // Neue Base entfernen
          if (!base.currentBuildings || base.currentBuildings.length === 0) {
            playerBasesInstance.removeBase(base.id)
          } else {
            // Reset planned buildings/recipes to current
            base.buildings = base.currentBuildings.map(cur => ({
              id: `planned_${cur.buildingId}_${Math.random().toString(36).slice(2, 10)}`,
              buildingId: cur.buildingId,
              level: cur.level,
              slotId: cur.slotId,
            }))
            if (base.recipes && base.currentRecipes) {
              base.recipes = base.currentRecipes.map(cur => ({
                id: `planned_${cur.recipeId}_${Math.random().toString(36).slice(2, 10)}`,
                recipeId: cur.recipeId,
                count: cur.currentCount,
                currentCount: cur.currentCount,
              }))
            }
          }
        }
      } else if (scope === 'global') {
        // Reset global planning state (technology, starting-bonus)
        try {
          const { worldData } = useWorldData()
          if (worldData.value.planning && worldData.value.current) {
            worldData.value.planning.technology = { ...worldData.value.current.technology }
            worldData.value.planning.startingBonus = worldData.value.current.startingBonus
            worldData.value.planning.modifiedAt = Date.now()
          }
        } catch {}
      }
    }
    saveToStorage()
  }

  // Toggle panel
  function togglePanel(): void {
    isOpen.value = !isOpen.value
    saveToStorage()
  }

  return {
    // State
    todoGroups,
    displayGroups,
    allSteps,
    totalChanges,
    isOpen,
    scopeHistories,  // Expose for sync functionality

    // Methods
    addChange,
    undoForScope,
    redoForScope,
    canUndoForScope,
    canRedoForScope,
    getDisplayGroupsForScope,
    clear,
    clearForScope,
    togglePanel,
  }
}

/**
 * Sync TODO list with current API data and auto-complete achieved goals
 * This is called when API data refreshes to remove TODOs that have been completed
 * @returns Number of TODOs that were auto-completed
 */
export function syncTodoListWithApiData(currentState: {
  technology?: Record<number, number>
  buildings?: Array<{ buildingId: number; level: number; planetId: number }>
}): { completedCount: number; updatedCount: number } {
  const service = useTodoListService()

  if (!service) return { completedCount: 0, updatedCount: 0 }

  const completedChangeIds = new Set<string>()
  let updatedCount = 0

  const updateLevelDescription = (text: string, from: number, to: number): string =>
    text.replace(/(\d+) → (\d+)/, `${from} → ${to}`)

  // Iterate through all scopes and their current states
  service.scopeHistories.value.forEach((scopeHistory) => {
    const currentGroupsAtIndex = scopeHistory.history[scopeHistory.currentIndex]
    if (!currentGroupsAtIndex || !Array.isArray(currentGroupsAtIndex)) return

    // Check each group's steps for completion
    currentGroupsAtIndex.forEach((group) => {
      group.steps.forEach((step) => {
        step.changes.forEach((change) => {
          // Check if technology change is completed
          if (change.type === 'technology' && currentState.technology) {
            const techId = change.details?.technologyId ?? change.details?.techId
            const targetLevel = change.details?.to as number | undefined
            const fromLevel = change.details?.from as number | undefined
            const currentLevel = currentState.technology[Number(techId)] ?? 0

            if (targetLevel !== undefined && Number.isFinite(targetLevel) && currentLevel >= targetLevel) {
              console.log(
                `[TodoListService] Auto-completed technology: Tech ${techId} reached level ${currentLevel} (target: ${targetLevel})`
              )
              completedChangeIds.add(change.id)
              return
            }

            if (
              targetLevel !== undefined &&
              fromLevel !== undefined &&
              Number.isFinite(targetLevel) &&
              Number.isFinite(fromLevel) &&
              currentLevel > fromLevel &&
              currentLevel < targetLevel
            ) {
              change.details = {
                ...change.details,
                from: currentLevel,
              }
              change.description = updateLevelDescription(change.description, currentLevel, targetLevel)
              step.description = updateLevelDescription(step.description, currentLevel, targetLevel)
              updatedCount += 1
            }
          }

          // Check if building change is completed
          if (change.type === 'building' && currentState.buildings) {
            const targetLevel = change.details?.to as number | undefined
            const fromLevel = change.details?.from as number | undefined
            const planetId = group.planetId

            const building = currentState.buildings.find(
              (b) => b.planetId === planetId && b.buildingId === Number(change.details?.buildingId)
            )

            if (targetLevel !== undefined && building && Number.isFinite(targetLevel) && building.level >= targetLevel) {
              console.log(
                `[TodoListService] Auto-completed building: Building ${change.details?.buildingId} reached level ${building.level} (target: ${targetLevel}) on planet ${planetId}`
              )
              completedChangeIds.add(change.id)
              return
            }

            if (
              building &&
              targetLevel !== undefined &&
              fromLevel !== undefined &&
              Number.isFinite(targetLevel) &&
              Number.isFinite(fromLevel) &&
              building.level > fromLevel &&
              building.level < targetLevel
            ) {
              change.details = {
                ...change.details,
                from: building.level,
              }
              change.description = updateLevelDescription(change.description, building.level, targetLevel)
              step.description = updateLevelDescription(step.description, building.level, targetLevel)
              updatedCount += 1
            }
          }
        })
      })
    })
  })

  // Remove completed changes from TODO list by updating the reactive state
  if (completedChangeIds.size > 0) {
    console.log(`[TodoListService] Removing ${completedChangeIds.size} completed changes from TODO list`)

    // Update each scope's history
    service.scopeHistories.value.forEach((scopeHistory) => {
      const currentIndex = scopeHistory.currentIndex
      if (currentIndex >= 0 && currentIndex < scopeHistory.history.length) {
        const currentGroups = scopeHistory.history[currentIndex]
        if (!Array.isArray(currentGroups)) return

        // Filter out completed changes
        const updatedGroups = currentGroups
          .map((group) => {
            const updatedSteps = group.steps
              .map((step) => ({
                ...step,
                changes: step.changes.filter((change) => !completedChangeIds.has(change.id)),
              }))
              .filter((step) => step.changes.length > 0)

            return {
              ...group,
              steps: updatedSteps,
            }
          })
          .filter((group) => group.steps.length > 0)

        // Update the history at current index
        scopeHistory.history[currentIndex] = updatedGroups
      }
    })
  }

  return { completedCount: completedChangeIds.size, updatedCount }
}


/**
 * Get the singleton instance of the todo list
 */
export function useTodoListService() {
  if (!todoListInstance) {
    todoListInstance = createTodoList()
  }
  return todoListInstance
}

/**
 * Reset the singleton instance (only for testing)
 */
export function resetTodoListService() {
  todoListInstance = null
}

/**
 * Register the playerBases service for state reversion
 * This should be called from the main app setup
 */
export function registerPlayerBases(playerBases: PlayerBasesService) {
  playerBasesInstance = playerBases
}

/**
 * Access the registered playerBases instance (read-only usage in UI)
 */
export function getRegisteredPlayerBases(): PlayerBasesService | null {
  return playerBasesInstance
}

/**
 * Get base name (if set) or planet name for a given planetId
 * Returns: baseName > planetName > "Planet <planetId>"
 */
export function getBaseOrPlanetNameByPlanetId(planetId: number): string {
  const playerBases = getRegisteredPlayerBases()
  if (!playerBases) return `Planet ${planetId}`

  const base = playerBases.state.value.bases.find((b) => b.planetId === planetId)
  if (!base) return `Planet ${planetId}`

  // Prefer baseName if set
  if (base.name) return base.name

  // Fallback to planet name from the planets list
  const planet = playerBases.planets.value.find((p) => p.id === planetId)
  return planet?.name ?? `Planet ${planetId}`
}

/**
 * Export the composable for use in components
 */
export function useTodoList() {
  return useTodoListService()
}
