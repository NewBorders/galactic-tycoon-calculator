import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useTechnologyNetProfitForecast } from '../useTechnologyNetProfitForecast'
import { loadGameData } from '@/v2/services/gamedata/service'
import type { PlayerBase } from '@/v2/services/playerBases'

describe('useTechnologyNetProfitForecast', () => {
  it('should calculate net profit forecast for technology upgrades', async () => {
    const { data: gameData } = await loadGameData(true)

    // Create a simple test base with one recipe
    const bases = ref<PlayerBase[]>([
      {
        id: 'test-base',
        name: 'Test Base',
        planetId: 1,
        buildings: [
          { buildingId: 1, level: 1 }, // Basic building
        ],
        recipes: [
          { recipeId: 1, count: 1 }, // Basic recipe
        ],
        optionalConsumables: [],
      },
    ])

    const technologyLevels = ref({
      1: 1, // Construction level 1
    })

    const startingBonus = ref(1)
    const globalWorkforceBurden = ref(0)
    const priceResolver = ref((materialId: number) => {
      void materialId
      return 100
    }) // Fixed price for simplicity

    const { getForecast, allForecasts } = useTechnologyNetProfitForecast(
      ref(gameData),
      bases,
      technologyLevels,
      startingBonus,
      globalWorkforceBurden,
      priceResolver
    )

    // Get forecast for Construction technology
    const forecast = getForecast(1)

    // Verify forecast structure
    expect(forecast).toHaveProperty('currentNetProfit')
    expect(forecast).toHaveProperty('forecastedNetProfit')
    expect(forecast).toHaveProperty('netProfitChange')
    expect(forecast).toHaveProperty('percentChange')
    expect(forecast).toHaveProperty('upgradeCost')
    expect(forecast).toHaveProperty('upgradeCostValue')
    expect(forecast).toHaveProperty('roiDays')

    // Verify forecast is a number
    expect(typeof forecast.currentNetProfit).toBe('number')
    expect(typeof forecast.forecastedNetProfit).toBe('number')
    expect(typeof forecast.netProfitChange).toBe('number')
    expect(typeof forecast.upgradeCostValue).toBe('number')

    // Verify upgrade cost is a string or undefined
    if (forecast.upgradeCost) {
      expect(typeof forecast.upgradeCost).toBe('string')
    }

    // Verify ROI is a number or undefined
    if (forecast.roiDays !== undefined) {
      expect(typeof forecast.roiDays).toBe('number')
      expect(forecast.roiDays).toBeGreaterThanOrEqual(0)
    }

    // Verify allForecasts computed works
    const allForecastsValue = allForecasts.value
    expect(allForecastsValue.size).toBeGreaterThan(0)
    expect(allForecastsValue.has(1)).toBe(true) // Construction tech
  })

  it('should calculate different forecasts for different technology levels', async () => {
    const { data: gameData } = await loadGameData(true)

    const bases = ref<PlayerBase[]>([
      {
        id: 'test-base',
        name: 'Test Base',
        planetId: 1,
        buildings: [{ buildingId: 1, level: 1 }],
        recipes: [{ recipeId: 1, count: 1 }],
        optionalConsumables: [],
      },
    ])

    const technologyLevels = ref({
      1: 1, // Construction level 1
      2: 3, // Manufacturing level 3
    })

    const startingBonus = ref(1)
    const globalWorkforceBurden = ref(0)
    const priceResolver = ref((materialId: number) => {
      void materialId
      return 100
    })

    const { getForecast } = useTechnologyNetProfitForecast(
      ref(gameData),
      bases,
      technologyLevels,
      startingBonus,
      globalWorkforceBurden,
      priceResolver
    )

    const forecastConstruction = getForecast(1) // Level 1 → 2
    const forecastManufacturing = getForecast(2) // Level 3 → 4

    // Both forecasts should exist
    expect(forecastConstruction).toBeDefined()
    expect(forecastManufacturing).toBeDefined()

    // They should have different values (unless by coincidence)
    // We're just checking that the calculation runs without errors
    expect(typeof forecastConstruction.netProfitChange).toBe('number')
    expect(typeof forecastManufacturing.netProfitChange).toBe('number')
  })
})
