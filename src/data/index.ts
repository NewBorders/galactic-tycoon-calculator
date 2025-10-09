import type { GameData } from '../types'
import { BUILDINGS } from './buildings'
import { MATERIALS } from './materials'
import { WORKER_CONSUMPTION } from './workerConsumption'

/**
 * Central game data export
 * All buildings, materials, and configuration in one place
 */
export const GAME_DATA: GameData = {
  buildings: BUILDINGS,
  materials: MATERIALS,
  workerConsumption: WORKER_CONSUMPTION,
}

/**
 * Export individual sections for granular imports when needed
 */
export { BUILDINGS } from './buildings'
export { MATERIALS } from './materials'
export { WORKER_CONSUMPTION } from './workerConsumption'
