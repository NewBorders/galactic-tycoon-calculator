import { ref, watch, type Ref } from 'vue'
import { GAME_LIMITS } from '../config/constants'
import { loadData, saveData } from '../utils/storage/localStorageManager'

// Shared state - singleton pattern for material plan days
let materialPlanDaysRef: Ref<number> | null = null
let watcherInitialized = false

/**
 * Composable for managing material planning days state
 * Used in NetBalance component
 * Persists data to localStorage automatically
 * Uses singleton pattern to share state across all components
 */
export function useMaterialPlanDays(initialDays: number = GAME_LIMITS.DEFAULT_PLAN_DAYS): {
  planDays: Ref<number>
  setPlanDays: (days: number) => void
  resetPlanDays: () => void
} {
  // Initialize shared ref only once
  if (!materialPlanDaysRef) {
    // Load from localStorage if available
    const savedData = loadData()
    const savedPlanDays = savedData?.materialPlanDays ?? initialDays
    
    materialPlanDaysRef = ref(savedPlanDays)
  }

  /**
   * Set plan days with validation and save to localStorage
   */
  const setPlanDays = (days: number): void => {
    const validDays = Math.max(
      GAME_LIMITS.MIN_PLAN_DAYS,
      Math.min(GAME_LIMITS.MAX_PLAN_DAYS, days)
    )
    materialPlanDaysRef!.value = validDays
  }

  /**
   * Reset to default plan days
   */
  const resetPlanDays = (): void => {
    materialPlanDaysRef!.value = GAME_LIMITS.DEFAULT_PLAN_DAYS
  }

  /**
   * Watch for changes and save to localStorage (only initialize once)
   */
  if (!watcherInitialized) {
    watch(materialPlanDaysRef, (newValue) => {
      const currentData = loadData() || {}
      saveData({
        ...currentData,
        materialPlanDays: newValue,
      })
    })
    watcherInitialized = true
  }

  return {
    planDays: materialPlanDaysRef,
    setPlanDays,
    resetPlanDays,
  }
}
