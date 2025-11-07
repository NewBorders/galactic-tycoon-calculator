import { normalize } from './transformRawToTypes'
import type { GameData, GdIndex } from './types'
import { extractRaw } from './extractRawGameData'

const LS_KEY = 'gt:v2:gd:normalized'
const TTL_MS = 6 * 60 * 60 * 1000

type CacheEntry = { ts: number; data: GameData }

const readCache = (): CacheEntry | null => {
  try {
    const s = localStorage.getItem(LS_KEY)
    if (!s) return null
    const e = JSON.parse(s) as CacheEntry
    if (!e || typeof e.ts !== 'number' || !e.data) return null
    if (Date.now() - e.ts > TTL_MS) return null
    return e
  } catch {
    return null
  }
}
const writeCache = (entry: CacheEntry) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entry))
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

export async function loadGameData(force = false): Promise<{
  data: GameData
  index: GdIndex
  source: 'api' | 'fallback' | 'cache'
  loadedAt: number
}> {
  if (!force) {
    const c = readCache()
    if (c) return { data: c.data, index: buildIndex(c.data), source: 'cache', loadedAt: c.ts }
  }
  const { raw, source } = await extractRaw()
  const data = normalize(raw)
  const ts = Date.now()
  writeCache({ ts, data })
  return { data, index: buildIndex(data), source, loadedAt: ts }
}
