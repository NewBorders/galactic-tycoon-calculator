import { computed, type Ref, type ComputedRef } from 'vue'

/**
 * Composable for calculating how many days of stock remain
 * Based on current stock and daily consumption/production rate
 */
export function useStockDays(
  currentStock: Ref<number> | ComputedRef<number>,
  dailyBalance: Ref<number> | ComputedRef<number>
) {
  /**
   * Number of days until stock runs out
   * Returns Infinity if producing (positive balance)
   * Returns 0 if no stock and consuming
   */
  const daysRemaining = computed(() => {
    // If producing (positive balance), stock will never run out
    if (dailyBalance.value >= 0) {
      return Infinity
    }

    // If no stock and consuming, it's already empty
    if (currentStock.value <= 0) {
      return 0
    }

    // Calculate days remaining
    return currentStock.value / Math.abs(dailyBalance.value)
  })

  /**
   * Whether stock is critically low (less than 1 day)
   */
  const isCritical = computed(() => {
    return daysRemaining.value < 1 && daysRemaining.value > 0
  })

  /**
   * Whether stock is low (less than 3 days)
   */
  const isLow = computed(() => {
    return daysRemaining.value < 3 && daysRemaining.value >= 1
  })

  /**
   * Whether stock is adequate (3+ days or infinite)
   */
  const isAdequate = computed(() => {
    return daysRemaining.value >= 3 || daysRemaining.value === Infinity
  })

  return {
    daysRemaining,
    isCritical,
    isLow,
    isAdequate,
  }
}
