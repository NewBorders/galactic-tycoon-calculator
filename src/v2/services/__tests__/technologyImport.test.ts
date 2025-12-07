import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { usePlayerTechnology } from '../playerTechnology'
import { fetchCompanyBases } from '@/v2/services/api/warehouseService'
import type { CompanyResponse } from '@/v2/services/api/types'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Technology Import from Company Data API', () => {
  it('should set technology levels from API response', () => {
    const { setFromApi, state } = usePlayerTechnology()

    const apiTechnologies = [
      { id: 1, level: 5 }, // Construction
      { id: 4, level: 8 }, // Resource Extraction
      { id: 7, level: 3 }, // Electronics
    ]

    setFromApi(apiTechnologies, 1.2)

    expect(state.value.levels[1]).toBe(5)
    expect(state.value.levels[4]).toBe(8)
    expect(state.value.levels[7]).toBe(3)
    expect(state.value.startingBonus).toBe(1.2)
  })

  it('should ignore invalid technology IDs', () => {
    const { setFromApi, state } = usePlayerTechnology()

    const apiTechnologies = [
      { id: 1, level: 5 }, // Valid
      { id: 9, level: 10 }, // Invalid (technology ID 9 does not exist)
      { id: 999, level: 7 }, // Invalid
    ]

    setFromApi(apiTechnologies)

    expect(state.value.levels[1]).toBe(5)
    expect(state.value.levels[9]).toBeUndefined()
    expect(state.value.levels[999]).toBeUndefined()
  })

  it('should clamp technology levels to valid range', () => {
    const { setFromApi, state } = usePlayerTechnology()

    const apiTechnologies = [
      { id: 1, level: -5 }, // Should clamp to 0
      { id: 2, level: 10.7 }, // Should floor to 10
      { id: 3, level: 0 }, // Valid minimum
    ]

    setFromApi(apiTechnologies)

    expect(state.value.levels[1]).toBe(0)
    expect(state.value.levels[2]).toBe(10)
    expect(state.value.levels[3]).toBe(0)
  })

  it('should clamp starting bonus to valid range', () => {
    const { setFromApi, state } = usePlayerTechnology()

    setFromApi([], -1)
    expect(state.value.startingBonus).toBe(0.1) // Minimum

    setFromApi([], 0)
    expect(state.value.startingBonus).toBe(0.1) // Minimum

    setFromApi([], 1.56)
    expect(state.value.startingBonus).toBe(1.6) // Rounded to 1 decimal
  })

  it('should preserve existing starting bonus if not provided', () => {
    const { setFromApi, setStartingBonus, state } = usePlayerTechnology()

    setStartingBonus(1.5)
    expect(state.value.startingBonus).toBe(1.5)

    setFromApi([{ id: 1, level: 5 }]) // No starting bonus provided
    expect(state.value.startingBonus).toBe(1.5) // Should remain unchanged
    expect(state.value.levels[1]).toBe(5)
  })

  it('should overwrite all technology levels on import', () => {
    const { setLevel, setFromApi, state } = usePlayerTechnology()

    // Set initial levels manually
    setLevel(1, 3)
    setLevel(2, 4)
    setLevel(3, 5)

    expect(state.value.levels[1]).toBe(3)
    expect(state.value.levels[2]).toBe(4)
    expect(state.value.levels[3]).toBe(5)

    // Import from API should replace all levels
    const apiTechnologies = [
      { id: 1, level: 10 }, // Updated
      { id: 4, level: 7 }, // New
    ]

    setFromApi(apiTechnologies)

    expect(state.value.levels[1]).toBe(10) // Updated
    expect(state.value.levels[2]).toBeUndefined() // Removed
    expect(state.value.levels[3]).toBeUndefined() // Removed
    expect(state.value.levels[4]).toBe(7) // Added
  })

  it('should persist technology levels to localStorage', () => {
    const { setFromApi } = usePlayerTechnology()

    const apiTechnologies = [
      { id: 1, level: 5 },
      { id: 4, level: 8 },
    ]

    setFromApi(apiTechnologies, 1.3)

    const stored = JSON.parse(localStorage.getItem('gt:v2:player:technology:v1') || '{}')
    expect(stored.levels[1]).toBe(5)
    expect(stored.levels[4]).toBe(8)
    expect(stored.startingBonus).toBe(1.3)
  })

  it('should handle empty technology array', () => {
    const { setLevel, setFromApi, state } = usePlayerTechnology()

    // Set some initial levels
    setLevel(1, 5)
    setLevel(2, 3)

    // Import empty array should clear all levels
    setFromApi([])

    expect(state.value.levels[1]).toBeUndefined()
    expect(state.value.levels[2]).toBeUndefined()
  })

  it('fetchCompanyBases returns technologies in response', async () => {
    // Mock fetch to return company data with technologies
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/public/company')) {
          return {
            ok: true,
            json: async (): Promise<CompanyResponse> => ({
              id: 123,
              name: 'Test Company',
              money: 1000000,
              bases: [
                {
                  id: 1,
                  name: 'Main Base',
                  planetId: 10,
                  warehouseId: 100,
                  x: 5,
                  y: 10,
                },
              ],
              technologies: [
                { id: 1, level: 5 },
                { id: 2, level: 3 },
                { id: 4, level: 7 },
                { id: 7, level: 4 },
              ],
              startingBonus: 1.2,
            }),
          }
        }
        return { ok: false, status: 404, statusText: 'Not Found' }
      }),
    )

    const result = await fetchCompanyBases('FAKE_API_KEY', 'g2', false)

    expect(result.data.technologies).toBeDefined()
    expect(result.data.technologies?.length).toBe(4)
    expect(result.data.technologies?.[0]).toEqual({ id: 1, level: 5 })
    expect(result.data.technologies?.[3]).toEqual({ id: 7, level: 4 })
    expect(result.data.startingBonus).toBe(1.2)
  })

  it('fetchCompanyBases handles missing technologies gracefully', async () => {
    // Mock fetch to return company data without technologies
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/public/company')) {
          return {
            ok: true,
            json: async (): Promise<CompanyResponse> => ({
              id: 456,
              name: 'Another Company',
              money: 500000,
              bases: [],
            }),
          }
        }
        return { ok: false, status: 404, statusText: 'Not Found' }
      }),
    )

    // Force refresh to bypass cache
    const result = await fetchCompanyBases('DIFFERENT_KEY', 'g1', true)

    expect(result.data.technologies).toBeUndefined()
    expect(result.data.startingBonus).toBeUndefined()
  })

  it('should import all 9 technology types correctly', () => {
    const { setFromApi, state } = usePlayerTechnology()

    const apiTechnologies = [
      { id: 1, level: 1 }, // Construction
      { id: 2, level: 2 }, // Manufacturing
      { id: 3, level: 3 }, // Agriculture
      { id: 4, level: 4 }, // Resource Extraction
      { id: 5, level: 5 }, // Metallurgy
      { id: 6, level: 6 }, // Chemistry
      { id: 7, level: 7 }, // Electronics
      { id: 8, level: 8 }, // Food Production
      { id: 10, level: 10 }, // Science (note: ID 10, not 9)
    ]

    setFromApi(apiTechnologies, 1.5)

    expect(state.value.levels[1]).toBe(1)
    expect(state.value.levels[2]).toBe(2)
    expect(state.value.levels[3]).toBe(3)
    expect(state.value.levels[4]).toBe(4)
    expect(state.value.levels[5]).toBe(5)
    expect(state.value.levels[6]).toBe(6)
    expect(state.value.levels[7]).toBe(7)
    expect(state.value.levels[8]).toBe(8)
    expect(state.value.levels[10]).toBe(10)
    expect(state.value.startingBonus).toBe(1.5)
  })

  it('should handle duplicate technology IDs by using last value', () => {
    const { setFromApi, state } = usePlayerTechnology()

    const apiTechnologies = [
      { id: 1, level: 5 },
      { id: 1, level: 10 }, // Duplicate
      { id: 2, level: 3 },
    ]

    setFromApi(apiTechnologies)

    expect(state.value.levels[1]).toBe(10) // Should use last value
    expect(state.value.levels[2]).toBe(3)
  })
})
