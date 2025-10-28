import { normalize } from './transformRawToTypes'
import type { GameData, GdIndex } from './types'
import { extractRaw } from './extractRawGameData'

const LS_KEY = 'gt:v2:gd:normalized'
const TTL_MS = 6 * 60 * 60 * 1000

type CacheEntry = { ts: number; data: GameData }

const readCache = (): GameData | null => {
  try {
    const s = localStorage.getItem(LS_KEY)
    if (!s) return null
    const e = JSON.parse(s) as CacheEntry
    if (Date.now() - e.ts > TTL_MS) return null
    return e.data
  } catch {
    return null
  }
}
const writeCache = (data: GameData) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), data }))
  } catch {}
}

export function buildIndex(gd: GameData): GdIndex {
  return {
    materialById: new Map(gd.materials.map((m) => [m.id, m])),
    buildingById: new Map(gd.buildings.map((b) => [b.id, b])),
    planetById: new Map(gd.planets.map((p) => [p.id, p])),
    systemById: new Map(gd.systems.map((s) => [s.id, s])),
  }
}

export async function loadGameData(force = false): Promise<{
  data: GameData
  index: GdIndex
  source: 'api' | 'fallback' | 'cache'
}> {
  if (!force) {
    const c = readCache()
    if (c) return { data: c, index: buildIndex(c), source: 'cache' }
  }
  const { raw, source } = await extractRaw()
  const data = normalize(raw)
  writeCache(data)
  return { data, index: buildIndex(data), source }
}
