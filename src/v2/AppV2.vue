<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { loadGameData } from './services/gamedata/service'
import type { GameData, GdIndex } from './services/gamedata/service'
import { translate } from './localisation'
import { getWorld } from './services/api/apiKeyManager'
import { resetPriceCache } from './services/gamedata/prices'
import { usePriceAlerts } from './services/priceAlerts/alertManager'
import { useMaterialPricing } from './services/gamedata/prices'
import PlayerConfigPanel from './pages/player-config/PlayerConfigPanel.vue'
import TechnologyPanel from './pages/technology/TechnologyPanel.vue'
import ConfigPanel from './pages/config/ConfigPanel.vue'
import MarketAnalysisPanel from './pages/market/MarketAnalysisPanel.vue'
import PriceAlertsPanel from './pages/price-alerts/PriceAlertsPanel.vue'

type Tab = 'bases' | 'technology' | 'config' | 'market' | 'alerts'
const LS_KEY = 'gt:v2:activeTab'

const active = ref<Tab>('bases')
const gd = ref<GameData | null>(null)
const gdIndex = ref<GdIndex | null>(null)
const gdLoadedAt = ref<number | null>(null)
const loading = ref(false)
const err = ref<string | null>(null)

// Global alert checking (runs regardless of active tab)
const { checkAlerts, playAlertSound, showNotification, reloadAlertsForWorld } = usePriceAlerts()
let alertCheckTimer: number | null = null
const ALERT_CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

function setupAlertChecking() {
  if (alertCheckTimer !== null) {
    clearInterval(alertCheckTimer)
  }

  // Check alerts every 5 minutes if we have gameData
  alertCheckTimer = window.setInterval(() => {
    if (!gd.value) return

    const { priceResolver } = useMaterialPricing(gd.value)
    const triggeredAlerts = checkAlerts(priceResolver.value)

    // Handle triggered alerts
    for (const result of triggeredAlerts) {
      playAlertSound(result.alert.type)
      showNotification(result.alert, result.currentPrice)
    }
  }, ALERT_CHECK_INTERVAL_MS)
}

onBeforeUnmount(() => {
  if (alertCheckTimer !== null) {
    clearInterval(alertCheckTimer)
    alertCheckTimer = null
  }
})

onMounted(async () => {
  const saved = localStorage.getItem(LS_KEY) as Tab | null
  if (saved === 'bases' || saved === 'technology' || saved === 'config' || saved === 'market' || saved === 'alerts') active.value = saved

  loading.value = true
  try {
    const { data, index, loadedAt } = await loadGameData()
    gd.value = data
    gdIndex.value = index
    gdLoadedAt.value = loadedAt
    // Start global alert checking once gameData is loaded
    setupAlertChecking()
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : 'error'
  } finally {
    loading.value = false
  }
})

watch(active, (t) => {
  try { localStorage.setItem(LS_KEY, t) } catch {}
})

watch(getWorld, async () => {
  loading.value = true
  try {
    // Reset price cache to force fresh data for new world
    resetPriceCache()
    // Reload alerts for new world
    reloadAlertsForWorld()
    const result = await loadGameData(true)
    gd.value = result.data
    gdIndex.value = result.index
    gdLoadedAt.value = result.loadedAt
    // Restart alert checking for new world
    setupAlertChecking()
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : 'error'
  } finally {
    loading.value = false
  }
})

async function handleGameDataRefreshed(payload: {
  data: GameData
  index: GdIndex
  loadedAt: number
}) {
  gd.value = payload.data
  gdIndex.value = payload.index
  gdLoadedAt.value = payload.loadedAt
}
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100">
    <div class="p-4 space-y-4">
      <div class="flex items-center gap-3">
        <nav class="flex gap-2">
          <button
            class="px-3 py-2 border rounded"
            :class="active === 'bases' ? 'bg-gray-600' : ''"
            @click="active = 'bases'"
          >
            {{ translate('tabPlayerConfig') }}
          </button>
          <button
            class="px-3 py-2 border rounded"
            :class="active === 'technology' ? 'bg-gray-600' : ''"
            @click="active = 'technology'"
          >
            {{ translate('tabTechnology') }}
          </button>
          <button
            class="px-3 py-2 border rounded"
            :class="active === 'market' ? 'bg-gray-600' : ''"
            @click="active = 'market'"
          >
            📊 Market Analysis
          </button>
          <button
            class="px-3 py-2 border rounded"
            :class="active === 'alerts' ? 'bg-gray-600' : ''"
            @click="active = 'alerts'"
          >
            🔔 {{ translate('tabPriceAlerts') }}
          </button>
          <button
            class="px-3 py-2 border rounded"
            :class="active === 'config' ? 'bg-gray-600' : ''"
            @click="active = 'config'"
          >
            {{ translate('tabConfig') }}
          </button>
        </nav>
      </div>

      <p v-if="err" class="text-red-600 text-sm">{{ err }}</p>
      <p v-else-if="loading">…</p>

      <PlayerConfigPanel
        v-if="gd && gdIndex && active === 'bases'"
        :gameData="gd"
        :index="gdIndex"
        :game-data-loaded-at="gdLoadedAt"
        @gameDataRefreshed="handleGameDataRefreshed"
      />
      <TechnologyPanel v-if="active === 'technology'" />
      <MarketAnalysisPanel v-if="gd && gdIndex && active === 'market'" :gameData="gd" :index="gdIndex" />
      <PriceAlertsPanel v-if="gd && gdIndex && active === 'alerts'" :gameData="gd" :index="gdIndex" />
      <ConfigPanel v-if="active === 'config'" />
    </div>
  </div>
</template>
