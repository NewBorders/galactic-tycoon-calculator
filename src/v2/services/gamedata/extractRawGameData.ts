import { getWorld } from '../api/apiKeyManager'
import { createLogger } from '../debug/logger'

const logger = createLogger('GameDataExtract')
const apiCallCounts = new Map<string, number>()

function trackApiCall(label: string) {
  const next = (apiCallCounts.get(label) ?? 0) + 1
  apiCallCounts.set(label, next)
  logger.debug('[API Call]', label, 'count:', next)
}

function getApiUrl(): string {
  const world = getWorld()
  return `https://api.${world}.galactictycoons.com/gamedata.json`
}

const FALLBACK_URL = '/gamedata.fallback.json'

async function fetchJson<T = unknown>(url: string, timeoutMs = 15000): Promise<T> {
  trackApiCall(url)
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), timeoutMs)
  try {
    const r = await fetch(url, { signal: c.signal, headers: { Accept: 'application/json' } })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return (await r.json()) as T
  } finally {
    clearTimeout(t)
  }
}

import type { GameDataRaw } from './types.raw'

export async function extractRaw(): Promise<{ raw: GameDataRaw; source: 'api' | 'fallback' }> {
  try {
    return { raw: await fetchJson<GameDataRaw>(getApiUrl()), source: 'api' }
  } catch {
    return { raw: await fetchJson<GameDataRaw>(FALLBACK_URL), source: 'fallback' }
  }
}
