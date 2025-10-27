import { ref, watch, type Ref } from 'vue'
import { GAME_LIMITS } from '../config/constants'
import { loadData, saveData } from '../utils/storage/localStorageManager'

// Shared state - singleton pattern for worker plan days
let workerPlanDaysRef: Ref<number> | null = null
let watcherInitialized = false

/**
 * Composable for managing worker planning days state
 * Used in WorkerConsumption component
 * Persists data to localStorage automatically
 * Uses singleton pattern to share state across all components
 */
export function useWorkerPlanDays(initialDays: number = GAME_LIMITS.DEFAULT_PLAN_DAYS): {
  planDays: Ref<number>
  setPlanDays: (days: number) => void
  resetPlanDays: () => void
} {
  // Initialize shared ref only once
  if (!workerPlanDaysRef) {
    // Load from localStorage if available
    const savedData = loadData()
    const savedPlanDays = savedData?.workerPlanDays ?? initialDays
    
    workerPlanDaysRef = ref(savedPlanDays)
  }

  /**
   * Set plan days with validation and save to localStorage
   */
  const setPlanDays = (days: number): void => {
    const validDays = Math.max(
      GAME_LIMITS.MIN_PLAN_DAYS,
      Math.min(GAME_LIMITS.MAX_PLAN_DAYS, days)
    )
    workerPlanDaysRef!.value = validDays
  }

  /**
   * Reset to default plan days
   */
  const resetPlanDays = (): void => {
    workerPlanDaysRef!.value = GAME_LIMITS.DEFAULT_PLAN_DAYS
  }

  /**
   * Watch for changes and save to localStorage (only initialize once)
   */
  if (!watcherInitialized) {
    watch(workerPlanDaysRef, (newValue) => {
      const currentData = loadData() || {}
      saveData({
        ...currentData,
        workerPlanDays: newValue,
      })
    })
    watcherInitialized = true
  }

  return {
    planDays: workerPlanDaysRef,
    setPlanDays,
    resetPlanDays,
  }
}
