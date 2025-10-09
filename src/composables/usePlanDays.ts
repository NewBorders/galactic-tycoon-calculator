import { ref, watch, type Ref } from 'vue'
import { GAME_LIMITS } from '../config/constants'
import { loadData, saveData } from '../utils/storage/localStorageManager'

// Shared state - singleton pattern
let planDaysRef: Ref<number> | null = null
let watcherInitialized = false

/**
 * Composable for managing planning days state
 * Centralizes the logic for plan days across components
 * Persists data to localStorage automatically
 * Uses singleton pattern to share state across all components
 */
export function usePlanDays(initialDays: number = GAME_LIMITS.DEFAULT_PLAN_DAYS): {
  planDays: Ref<number>
  setPlanDays: (days: number) => void
  resetPlanDays: () => void
} {
  // Initialize shared ref only once
  if (!planDaysRef) {
    // Load from localStorage if available
    const savedData = loadData()
    const savedPlanDays = savedData?.planDays ?? initialDays
    
    planDaysRef = ref(savedPlanDays)
  }

  /**
   * Set plan days with validation and save to localStorage
   */
  const setPlanDays = (days: number): void => {
    const validDays = Math.max(
      GAME_LIMITS.MIN_PLAN_DAYS,
      Math.min(GAME_LIMITS.MAX_PLAN_DAYS, days)
    )
    planDaysRef!.value = validDays
  }

  /**
   * Reset to default plan days
   */
  const resetPlanDays = (): void => {
    planDaysRef!.value = GAME_LIMITS.DEFAULT_PLAN_DAYS
  }

  /**
   * Watch for changes and save to localStorage (only initialize once)
   */
  if (!watcherInitialized && planDaysRef) {
    watch(planDaysRef, (newValue) => {
      const currentData = loadData() || {}
      saveData({
        ...currentData,
        planDays: newValue,
      })
    })
    watcherInitialized = true
  }

  // This should never happen due to initialization above, but TypeScript needs it
  if (!planDaysRef) {
    throw new Error('planDaysRef not initialized')
  }

  return {
    planDays: planDaysRef,
    setPlanDays,
    resetPlanDays,
  }
}
