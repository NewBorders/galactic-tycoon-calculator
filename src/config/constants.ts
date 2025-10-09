/**
 * Application constants and configuration values
 */

export const WORKER_CONFIG = {
  BASE_PRODUCTIVITY: 70,
  PRODUCTIVITY_BONUS_PER_OPTIONAL: 10,
  ESSENTIAL_CONSUMABLES: ['rations', 'drinking_water', 'tools'] as const,
  OPTIONAL_CONSUMABLES: ['ale', 'pie', 'workwear'] as const,
} as const

export const GAME_LIMITS = {
  MIN_GAME_SPEED: 0.1,
  MAX_GAME_SPEED: 10,
  GAME_SPEED_STEP: 0.1,
  MIN_TECH_LEVEL: 0,
  MAX_TECH_LEVEL: 100,
  MIN_BUILDING_QUANTITY: 1,
  MIN_PLANET_MODIFIER: 1,
  MAX_PLANET_MODIFIER: 200,
  MIN_PLAN_DAYS: 1,
  MAX_PLAN_DAYS: 365,
  DEFAULT_PLAN_DAYS: 7,
} as const

export const MATERIAL_CATEGORIES = {
  RAW: 'raw',
  PROCESSED: 'processed',
  MANUFACTURED: 'manufactured',
  CONSUMABLE: 'consumable',
  FOOD: 'food',
  SPACESHIP: 'spaceship',
  SPECIAL: 'special',
} as const

export const TIME_CONSTANTS = {
  MINUTES_PER_DAY: 24 * 60,
  HOURS_PER_DAY: 24,
} as const
