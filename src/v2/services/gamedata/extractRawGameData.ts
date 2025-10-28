const API_URL = 'https://api.g2.galactictycoons.com/gamedata.json'
const FALLBACK_URL = '/gamedata.fallback.json'

async function fetchJson(url: string, timeoutMs = 15000): Promise<any> {
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

export async function extractRaw(): Promise<{ raw: any; source: 'api' | 'fallback' }> {
  try {
    return { raw: await fetchJson(API_URL), source: 'api' }
  } catch {
    return { raw: await fetchJson(FALLBACK_URL), source: 'fallback' }
  }
}
