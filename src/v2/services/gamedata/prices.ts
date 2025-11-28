import { computed, onMounted, onUnmounted, reactive, readonly } from 'vue'
import type { GameData, Material } from './types'
import { getWorld } from '../api/apiKeyManager'
import type { World } from '../api/types'

function getApiUrl(): string {
  if (import.meta.env.DEV) {
    const world = getWorld()
    return `https://api.${world}.galactictycoons.com/public/exchange/mat-prices`
  }
  return '/api/prices'
}

const CACHE_KEY_PREFIX = 'gt:v2:prices:market'
const getCacheKey = (world: World): string => `${CACHE_KEY_PREFIX}:${world}`
const SETTINGS_KEY = 'gt:v2:prices:settings'
const CACHE_TTL = 30 * 60 * 1000
const POLL_INTERVAL = 5 * 60 * 1000

type PriceMode = 'current' | 'average' | 'weightedAverage' | 'manual'

type MarketPriceEntry = {
  materialId: number
  currentPrice: number | null
  averagePrice: number | null
  weightedAveragePrice: number | null
  updatedAt: number
}

type MaterialPriceOverride = {
  mode?: PriceMode
  manualPrice?: number | null
  locked?: boolean
}

type PriceSettings = {
  defaultMode: PriceMode
  overrides: Record<number, MaterialPriceOverride>
}

type PriceCache = {
  ts: number
  data: MarketPriceEntry[]
}

type PriceStore = {
  market: Map<number, MarketPriceEntry>
  settings: PriceSettings
  lastFetched: number
  loading: boolean
  error: string | null
  initialised: boolean
}

const priceStore: PriceStore = reactive({
  market: new Map(),
  settings: loadSettings(),
  lastFetched: 0,
  loading: false,
  error: null,
  initialised: false,
})

let poller: number | null = null
let subscribers = 0

function touchSettings() {
  priceStore.settings = {
    defaultMode: priceStore.settings.defaultMode,
    overrides: { ...priceStore.settings.overrides },
  }
}

function loadSettings(): PriceSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) {
      return { defaultMode: 'current', overrides: {} }
    }
    const parsed = JSON.parse(raw) as Partial<PriceSettings>
    const defaultMode: PriceMode =
      parsed?.defaultMode === 'current' ||
      parsed?.defaultMode === 'average' ||
      parsed?.defaultMode === 'weightedAverage' ||
      parsed?.defaultMode === 'manual'
        ? parsed.defaultMode
        : 'current'
    const overrides: Record<number, MaterialPriceOverride> = {}
    if (parsed?.overrides && typeof parsed.overrides === 'object') {
      Object.entries(parsed.overrides).forEach(([key, value]) => {
        const id = Number(key)
        if (Number.isNaN(id)) return
        if (!value || typeof value !== 'object') return
        const entry: MaterialPriceOverride = {}
        if (
          value.mode === 'current' ||
          value.mode === 'average' ||
          value.mode === 'weightedAverage' ||
          value.mode === 'manual'
        ) {
          entry.mode = value.mode
        }
        if (typeof value.manualPrice === 'number' && Number.isFinite(value.manualPrice)) {
          entry.manualPrice = value.manualPrice
        }
        if (typeof value.locked === 'boolean') {
          entry.locked = value.locked
        }
        overrides[id] = entry
      })
    }
    return { defaultMode, overrides }
  } catch {
    return { defaultMode: 'current', overrides: {} }
  }
}

function saveSettings(settings: PriceSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // ignore persistence issues
  }
}

function loadCachedMarket(world: World): PriceCache | null {
  try {
    const raw = localStorage.getItem(getCacheKey(world))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PriceCache
    if (!parsed?.data?.length) return null
    return parsed
  } catch {
    return null
  }
}

function saveMarketCache(world: World, data: MarketPriceEntry[]) {
  try {
    const payload: PriceCache = { ts: Date.now(), data }
    localStorage.setItem(getCacheKey(world), JSON.stringify(payload))
  } catch {
    // ignore persistence issues
  }
}

function toDollars(value: unknown): number | null {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num) || num <= 0) return null
  if (num > 1000) {
    return num / 100
  }
  return num
}

type ApiPriceEntry = {
  matId?: number
  materialId?: number
  currentPrice?: number
  current_price?: number
  avgPrice?: number
  averagePrice?: number
  weightedAvgPrice?: number
  weightedAveragePrice?: number
  weighted_avg_price?: number
}

type ApiResponse = {
  prices?: ApiPriceEntry[]
  data?: ApiPriceEntry[]
}

async function fetchMarketPricesFromApi(): Promise<MarketPriceEntry[]> {
  const response = await fetch(getApiUrl(), { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`Failed to fetch prices: ${response.status}`)
  }
  const json = (await response.json()) as ApiResponse
  const entries = json.prices ?? json.data ?? []
  const now = Date.now()
  return entries
    .map((entry) => {
      const id = entry.matId ?? entry.materialId
      if (!id || Number.isNaN(id)) return null
      const current =
        toDollars(entry.currentPrice ?? entry.current_price) ??
        toDollars(entry.avgPrice ?? entry.averagePrice) ??
        null
      const average = toDollars(entry.avgPrice ?? entry.averagePrice)
      const weighted = toDollars(
        entry.weightedAvgPrice ?? entry.weightedAveragePrice ?? entry.weighted_avg_price,
      )
      return {
        materialId: id,
        currentPrice: current,
        averagePrice: average ?? current,
        weightedAveragePrice: weighted ?? average ?? current,
        updatedAt: now,
      } satisfies MarketPriceEntry
    })
    .filter((entry): entry is MarketPriceEntry => Boolean(entry))
}

function ensureCacheLoaded() {
  if (priceStore.initialised) return
  const world = getWorld()
  const cached = loadCachedMarket(world)
  if (cached) {
    priceStore.market = new Map(cached.data.map((entry) => [entry.materialId, entry]))
    priceStore.lastFetched = cached.ts
  }
  priceStore.initialised = true
}

async function ensureMarketPrices(force = false): Promise<void> {
  ensureCacheLoaded()
  const now = Date.now()
  if (!force && priceStore.market.size > 0 && now - priceStore.lastFetched < CACHE_TTL) {
    return
  }
  if (priceStore.loading) return
  priceStore.loading = true
  try {
    const data = await fetchMarketPricesFromApi()
    priceStore.market = new Map(data.map((entry) => [entry.materialId, entry]))
    priceStore.lastFetched = Date.now()
    priceStore.error = null
    const world = getWorld()
    saveMarketCache(world, data)
  } catch (error: unknown) {
    priceStore.error = error instanceof Error ? error.message : 'Failed to fetch prices'
  } finally {
    priceStore.loading = false
  }
}

function startAutoRefresh() {
  if (poller != null) return
  poller = window.setInterval(() => {
    void ensureMarketPrices(true)
  }, POLL_INTERVAL)
}

function stopAutoRefresh() {
  if (poller == null) return
  if (subscribers > 0) return
  window.clearInterval(poller)
  poller = null
}

function pickPriceByMode(entry: MarketPriceEntry | undefined, mode: PriceMode): number | null {
  if (!entry) return null
  switch (mode) {
    case 'current':
      return entry.currentPrice ?? entry.averagePrice ?? entry.weightedAveragePrice
    case 'average':
      return entry.averagePrice ?? entry.weightedAveragePrice ?? entry.currentPrice
    case 'weightedAverage':
      return entry.weightedAveragePrice ?? entry.averagePrice ?? entry.currentPrice
    case 'manual':
      return null
    default:
      return null
  }
}

function resolveMaterialPrice(
  material: Material,
  marketEntry: MarketPriceEntry | undefined,
  settings: PriceSettings,
): number {
  const baseFallback = (material.calculatedPriceInCents ?? 0) / 100
  const override = settings.overrides[material.id]

  // MANUAL PRICES ALWAYS HAVE PRIORITY - check first regardless of mode
  if (override?.manualPrice != null && Number.isFinite(override.manualPrice) && override.manualPrice >= 0) {
    return override.manualPrice
  }

  // Use specified mode or default mode for API prices
  const mode: PriceMode = override?.mode ?? settings.defaultMode ?? 'current'

  const direct = pickPriceByMode(marketEntry, mode)
  if (direct != null && Number.isFinite(direct) && direct >= 0) {
    return direct
  }

  const alternative = pickPriceByMode(marketEntry, settings.defaultMode)
  if (alternative != null && Number.isFinite(alternative) && alternative >= 0) {
    return alternative
  }

  const fallbackMarket =
    marketEntry?.weightedAveragePrice ?? marketEntry?.averagePrice ?? marketEntry?.currentPrice
  if (fallbackMarket != null && Number.isFinite(fallbackMarket) && fallbackMarket >= 0) {
    return fallbackMarket
  }

  return baseFallback
}

function setDefaultMode(mode: PriceMode) {
  if (!['current', 'average', 'weightedAverage', 'manual'].includes(mode)) return
  priceStore.settings.defaultMode = mode
  touchSettings()
  saveSettings(priceStore.settings)
}

function setOverrideMode(materialId: number, mode: PriceMode | undefined) {
  if (!priceStore.settings.overrides[materialId]) {
    priceStore.settings.overrides[materialId] = {}
  }
  if (!mode) {
    delete priceStore.settings.overrides[materialId].mode
  } else if (['current', 'average', 'weightedAverage', 'manual'].includes(mode)) {
    priceStore.settings.overrides[materialId].mode = mode
  }
  touchSettings()
  saveSettings(priceStore.settings)
}

function setManualPrice(materialId: number, price: number | null) {
  if (!priceStore.settings.overrides[materialId]) {
    priceStore.settings.overrides[materialId] = {}
  }
  if (price == null || Number.isNaN(price) || price < 0) {
    delete priceStore.settings.overrides[materialId].manualPrice
  } else {
    priceStore.settings.overrides[materialId].manualPrice = price
  }
  touchSettings()
  saveSettings(priceStore.settings)
}

function setLocked(materialId: number, locked: boolean) {
  if (!priceStore.settings.overrides[materialId]) {
    priceStore.settings.overrides[materialId] = {}
  }
  priceStore.settings.overrides[materialId].locked = locked
  touchSettings()
  saveSettings(priceStore.settings)
}

/**
 * Reset price store state (used when switching worlds)
 */
export function resetPriceCache() {
  priceStore.market.clear()
  priceStore.lastFetched = 0
  priceStore.initialised = false
  priceStore.error = null
}

export function useMaterialPricing(gameData: GameData) {
  ensureCacheLoaded()
  onMounted(() => {
    subscribers += 1
    startAutoRefresh()
    void ensureMarketPrices()
  })

  onUnmounted(() => {
    subscribers = Math.max(0, subscribers - 1)
    if (subscribers === 0) {
      stopAutoRefresh()
    }
  })

  const resolver = computed(() => {
    const marketSnapshot = priceStore.market
    const settingsSnapshot = priceStore.settings
    return (materialId: number): number => {
      const material = gameData.materials.find((m) => m.id === materialId)
      if (!material) return 0
      const entry = marketSnapshot.get(materialId)
      return resolveMaterialPrice(material, entry, settingsSnapshot)
    }
  })

  return {
    priceResolver: resolver,
    refreshPrices: (force = true) => ensureMarketPrices(force),
    loading: computed(() => priceStore.loading),
    error: computed(() => priceStore.error),
    lastFetched: computed(() => priceStore.lastFetched),
    nextRefreshAt: computed(() =>
      priceStore.lastFetched ? priceStore.lastFetched + POLL_INTERVAL : null,
    ),
    pollIntervalMs: POLL_INTERVAL,
    settings: readonly(priceStore.settings),
    setDefaultMode,
    setOverrideMode,
    setManualPrice,
    setLocked,
  }
}

export type { PriceMode, MarketPriceEntry, PriceSettings, MaterialPriceOverride }
export { resolveMaterialPrice }
