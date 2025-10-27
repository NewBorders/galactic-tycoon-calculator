const API_URL = import.meta.env.VITE_GAMEDATA_URL ?? 'https://api.g2.galactictycoons.com/gamedata.json';
const FALLBACK_URL = '/gamedata.fallback.json';
const CACHE_KEY = 'gt:gamedata:v2';
const DEFAULT_TTL_MS = Number(import.meta.env.VITE_GAMEDATA_TTL_MS ?? 6*60*60*1000);

export type GameData = {
  materials?: Array<{ id:number; name:string; type?:number; [k:string]:any }>;
  buildings?: Array<{ id:number; name:string; specialization?:number; [k:string]:any }>;
  [k:string]: any;
};

function readCache(): { data:GameData; ts:number } | null {
  try { const s = localStorage.getItem(CACHE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function writeCache(data: GameData) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}
async function fetchJson(url:string, timeoutMs=15000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal:c.signal, headers:{ Accept:'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

export async function loadGameData(opts?: { force?: boolean; ttlMs?: number }):
  Promise<{ data:GameData; fromCache:boolean; source:'api'|'fallback'|'cache' }>
{
  const ttl = opts?.ttlMs ?? DEFAULT_TTL_MS;

  if (!opts?.force) {
    const c = readCache();
    if (c && Date.now() - c.ts < ttl) return { data:c.data, fromCache:true, source:'cache' };
  }
  try {
    const api = await fetchJson(API_URL);
    writeCache(api);
    return { data:api, fromCache:false, source:'api' };
  } catch {
    try {
      const fb = await fetchJson(FALLBACK_URL);
      writeCache(fb);
      return { data:fb, fromCache:false, source:'fallback' };
    } catch {
      const c = readCache();
      if (c) return { data:c.data, fromCache:true, source:'cache' };
      throw new Error('GameData: API und Fallback fehlgeschlagen, kein Cache vorhanden');
    }
  }
}
