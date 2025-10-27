import type { WorkerTier } from '../types'

/**
 * Nombres legibles de cada tier de trabajador
 */
export const WORKER_TIER_NAMES: Record<WorkerTier, string> = {
  worker: 'Worker',
  technician: 'Technician',
  engineer: 'Engineer',
  scientist: 'Scientist',
}

/**
 * Obtiene el nombre del tier de trabajador por índice (0-3)
 */
export function getWorkerTierName(index: 0 | 1 | 2 | 3): string {
  const tiers: WorkerTier[] = ['worker', 'technician', 'engineer', 'scientist']
  const tier = tiers[index]
  if (!tier) return 'Unknown'
  return WORKER_TIER_NAMES[tier]
}

/**
 * Calcula el total de workers desde un array de workers por tier
 */
export function getTotalWorkers(workersByTier: [number, number, number, number]): number {
  return workersByTier.reduce((sum, count) => sum + count, 0)
}
