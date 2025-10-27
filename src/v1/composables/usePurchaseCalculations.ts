import { computed, type Ref, type ComputedRef } from 'vue'

/**
 * Composable for calculating purchase requirements
 * Handles the logic for determining how much material to buy based on consumption and stock
 */
export function usePurchaseCalculations(
  dailyBalance: Ref<number> | ComputedRef<number>,
  currentStock: Ref<number> | ComputedRef<number>,
  planDays: Ref<number>,
  price: Ref<number> | ComputedRef<number>
) {
  /**
   * Total consumption over the planning period
   */
  const totalConsumption = computed(() => {
    return Math.abs(dailyBalance.value) * planDays.value
  })

  /**
   * Amount needed to buy (consumption - current stock)
   * Returns 0 if we have enough stock or if balance is positive (producing)
   */
  const needToBuy = computed(() => {
    // If balance is positive (producing), no need to buy
    if (dailyBalance.value >= 0) {
      return 0
    }
    
    const needed = totalConsumption.value - currentStock.value
    return Math.max(0, needed)
  })

  /**
   * Total cost of required purchase
   */
  const purchaseCost = computed(() => {
    return Math.ceil(needToBuy.value) * price.value
  })

  /**
   * Whether we need to make a purchase
   */
  const needsPurchase = computed(() => {
    return needToBuy.value > 0
  })

  return {
    totalConsumption,
    needToBuy,
    purchaseCost,
    needsPurchase,
  }
}
