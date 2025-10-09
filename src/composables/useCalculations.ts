import { computed, type Ref } from 'vue'
import type { BuildingInstance, GameData, Recipe, Calculations, IndustryType } from '../types'
import { TIME_CONSTANTS } from '../config/constants'

export function useCalculations(
  buildings: Ref<BuildingInstance[]>,
  gameData: GameData,
  productivity: Ref<number>,
  gameSpeed: Ref<number>,
  technologyLevels: Ref<Record<IndustryType, number>>,
) {
  const calculations = computed((): Calculations => {
    const totalInputs: Record<string, number> = {}
    const totalOutputs: Record<string, number> = {}
    let totalWorkers = 0

    buildings.value.forEach((building) => {
      const buildingData = gameData.buildings[building.buildingType]
      if (!buildingData) return

      const qty = building.quantity
      totalWorkers += buildingData.workers * qty

      let totalRoundTime = 0
      const recipeDetails: Array<{ recipe: Recipe; recipeTime: number }> = []

      building.recipes.forEach((recipeItem) => {
        const recipe = buildingData.recipes[recipeItem.recipeKey]
        if (!recipe) return

        let recipeTime = recipe.time

        if (building.buildingType === 'mine' && building.planetModifiers?.[recipeItem.recipeKey]) {
          recipeTime = recipe.time * (100 / building.planetModifiers[recipeItem.recipeKey])
        }

        // Apply technology as multiplier (not additive)
        // Technology 10% = 110% multiplier (1.10)
        const techLevel = technologyLevels.value[buildingData.industryType] || 0
        const techMultiplier = (100 + techLevel) / 100 // Convert to multiplier
        
        // Apply productivity as efficiency (70% = 0.70)
        const productivityMultiplier = productivity.value / 100
        
        // Combined multiplier (multiplicative, not additive)
        const combinedMultiplier = productivityMultiplier * techMultiplier
        
        // Apply to recipe time (higher multiplier = less time)
        recipeTime = recipeTime / combinedMultiplier
        
        // Apply game speed
        recipeTime = recipeTime / gameSpeed.value

        totalRoundTime += recipeTime
        recipeDetails.push({ recipe, recipeTime })
      })

      const roundsPerDay = TIME_CONSTANTS.MINUTES_PER_DAY / totalRoundTime

      recipeDetails.forEach(({ recipe }) => {
        if (recipe.inputs) {
          Object.entries(recipe.inputs).forEach(([material, amount]) => {
            const dailyAmount = amount * qty * roundsPerDay
            totalInputs[material] = (totalInputs[material] || 0) + dailyAmount
          })
        }

        if (recipe.outputs) {
          Object.entries(recipe.outputs).forEach(([material, amount]) => {
            const dailyAmount = amount * qty * roundsPerDay
            totalOutputs[material] = (totalOutputs[material] || 0) + dailyAmount
          })
        }
      })
    })

    const workerConsumption: Record<string, number> = {}
    const workerGroups = totalWorkers / 100
    Object.entries(gameData.workerConsumption).forEach(([resource, amount]) => {
      workerConsumption[resource] = amount * workerGroups
    })

    const netBalance: Record<string, number> = {}

    Object.entries(totalOutputs).forEach(([material, amount]) => {
      netBalance[material] = (netBalance[material] || 0) + amount
    })

    Object.entries(totalInputs).forEach(([material, amount]) => {
      netBalance[material] = (netBalance[material] || 0) - amount
    })

    return {
      totalInputs,
      totalOutputs,
      netBalance,
      totalWorkers,
      workerConsumption,
    }
  })

  const timeToEmpty = computed(() => {
    const times: Record<string, number> = {}
    // Este cálculo necesita stock, lo calculamos en el componente principal
    return times
  })

  return {
    calculations,
    timeToEmpty,
  }
}
