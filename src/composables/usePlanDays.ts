import { ref, type Ref } from 'vue'
import { GAME_LIMITS } from '../config/constants'

/**
 * Composable for managing planning days state
 * Centralizes the logic for plan days across components
 */
export function usePlanDays(initialDays: number = GAME_LIMITS.DEFAULT_PLAN_DAYS): {
  planDays: Ref<number>
  setPlanDays: (days: number) => void
  resetPlanDays: () => void
} {
  const planDays = ref(initialDays)

  /**
   * Set plan days with validation
   */
  const setPlanDays = (days: number): void => {
    const validDays = Math.max(
      GAME_LIMITS.MIN_PLAN_DAYS,
      Math.min(GAME_LIMITS.MAX_PLAN_DAYS, days)
    )
    planDays.value = validDays
  }

  /**
   * Reset to default plan days
   */
  const resetPlanDays = (): void => {
    planDays.value = GAME_LIMITS.DEFAULT_PLAN_DAYS
  }

  return {
    planDays,
    setPlanDays,
    resetPlanDays,
  }
}
