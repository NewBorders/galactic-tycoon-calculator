import { computed, type Ref, type ComputedRef } from 'vue'

/**
 * Composable for economic calculations
 * Handles profit, revenue, and cost calculations
 */
export function useEconomicCalculations(
  dailyAmount: Ref<number> | ComputedRef<number>,
  price: Ref<number> | ComputedRef<number>
) {
  /**
   * Daily profit/cost for this material
   * Positive = profit (selling/producing)
   * Negative = cost (buying/consuming)
   */
  const dailyProfit = computed(() => {
    return dailyAmount.value * price.value
  })

  /**
   * Daily revenue (only if positive balance)
   */
  const dailyRevenue = computed(() => {
    return dailyAmount.value > 0 ? dailyAmount.value * price.value : 0
  })

  /**
   * Daily cost (only if negative balance)
   */
  const dailyCost = computed(() => {
    return dailyAmount.value < 0 ? Math.abs(dailyAmount.value) * price.value : 0
  })

  /**
   * Whether this material generates profit
   */
  const isProfitable = computed(() => {
    return dailyProfit.value > 0
  })

  /**
   * Whether this material has a cost
   */
  const hasCost = computed(() => {
    return dailyProfit.value < 0
  })

  /**
   * Whether this material is neutral (no profit, no cost)
   */
  const isNeutral = computed(() => {
    return dailyProfit.value === 0
  })

  return {
    dailyProfit,
    dailyRevenue,
    dailyCost,
    isProfitable,
    hasCost,
    isNeutral,
  }
}
