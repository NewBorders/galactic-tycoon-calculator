import { normalize } from './transformRawToTypes'
import type { GameData, GdIndex } from './types'
import { extractRaw } from './extractRawGameData'
import type { World } from '../api/types'
import { getWorld } from '../api/apiKeyManager'

const LS_KEY_PREFIX = 'gt:v2:gd:normalized'
const TTL_MS = 6 * 60 * 60 * 1000

type CacheEntry = { ts: number; data: GameData }

const getCacheKey = (world: World): string => `${LS_KEY_PREFIX}:${world}`

const readCache = (world: World): CacheEntry | null => {
  try {
    const s = localStorage.getItem(getCacheKey(world))
    if (!s) return null
    const e = JSON.parse(s) as CacheEntry
    if (!e || typeof e.ts !== 'number' || !e.data) return null
    if (Date.now() - e.ts > TTL_MS) return null
    return e
  } catch {
    return null
  }
}
const writeCache = (world: World, entry: CacheEntry) => {
  try {
    localStorage.setItem(getCacheKey(world), JSON.stringify(entry))
  } catch {}
}

export function buildIndex(gd: GameData): GdIndex {
  return {
    materialById: new Map(gd.materials.map((m) => [m.id, m])),
    buildingById: new Map(gd.buildings.map((b) => [b.id, b])),
    planetById: new Map(gd.planets.map((p) => [p.id, p])),
    systemById: new Map(gd.systems.map((s) => [s.id, s])),
    recipeById: new Map(gd.recipes.map((r) => [r.id, r])),
    workerByType: new Map(gd.workers.map((w) => [w.type, w])),
  }
}

// Singleton state for the repository
let cachedGameData: GameData | null = null
let cachedIndex: GdIndex | null = null

/**
 * Initialize the repository with game data
 * This should be called once at app startup
 */
export function initializeRepository(data: GameData, index: GdIndex): void {
  cachedGameData = data
  cachedIndex = index
}

/**
 * Get the cached game data
 * Throws if repository is not initialized
 */
export function getGameData(): GameData {
  if (!cachedGameData) {
    throw new Error('GameData repository not initialized. Call initializeRepository first.')
  }
  return cachedGameData
}

/**
 * Get the cached index
 * Throws if repository is not initialized
 */
export function getIndex(): GdIndex {
  if (!cachedIndex) {
    throw new Error('GameData repository not initialized. Call initializeRepository first.')
  }
  return cachedIndex
}

/**
 * Check if repository is initialized
 */
export function isInitialized(): boolean {
  return cachedGameData !== null && cachedIndex !== null
}

export async function loadGameData(force = false): Promise<{
  data: GameData
  index: GdIndex
  source: 'api' | 'fallback' | 'cache'
  loadedAt: number
}> {
  const world = getWorld()
  if (!force) {
    const c = readCache(world)
    if (c) {
      const data = c.data
      const index = buildIndex(data)
      initializeRepository(data, index)
      return { data, index, source: 'cache', loadedAt: c.ts }
    }
  }
  const { raw, source } = await extractRaw()
  const data = normalize(raw)
  const ts = Date.now()
  writeCache(world, { ts, data })
  const index = buildIndex(data)
  initializeRepository(data, index)
  return { data, index, source, loadedAt: ts }
}

/**
 * Get material name by ID
 * Uses cached repository data
 */
export function getMaterialNameById(materialId: number): string {
  const index = getIndex()
  return index.materialById.get(materialId)?.name || `Material ${materialId}`
}

/**
 * Get building name by ID
 * Uses cached repository data
 */
export function getBuildingNameById(buildingId: number): string {
  const index = getIndex()
  return index.buildingById.get(buildingId)?.name || `Building ${buildingId}`
}

/**
 * Get planet name by ID
 * Uses cached repository data
 */
export function getPlanetNameById(planetId: number): string {
  const index = getIndex()
  return index.planetById.get(planetId)?.name || `Planet ${planetId}`
}

/**
 * Get recipe name by ID
 * Recipes don't have a direct name property, so we return the output material name
 * Uses cached repository data
 */
export function getRecipeNameById(recipeId: number): string {
  const index = getIndex()
  const recipe = index.recipeById.get(recipeId)
  return recipe?.output.name || `Recipe ${recipeId}`
}

/**
 * Get worker name by tier
 * Workers don't have names, so we use localized tier names
 */
export function getWorkerNameByTier(tier: number): string {
  // Workers don't have a name property, return tier identifier
  const tierNames: Record<number, string> = {
    1: 'Worker',
    2: 'Technician',
    3: 'Engineer',
    4: 'Scientist'
  }
  return tierNames[tier] || `Worker Tier ${tier}`
}

/**
 * Get exchange link for a material
 * Returns the URL to the material's exchange page on the current world
 */
export function getMaterialExchangeLink(materialId: number): string {
  const world = getWorld()
  return `https://${world}.galactictycoons.com/exchange/${materialId}`
}
