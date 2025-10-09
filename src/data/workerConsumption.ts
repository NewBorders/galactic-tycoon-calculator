/**
 * Worker Consumption Rates
 * Resources consumed per 100 workers per day
 */
export const WORKER_CONSUMPTION: Record<string, number> = {
  // Essential consumables
  rations: 24,
  drinking_water: 32,
  tools: 12,
  
  // Optional consumables (provide productivity bonuses)
  workwear: 8,
  ale: 7,
  pie: 2,
}
