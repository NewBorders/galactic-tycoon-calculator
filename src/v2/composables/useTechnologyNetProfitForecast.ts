import { computed, toValue, type MaybeRef } from 'vue'
import type { GameData } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import { computeBaseReport } from '@/v2/services/production/engine'
import type { TechnologySpecialisation } from '@/v2/services/playerTechnology'
import { computeTechnologyResearchCost } from '@/v2/constants/manualCosts'

export type TechnologyNetProfitForecast = {
  currentNetProfit: number
  forecastedNetProfit: number
  netProfitChange: number
  percentChange: number
  upgradeCost: string | undefined
  upgradeCostValue: number
  roiDays: number | undefined
}

/**
 * Calculate the forecasted net profit impact of increasing a specific technology level by 1.
 * This compares the current planned state with a hypothetical state where the tech is +1 level higher.
 */
export function useTechnologyNetProfitForecast(
  gameData: MaybeRef<GameData | undefined>,
  bases: MaybeRef<PlayerBase[]>,
  technologyLevels: MaybeRef<Partial<Record<TechnologySpecialisation, number>>>,
  startingBonus: MaybeRef<number>,
  globalWorkforceBurden: MaybeRef<number>,
  priceResolver: MaybeRef<((materialId: number) => number | undefined) | undefined>
) {
  /**
   * Calculate net profit for a given technology configuration
   */
  const calculateNetProfit = (techLevels: Partial<Record<TechnologySpecialisation, number>>) => {
    const gd = toValue(gameData)
    if (!gd) return 0

    const basesArray = toValue(bases)
    const technologyLevelsOption: Record<number, number> = {}
    Object.entries(techLevels).forEach(([key, value]) => {
      const spec = Number(key)
      const level = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(spec) || Number.isNaN(level)) return
      technologyLevelsOption[spec] = Math.max(0, Math.floor(level))
    })

    let totalNetProfit = 0

    // Calculate net profit for each base
    basesArray.forEach((base) => {
      const assignment = {
        planetId: base.planetId,
        buildings: base.buildings.map((b) => ({
          buildingId: b.buildingId,
          level: b.level,
        })),
        recipes: base.recipes.map((r) => ({
          recipeId: r.recipeId,
          count: typeof r.count === 'number' && Number.isFinite(r.count) ? Math.max(0, Math.floor(r.count)) : 1,
        })),
      }

      const activeOptionalConsumables = new Set(
        (base.optionalConsumables ?? []).filter((id): id is number => typeof id === 'number'),
      )

      const resolvedPriceResolver = toValue(priceResolver)
      if (!resolvedPriceResolver) return

      // Wrap priceResolver to return 0 for undefined values
      const wrappedPriceResolver = (materialId: number): number => {
        return resolvedPriceResolver(materialId) ?? 0
      }

      const report = computeBaseReport(gd, {
        assignment,
        horizonDays: 1,
        options: {
          activeOptionalConsumables,
          priceResolver: wrappedPriceResolver,
          technologyLevels: technologyLevelsOption,
          startingBonus: toValue(startingBonus),
          globalWorkforceBurden: toValue(globalWorkforceBurden),
        },
      })

      // Calculate net profit from report summary
      const netProfit = report.summary.net
      totalNetProfit += netProfit
    })

    return totalNetProfit
  }

  /**
   * Get forecast for a specific technology increase
   */
  const getForecast = (technologyId: TechnologySpecialisation): TechnologyNetProfitForecast => {
    const gd = toValue(gameData)
    const currentLevels = toValue(technologyLevels)
    const currentLevel = currentLevels[technologyId] ?? 0

    // Calculate current net profit with current planned levels
    const currentNetProfit = calculateNetProfit(currentLevels)

    // Calculate forecasted net profit with +1 level for this technology
    const forecastedLevels = {
      ...currentLevels,
      [technologyId]: currentLevel + 1,
    }
    const forecastedNetProfit = calculateNetProfit(forecastedLevels)

    // Calculate change
    const netProfitChange = forecastedNetProfit - currentNetProfit
    const percentChange = currentNetProfit !== 0 ? (netProfitChange / Math.abs(currentNetProfit)) * 100 : 0

    // Calculate upgrade cost (same logic as changeTracker)
    let totalTechnologies = 0
    
    // Add current technology levels from world data
    const currentWorldTech = toValue(bases)[0] // We need access to current world state
    // For now, use the sum of planned levels as approximation
    Object.values(currentLevels).forEach((level) => {
      totalTechnologies += level
    })

    const upgradeCost = computeTechnologyResearchCost(
      technologyId,
      currentLevel,
      currentLevel + 1,
      gd ? { materials: gd.materials } : undefined,
      totalTechnologies
    )

    // Parse the upgrade cost to get numeric value
    // Format: "80× Research Data" or "43× T2, 59× T3" etc.
    let upgradeCostValue = 0
    if (upgradeCost && gd) {
      const resolver = toValue(priceResolver)
      if (resolver) {
        // Parse each material from the cost string
        const parts = upgradeCost.split(', ')
        parts.forEach((part) => {
          const match = part.match(/^(\d+)×\s*(.+)$/)
          if (match && match[1] && match[2]) {
            const amount = parseInt(match[1], 10)
            const materialName = match[2].trim()
            // Find material ID by name
            const material = gd.materials.find((m) => m.name === materialName)
            if (material) {
              const price = resolver(material.id) ?? 0
              upgradeCostValue += amount * price
            }
          }
        })
      }
    }

    // Calculate ROI (days to break even)
    let roiDays: number | undefined = undefined
    if (netProfitChange > 0 && upgradeCostValue > 0) {
      roiDays = upgradeCostValue / netProfitChange
    }

    return {
      currentNetProfit,
      forecastedNetProfit,
      netProfitChange,
      percentChange,
      upgradeCost,
      upgradeCostValue,
      roiDays,
    }
  }

  /**
   * Get forecasts for all technologies
   */
  const allForecasts = computed(() => {
    const forecasts = new Map<TechnologySpecialisation, TechnologyNetProfitForecast>()
    const techLevels = toValue(technologyLevels)

    // Calculate for each technology
    const techIds: TechnologySpecialisation[] = [1, 2, 3, 4, 5, 6, 7, 8, 10]
    techIds.forEach((techId) => {
      forecasts.set(techId, getForecast(techId))
    })

    return forecasts
  })

  return {
    getForecast,
    allForecasts,
  }
}
