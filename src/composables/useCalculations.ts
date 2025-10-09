import { computed, type Ref } from 'vue'
import type { BuildingInstance, GameData, Recipe, Calculations, IndustryType, WorkerTier } from '../types'
import { TIME_CONSTANTS } from '../config/constants'
import { WORKER_CONSUMPTION_BY_TIER } from '../data/workerConsumption'

export function useCalculations(
  buildings: Ref<BuildingInstance[]>,
  gameData: GameData,
  productivityByTier: Ref<[number, number, number, number]>,
  gameSpeed: Ref<number>,
  technologyLevels: Ref<Record<IndustryType, number>>,
) {
  const calculations = computed((): Calculations => {
    const totalInputs: Record<string, number> = {}
    const totalOutputs: Record<string, number> = {}
    let totalWorkers = 0
    const totalWorkersByTier: [number, number, number, number] = [0, 0, 0, 0]

    buildings.value.forEach((building) => {
      const buildingData = gameData.buildings[building.buildingType]
      if (!buildingData) return

      const qty = building.quantity
      totalWorkers += buildingData.workers * qty
      
      // Acumular workers por tier
      buildingData.workersByTier.forEach((count, index) => {
        if (index < 4 && totalWorkersByTier[index] !== undefined) {
          totalWorkersByTier[index] += count * qty
        }
      })

      let totalRoundTime = 0
      const recipeDetails: Array<{ recipe: Recipe; recipeTime: number }> = []

      building.recipes.forEach((recipeItem) => {
        const recipe = buildingData.recipes[recipeItem.recipeKey]
        if (!recipe) return

        let recipeTime = recipe.time

        // Aplicar planet modifier si existe en la receta (para Resource Extraction)
        if (recipeItem.planetModifier && recipeItem.planetModifier !== 100) {
          recipeTime = recipe.time * (100 / recipeItem.planetModifier)
        }

        // Determinar qué tier de worker tiene este edificio
        // Un edificio usa el tier del primer worker que tenga
        let workerTierIndex = 0
        for (let i = 0; i < buildingData.workersByTier.length; i++) {
          const tierCount = buildingData.workersByTier[i]
          if (tierCount !== undefined && tierCount > 0) {
            workerTierIndex = i
            break
          }
        }
        
        // Usar la productividad específica de ese tier
        const tierProductivity = productivityByTier.value[workerTierIndex]
        if (tierProductivity === undefined) return
        
        // Apply technology as multiplier (not additive)
        const techLevel = technologyLevels.value[buildingData.industryType] || 0
        const techMultiplier = (100 + techLevel) / 100
        
        const productivityMultiplier = tierProductivity / 100
        
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

    // Calcular consumo de workers por tier
    const workerConsumption: Record<string, number> = {}
    const tierNames: WorkerTier[] = ['worker', 'technician', 'engineer', 'scientist']
    
    totalWorkersByTier.forEach((count, index) => {
      if (count > 0) {
        const tierName = tierNames[index]
        if (!tierName) return
        
        const tierConsumption = WORKER_CONSUMPTION_BY_TIER[tierName]
        if (!tierConsumption) return
        
        const workerGroups = count / 100
        
        Object.entries(tierConsumption).forEach(([resource, amount]) => {
          if (typeof amount === 'number') {
            workerConsumption[resource] = (workerConsumption[resource] || 0) + (amount * workerGroups)
          }
        })
      }
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
      totalWorkersByTier,
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
