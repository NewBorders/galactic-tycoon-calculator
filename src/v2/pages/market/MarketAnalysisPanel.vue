<script setup lang="ts">
import { onMounted, onUnmounted, computed, watch, ref } from 'vue'
import { useMarketAnalysis } from '../../composables/useMarketAnalysis'
import MaterialIcon from '../../components/MaterialIcon.vue'
import type { GameData, GdIndex } from '../../services/gamedata/service'
import { getWorld } from '../../services/api/apiKeyManager'
import { translate, formatDateTime as formatDateTimeLocale } from '../../localisation'
import { formatInteger, formatDecimal, formatPercent as formatPercentLocale } from '../../localisation/numbers'
import { usePriceAlerts } from '../../services/priceAlerts/alertManager'
import { useMaterialPricing } from '../../services/gamedata/prices'

// Format price helper: cents → dollars with $ prefix
const formatPrice = (cents: number): string => '$' + formatDecimal(cents / 100, 2)

const props = defineProps<{
  gameData: GameData
  index: GdIndex
}>()

// Make world reactive so it updates when user switches g1 <-> g2
const world = computed(() => getWorld())

const {
  filteredOpportunities,
  loading,
  error,
  lastUpdated,
  fetch,

} = useMarketAnalysis({ world: world.value })

// Alert management
const { checkAlerts, playAlertSound, showNotification } = usePriceAlerts()
const { priceResolver } = useMaterialPricing(props.gameData)

// Auto-refresh interval (5 minutes)
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000
let autoRefreshTimer: number | null = null

// Setup auto-refresh with alert checking
function setupAutoRefresh() {
  if (autoRefreshTimer !== null) {
    clearInterval(autoRefreshTimer)
  }
  autoRefreshTimer = window.setInterval(async () => {
    await fetch(false) // Use cache if available, otherwise fetch

    // Check alerts after fetching new prices
    const triggeredAlerts = checkAlerts(priceResolver.value)

    // Handle triggered alerts
    for (const result of triggeredAlerts) {
      playAlertSound(result.alert.type)
      showNotification(result.alert, result.currentPrice)
    }
  }, AUTO_REFRESH_INTERVAL_MS)
}

// Re-fetch data when world changes
watch(world, async () => {
  await fetch(true) // Force refresh to get data for new world
  setupAutoRefresh() // Restart auto-refresh timer
})

// Material name lookup
const materialNames = computed(() => {
  const map = new Map<number, string>()
  props.gameData.materials.forEach(m => {
    map.set(m.id, m.name)
  })
  return map
})

// Material search
const materialSearch = ref('')

// Sorting state
const sortColumn = ref<'score' | 'demand' | 'revenue' | null>(null)
const sortDirection = ref<'asc' | 'desc'>('desc')

// Toggle sort
function toggleSort(column: 'score' | 'demand' | 'revenue') {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'desc'
  }
}

// Get sort indicator
function getSortIndicator(column: 'score' | 'demand' | 'revenue'): string {
  if (sortColumn.value !== column) return ''
  return sortDirection.value === 'asc' ? ' ▲' : ' ▼'
}

// Filtered opportunities based on search
const searchFilteredOpportunities = computed(() => {
  if (!materialSearch.value.trim()) {
    return filteredOpportunities.value
  }

  const searchLower = materialSearch.value.toLowerCase()
  return filteredOpportunities.value.filter(opp => {
    const materialName = materialNames.value.get(opp.materialId) || ''
    return materialName.toLowerCase().includes(searchLower) ||
           opp.materialId.toString().includes(searchLower)
  })
})

// Sorted opportunities
const sortedOpportunities = computed(() => {
  const opportunities = [...searchFilteredOpportunities.value]

  if (!sortColumn.value) return opportunities

  return opportunities.sort((a, b) => {
    let comparison = 0

    switch (sortColumn.value) {
      case 'score':
        comparison = a.opportunityScore - b.opportunityScore
        break
      case 'demand':
        comparison = a.demand.volumeAvgPerDay - b.demand.volumeAvgPerDay
        break
      case 'revenue':
        comparison = a.demand.revenueAvgPerDay - b.demand.revenueAvgPerDay
        break
    }

    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

// Percent helper: convert ratio to percentage
const formatPercent = (n: number): string => formatPercentLocale(n / 100, 1)

// Styling helpers
function getRecommendationBgColor(rec: string): string {
  switch (rec) {
    case 'excellent': return 'bg-green-600'
    case 'good': return 'bg-green-700'
    case 'neutral': return 'bg-yellow-600'
    case 'poor': return 'bg-orange-600'
    case 'avoid': return 'bg-red-600'
    default: return 'bg-gray-600'
  }
}

function getRecommendationLabel(rec: string): string {
  switch (rec) {
    case 'excellent': return '⭐ Excellent'
    case 'good': return '✓ Good'
    case 'neutral': return '→ Neutral'
    case 'poor': return '↓ Poor'
    case 'avoid': return '✗ Avoid'
    case 'no-data': return '❓ No Data'
    default: return rec
  }
}

function getDemandColor(level: string): string {
  switch (level) {
    case 'high': return 'text-green-400'
    case 'medium': return 'text-yellow-400'
    case 'low': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

function getDemandLabel(level: string): string {
  switch (level) {
    case 'high': return translate('marketAnalysisDemandHigh')
    case 'medium': return translate('marketAnalysisDemandMedium')
    case 'low': return translate('marketAnalysisDemandLow')
    default: return level
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400 font-bold'
  if (score >= 60) return 'text-green-300'
  if (score >= 40) return 'text-yellow-400'
  if (score >= 20) return 'text-orange-400'
  return 'text-red-400'
}

// Stats by recommendation type
const statsByRecommendation = computed(() => {
  const counts = {
    excellent: 0,
    good: 0,
    neutral: 0,
    poor: 0,
    avoid: 0
  }
  filteredOpportunities.value.forEach(opp => {
    if (opp.recommendation in counts) {
      counts[opp.recommendation as keyof typeof counts]++
    }
  })
  return counts
})

// Auto-fetch on mount
onMounted(() => {
  // Starte den Auto-Refresh sicher bevor der erste Fetch läuft
  setupAutoRefresh()
  fetch()
})

// Cleanup on unmount
onUnmounted(() => {
  if (autoRefreshTimer !== null) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
})

// Refresh handler
async function refresh() {
  await fetch(true)
}

// Locale-aware datetime formatting for last update timestamp
const lastUpdatedLabel = computed(() => {
  if (!lastUpdated.value) return translate('marketAnalysisTimeAgoNever')
  return formatDateTimeLocale(lastUpdated.value)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-purple-400">📊 {{ translate('marketAnalysisTitle') }}</h1>
        <p class="text-sm text-gray-400 mt-1">
          {{ translate('marketAnalysisDescription') }}
        </p>
      </div>
      <div class="flex gap-2 items-center">
        <span class="text-xs text-gray-500">
          {{ translate('marketAnalysisUpdated') }}: {{ lastUpdatedLabel }}
        </span>
        <button
          @click="refresh"
          :disabled="loading"
          class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition"
        >
          {{ loading ? `⏳ ${translate('marketAnalysisLoading')}` : `🔄 ${translate('marketAnalysisRefresh')}` }}
        </button>
      </div>
    </div>

    <!-- Error/Warning Message -->
    <div v-if="error" :class="filteredOpportunities.length > 0 ? 'bg-yellow-900/50 border-yellow-700 text-yellow-200' : 'bg-red-900/50 border-red-700 text-red-200'" class="border rounded p-4">
      {{ error }}
    </div>

    <!-- Recommendation Stats -->
    <div v-if="!loading && !error" class="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-green-400 uppercase font-semibold">⭐ Excellent</div>
        <div class="text-2xl font-bold text-green-400">{{ statsByRecommendation.excellent }}</div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-green-300 uppercase font-semibold">✓ Good</div>
        <div class="text-2xl font-bold text-green-300">{{ statsByRecommendation.good }}</div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-yellow-400 uppercase font-semibold">→ Neutral</div>
        <div class="text-2xl font-bold text-yellow-400">{{ statsByRecommendation.neutral }}</div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-orange-400 uppercase font-semibold">↓ Poor</div>
        <div class="text-2xl font-bold text-orange-400">{{ statsByRecommendation.poor }}</div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-red-400 uppercase font-semibold">✗ Avoid</div>
        <div class="text-2xl font-bold text-red-400">{{ statsByRecommendation.avoid }}</div>
      </div>
    </div>

    <!-- Material Search -->
    <div class="bg-gray-800 rounded p-4">
      <label class="block text-sm font-medium text-gray-300 mb-2">
        🔍 Search Material
      </label>
      <input
        v-model="materialSearch"
        type="text"
        placeholder="Enter material name or ID..."
        class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      <div v-if="materialSearch" class="mt-2 text-xs text-gray-400">
        Showing {{ sortedOpportunities.length }} of {{ filteredOpportunities.length }} materials
      </div>
    </div>

    <!-- Opportunities Table -->
    <div v-if="!loading && !error" class="bg-gray-800 rounded overflow-visible">
      <div class="overflow-x-hidden max-h-[max(200px,calc(100vh-400px))] overflow-y-auto rounded">
        <table class="table-fixed w-full text-xs">
          <thead class="bg-gray-700 sticky top-0 z-20">
            <tr>
              <th class="w-[32%] px-3 py-2 text-left text-[11px] font-medium text-gray-300 uppercase tracking-wider">
                Material
              </th>
              <th
                class="w-[12%] px-3 py-2 text-center text-[11px] font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition"
                @click="toggleSort('score')"
              >
                <span class="flex items-center justify-center gap-1">
                  Score & Rating{{ getSortIndicator('score') }}
                  <span class="info-tooltip text-purple-400 cursor-help">
                    ⓘ
                    <span class="tooltip-text">
                      Score (0-100): Price trend (0-35pts) + Revenue/day (0-45pts) + Market saturation (0-25pts). Higher revenue = higher score even within same demand level. Rating: ≥80 Excellent, 60-79 Good, 40-59 Neutral, 20-39 Poor, &lt;20 Avoid
                    </span>
                  </span>
                </span>
              </th>
              <th class="w-[14%] px-3 py-2 text-right text-[11px] font-medium text-gray-300 uppercase tracking-wider">
                <span class="flex items-center justify-end gap-1">
                  Avg Price
                  <span class="info-tooltip text-purple-400 cursor-help">
                    ⓘ
                    <span class="tooltip-text">
                      7-day average price with trend percentage (current vs 7-day avg)
                    </span>
                  </span>
                </span>
              </th>
              <th
                class="w-[14%] px-3 py-2 text-center text-[11px] font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition"
                @click="toggleSort('demand')"
              >
                <span class="flex items-center justify-center gap-1">
                  Demand{{ getSortIndicator('demand') }}
                  <span class="info-tooltip text-purple-400 cursor-help">
                    ⓘ
                    <span class="tooltip-text">
                      Demand level based on daily revenue: High ≥$500k/day, Medium $50k-500k/day, Low &lt;$50k/day. Sortable by daily sold units.
                    </span>
                  </span>
                </span>
              </th>
              <th
                class="w-[14%] px-3 py-2 text-right text-[11px] font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition"
                @click="toggleSort('revenue')"
              >
                <span class="flex items-center justify-end gap-1">
                  Revenue/Day{{ getSortIndicator('revenue') }}
                  <span class="info-tooltip text-purple-400 cursor-help">
                    ⓘ
                    <span class="tooltip-text">
                      Average daily revenue = quantity sold per day × average price. This is the KEY metric for scoring - higher revenue = higher opportunity score, even within the same demand level.
                    </span>
                  </span>
                </span>
              </th>
              <th class="w-[14%] px-3 py-2 text-center text-[11px] font-medium text-gray-300 uppercase tracking-wider">
                <span class="flex items-center justify-center gap-1">
                  Supply
                  <span class="info-tooltip text-purple-400 cursor-help">
                    ⓘ
                    <span class="tooltip-text">
                      Market saturation based on days of supply (available qty ÷ daily volume). Undersupplied &lt;1d (+20-25 score pts), Balanced 1-3d (+10pts), Oversupplied >3d (+2pts). Undersupplied markets are production opportunities.
                    </span>
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr
              v-for="opp in sortedOpportunities"
              :key="opp.materialId"
              class="hover:bg-gray-750 transition"
            >
              <!-- Material Name with Icon -->
              <td class="w-[32%] px-3 py-2 text-white font-medium truncate">
                <div class="flex items-center gap-2 min-w-0">
                  <MaterialIcon :name="materialNames.get(opp.materialId) || `ID ${opp.materialId}`" variant="lg" />
                  <span class="block truncate" :title="materialNames.get(opp.materialId) || `ID ${opp.materialId}`">
                    {{ materialNames.get(opp.materialId) || `ID ${opp.materialId}` }}
                  </span>
                </div>
              </td>

              <!-- Score & Recommendation Combined -->
              <td class="w-[12%] px-3 py-2">
                <div class="flex flex-col items-center gap-0.5">
                  <span
                    class="text-xl font-bold"
                    :class="getScoreColor(opp.opportunityScore)"
                  >
                    {{ opp.opportunityScore }}
                  </span>
                  <span
                    class="px-1.5 py-0.5 rounded text-[11px] font-semibold"
                    :class="getRecommendationBgColor(opp.recommendation)"
                  >
                    {{ getRecommendationLabel(opp.recommendation) }}
                  </span>
                </div>
              </td>

              <!-- Average Price with 7d Trend -->
              <td class="w-[14%] px-3 py-2 text-right whitespace-nowrap">
                <div class="flex flex-col items-end gap-0.5">
                  <span class="text-white font-mono font-semibold text-sm">
                    {{ formatPrice(opp.priceTrend.avg7d) }}
                  </span>
                  <span
                    class="text-[11px] font-mono font-semibold"
                    :class="opp.priceTrend.changePercent7d >= 0 ? 'text-green-400' : 'text-red-400'"
                  >
                    {{ opp.priceTrend.changePercent7d >= 0 ? '+' : '' }}{{ formatPercent(opp.priceTrend.changePercent7d) }}
                  </span>
                </div>
              </td>

              <!-- Demand with Daily Volume -->
              <td class="w-[14%] px-3 py-2 text-center whitespace-nowrap">
                <div class="flex flex-col items-center gap-0.5">
                  <span
                    class="inline-block px-2 py-0.5 rounded text-[11px] font-medium uppercase"
                    :class="getDemandColor(opp.demand.demandLevel)"
                  >
                    {{ getDemandLabel(opp.demand.demandLevel) }}
                  </span>
                  <span class="text-[11px] text-gray-400">
                    {{ formatInteger(Math.round(opp.demand.volumeAvgPerDay)) }} units/day
                  </span>
                </div>
              </td>

              <!-- Revenue per Day -->
              <td class="w-[14%] px-3 py-2 text-right text-white font-mono whitespace-nowrap text-sm">
                {{ formatPrice(opp.demand.revenueAvgPerDay) }}
              </td>

              <!-- Saturation with Available Supply -->
              <td class="w-[14%] px-3 py-2 text-center whitespace-nowrap">
                <div class="flex flex-col items-center gap-0.5">
                  <span class="text-[11px] text-gray-400 uppercase">
                    {{ opp.saturation.saturationLevel }}
                  </span>
                  <div v-if="opp.saturation.qtyAvailable !== null" class="text-[11px] text-gray-500">
                    {{ formatInteger(Math.round(opp.saturation.qtyAvailable)) }} available
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div
          v-if="sortedOpportunities.length === 0"
          class="text-center py-12 text-gray-400"
        >
          <div class="text-4xl mb-4">📭</div>
          <div class="text-lg">{{ translate('marketAnalysisNoOpportunities') }}</div>
          <div class="text-sm mt-2">{{ materialSearch ? 'Try a different search term' : translate('marketAnalysisAdjustFilters') }}</div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12 text-gray-400">
      <div class="text-4xl mb-4 animate-pulse">⏳</div>
      <div class="text-lg">{{ translate('marketAnalysisLoadingData') }}</div>
    </div>
  </div>
</template>

<style scoped>
.hover\:bg-gray-750:hover {
  background-color: rgb(31 36 44);
}

/* Instant tooltip on hover */
.info-tooltip {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.info-tooltip .tooltip-text {
  visibility: hidden;
  opacity: 0;
  position: absolute;
  z-index: 10000;
  top: 125%;
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  background-color: rgb(31, 41, 55);
  color: rgb(229, 231, 235);
  text-align: center;
  text-transform: none;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgb(75, 85, 99);
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: normal;
  pointer-events: none;
  transition: opacity 0s, visibility 0s;
}

.info-tooltip .tooltip-text::after {
  content: "";
  position: absolute;
  bottom: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: transparent transparent rgb(31, 41, 55) transparent;
}

.info-tooltip:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}
</style>
