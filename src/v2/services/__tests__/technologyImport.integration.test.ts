import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initializeSyncService, stopBackgroundRefresh } from '../syncService'
import { useWorldData, __resetWorldDataState__ } from '../worldData'
import { usePlanningMode } from '../planningMode/state'
import { clearAllWorldData, setActiveWorld } from '../worldData/storage'
import type { CompanyResponse } from '../api/types'

describe('Technology import updates planned levels', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    clearAllWorldData()
    setActiveWorld('g2')
    __resetWorldDataState__()
  })

  afterEach(() => {
    stopBackgroundRefresh()
    vi.restoreAllMocks()
  })

  it('bumps planned technology to current on import', async () => {
    const { updateCurrent, setApiKey, current } = useWorldData()
    const { enterPlanningMode, plannedTechnology } = usePlanningMode()

    updateCurrent({ technology: { 1: 5 } })
    enterPlanningMode()

    plannedTechnology.value[1] = 2
    plannedTechnology.value[2] = 9

    setApiKey('test-key')

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/public/company')) {
          return {
            ok: true,
            json: async (): Promise<CompanyResponse> => ({
              id: 1,
              name: 'Test Company',
              money: 0,
              bases: [],
              technologies: [
                { id: 1, level: 6 },
                { id: 2, level: 7 },
              ],
              startingBonus: 1.1,
            }),
          }
        }
        return { ok: false, status: 404, statusText: 'Not Found' }
      }),
    )

    await initializeSyncService()

    expect(current.value.technology[1]).toBe(6)
    expect(current.value.technology[2]).toBe(7)
    expect(plannedTechnology.value[1]).toBe(6)
    expect(plannedTechnology.value[2]).toBe(9)
  })
})
