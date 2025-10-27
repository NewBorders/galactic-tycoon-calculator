const API_URL = 'https://api.g2.galactictycoons.com/gamedata.json'
const FALLBACK_URL = '/gamedata.fallback.json'
const CACHE_KEY = 'gt:gamedata:v2'
const DEFAULT_TTL_MS = Number(6 * 60 * 60 * 1000)

export type Material = { id: number; name: string; type?: number }
export type Building = { id: number; name: string; specialization?: number }
export type RecipeV2Raw = {
  id: number
  inputs?: Array<{ id: number; am: number }>
  output: { id: number; am: number }
  producedIn: number
  reqTech: number
  timeMinutes: number
  type: number
  name?: string
}

export type GameData = {
  materials: Material[]
  buildings: Building[]
  recipes: RecipeV2Raw[]
  [k: string]: any
}

function normalizeGameData(raw: unknown): GameData {
  const r = (raw as any) ?? {}
  return {
    materials: Array.isArray(r.materials) ? r.materials : [],
    buildings: Array.isArray(r.buildings) ? r.buildings : [],
    recipes: Array.isArray(r.recipes) ? r.recipes : [],
    ...r,
  }
}

function readCache(): { data: GameData; ts: number } | null {
  try {
    const s = localStorage.getItem(CACHE_KEY)
    if (!s) return null
    const parsed = JSON.parse(s)
    return { data: normalizeGameData(parsed.data), ts: parsed.ts }
  } catch {
    return null
  }
}

function writeCache(data: GameData) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data: normalizeGameData(data), ts: Date.now() }),
    )
  } catch {}
}

async function fetchJson(url: string, timeoutMs = 15000): Promise<unknown> {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), timeoutMs)
  try {
    const r = await fetch(url, { signal: c.signal, headers: { Accept: 'application/json' } })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return await r.json()
  } finally {
    clearTimeout(t)
  }
}

export async function loadGameData(opts?: {
  force?: boolean
  ttlMs?: number
}): Promise<{ data: GameData; fromCache: boolean; source: 'api' | 'fallback' | 'cache' }> {
  const ttl = opts?.ttlMs ?? DEFAULT_TTL_MS

  if (!opts?.force) {
    const c = readCache()
    if (c && Date.now() - c.ts < ttl) return { data: c.data, fromCache: true, source: 'cache' }
  }

  try {
    const apiRaw = await fetchJson(API_URL)
    const api = normalizeGameData(apiRaw)
    writeCache(api)
    return { data: api, fromCache: false, source: 'api' }
  } catch {
    try {
      const fbRaw = await fetchJson(FALLBACK_URL)
      const fb = normalizeGameData(fbRaw)
      writeCache(fb)
      return { data: fb, fromCache: false, source: 'fallback' }
    } catch {
      const c = readCache()
      if (c) return { data: c.data, fromCache: true, source: 'cache' }
      throw new Error('GameData: API und Fallback fehlgeschlagen, kein Cache vorhanden')
    }
  }
}
