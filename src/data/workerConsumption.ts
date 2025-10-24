/**
 * Worker Consumption Rates
 * Resources consumed per 100 workers per day, organized by worker tier
 */

import type { WorkerTier } from '../types'

/**
 * Consumo de recursos por cada 100 trabajadores por día
 * Cada tier tiene diferentes necesidades
 */
export const WORKER_CONSUMPTION_BY_TIER: Record<WorkerTier, Record<string, number>> = {
  worker: {
    // Essential consumables (Tier 1)
    rations: 24.0,
    drinking_water: 32.0,
    tools: 12.0,
    
    // Optional consumables
    workwear: 8.0,
    ale: 7.2,
    pie: 1.6,
  },
  technician: {
    // Essential consumables (Tier 2)
    fine_rations: 24.0,
    drinking_water: 48.0,
    workwear: 16.0,
    
    // Optional consumables
    coffee: 8.0,
    exosuit: 2.4,
    pie: 2.4,
  },
  engineer: {
    // Essential consumables (Tier 3)
    fine_rations: 28.0,
    vitaqua: 44.0,
    advanced_tools: 12.0,
    
    // Optional consumables
    coffee: 8.0,
    robot: 0.8,
    rejuvaline: 4.0,
  },
  scientist: {
    // Essential consumables (Tier 4)
    gourmet_rations: 28.0,
    vitaqua: 44.0,
    spectra_modulator: 6.0,
    
    // Optional consumables
    laboratory_suit: 4.0,
    nanites: 4.0,
    rejuvaline: 4.8,
  },
}

/**
 * Consumo legacy para retrocompatibilidad
 * TODO: Actualizar componentes para usar WORKER_CONSUMPTION_BY_TIER
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
