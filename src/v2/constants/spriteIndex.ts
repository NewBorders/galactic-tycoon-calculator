import { ref } from 'vue'
import { ALL_ICON_OVERRIDES, normalizeIconId } from './iconOverrides'

const loaded = ref(false)
const symbolIds = new Set<string>()
const normalizedToId = new Map<string, string>()

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Build sprite index from the already-loaded DOM sprite container
 * This function is called lazily when icons are first used
 */
function loadSpriteIndexFromDOM(): void {
  if (loaded.value) return

  const container = document.getElementById('svg-sprite-container')
  if (!container) {
    console.warn('[SpriteIndex] Sprite container not found in DOM')
    return
  }

  // Extract symbol IDs from the DOM
  const symbols = container.querySelectorAll('symbol[id]')
  symbolIds.clear()
  normalizedToId.clear()

  symbols.forEach((symbol) => {
    const id = symbol.getAttribute('id')
    if (!id) return
    symbolIds.add(id)
    normalizedToId.set(normKey(id), id)
  })

  loaded.value = true
  console.log('[SpriteIndex] Indexed', symbolIds.size, 'symbols from DOM')
}

export function ensureSpriteIndexLoaded(): void {
  // Don't do anything automatically - index will be built on first resolveIconId call
}

export function resolveIconId(name: string): string {
  // Lazy load index from DOM if not already loaded
  if (!loaded.value) {
    loadSpriteIndexFromDOM()
  }

  if (!name) return '_fallback'
  // 1) manual overrides
  const o = ALL_ICON_OVERRIDES[name]
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

// Don't load automatically
export const spriteIndexReady = loaded
