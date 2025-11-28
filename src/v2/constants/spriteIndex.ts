import { ref } from 'vue'
import { MATERIAL_ICON_OVERRIDES, normalizeIconId } from './iconOverrides'

const loaded = ref(false)
const symbolIds = new Set<string>()
const normalizedToId = new Map<string, string>()

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function loadSpriteIndex(): Promise<void> {
  try {
    const res = await fetch('/galactic_tycoon_sprites.svg', { headers: { Accept: 'image/svg+xml' } })
    if (!res.ok) return
    const text = await res.text()
    const re = /<symbol\s+[^>]*id="([^"]+)"/g
    symbolIds.clear()
    normalizedToId.clear()
    for (const m of text.matchAll(re)) {
      const id = m[1]
      if (!id) continue
      symbolIds.add(String(id))
      normalizedToId.set(normKey(String(id)), String(id))
    }
    loaded.value = true
  } catch {
    // ignore fetch errors; fallback resolver will apply
  }
}

let started = false
export function ensureSpriteIndexLoaded(): void {
  if (started) return
  started = true
  if (typeof window !== 'undefined') void loadSpriteIndex()
}

export function resolveIconId(name: string): string {
  if (!name) return '_fallback'
  // 1) manual overrides
  const o = MATERIAL_ICON_OVERRIDES[name]
  if (o) return o
  // 2) direct candidate: remove spaces only
  const candidate = normalizeIconId(name)
  if (symbolIds.has(candidate)) return candidate
  // 3) if index loaded: match by normalized key (case/char-insensitive)
  if (loaded.value) {
    const byKey = normalizedToId.get(normKey(name))
    if (byKey) return byKey
  }
  // 4) fallback to candidate; sprite may still contain it with different case
  return candidate
}

// Kick off loading in browser
ensureSpriteIndexLoaded()

export const spriteIndexReady = loaded
