<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useMarketAnalysis } from '../../composables/useMarketAnalysis'
import type { GameData, GdIndex } from '../../services/gamedata/service'
import { getWorld } from '../../services/api/apiKeyManager'
import { translate } from '../../localisation'
import { formatInteger, formatDecimal, formatPercent as formatPercentLocale } from '../../localisation/numbers'

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
  stats,
  fetch,
  setMinScore,
  setDemandLevels,
  setTrendDirections,
  clearFilters
} = useMarketAnalysis({ world: world.value })

// Re-fetch data when world changes
watch(world, () => {
  fetch(true) // Force refresh to get data for new world
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

// Format functions - use locale-aware formatting
function formatNumber(n: number): string {
  return formatInteger(n)
}

function formatPercent(n: number): string {
  return formatPercentLocale(n / 100, 1)
}

function formatPrice(cents: number): string {
  // Convert cents to dollars
  return '$' + formatDecimal(cents / 100, 2)
}

function formatTimeAgo(ts: number | null): string {
  if (!ts) return translate('marketAnalysisTimeAgoNever')
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return translate('marketAnalysisTimeAgoSeconds', { seconds })
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return translate('marketAnalysisTimeAgoMinutes', { minutes })
  const hours = Math.floor(minutes / 60)
  return translate('marketAnalysisTimeAgoHours', { hours })
}

// Styling helpers
function getRecommendationColor(rec: string): string {
  switch (rec) {
    case 'excellent': return 'text-green-400'
    case 'good': return 'text-green-300'
    case 'neutral': return 'text-yellow-400'
    case 'poor': return 'text-orange-400'
    case 'avoid': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

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

function getTrendIcon(direction: string): string {
  switch (direction) {
    case 'rising': return '📈'
    case 'falling': return '📉'
    case 'stable': return '➡️'
    default: return '❓'
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
  fetch()
})

// Refresh handler
async function refresh() {
  await fetch(true)
}
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
          {{ translate('marketAnalysisUpdated') }}: {{ formatTimeAgo(lastUpdated) }}
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

    <!-- Error Message -->
    <div v-if="error" class="bg-red-900/50 border border-red-700 rounded p-4 text-red-200">
      ⚠️ {{ error }}
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
        Showing {{ searchFilteredOpportunities.length }} of {{ filteredOpportunities.length }} materials
      </div>
    </div>

    <!-- Opportunities Table -->
    <div v-if="!loading && !error" class="bg-gray-800 rounded overflow-hidden">
      <div class="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-700 sticky top-0 z-10">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Material
              </th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider group relative">
                <span class="flex items-center justify-center gap-1">
                  Score & Rating
                  <span class="text-purple-400 cursor-help" title="Score (0-100): Rising trend +40, High demand +40, Undersupplied +20. Rating: >=80 Excellent, 60-79 Good, 40-59 Neutral, 20-39 Poor, <20 Avoid">ⓘ</span>
                </span>
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider group relative">
                <span class="flex items-center justify-end gap-1">
                  Avg Price
                  <span class="text-purple-400 cursor-help" title="7-day average price with trend percentage (current vs 7-day avg)">ⓘ</span>
                </span>
              </th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider group relative">
                <span class="flex items-center justify-center gap-1">
                  Demand
                  <span class="text-purple-400 cursor-help" title="Demand level based on daily revenue: High >$5k/day, Medium $500-5k/day, Low <$500/day">ⓘ</span>
                </span>
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider group relative">
                <span class="flex items-center justify-end gap-1">
                  Revenue/Day
                  <span class="text-purple-400 cursor-help" title="Average daily revenue (quantity sold × price per day)">ⓘ</span>
                </span>
              </th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider group relative">
                <span class="flex items-center justify-center gap-1">
                  Supply
                  <span class="text-purple-400 cursor-help" title="Market saturation: Days of supply available (qty available / daily volume). Undersupplied <1d, Balanced 1-3d, Oversupplied >3d">ⓘ</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr
              v-for="opp in searchFilteredOpportunities"
              :key="opp.materialId"
              class="hover:bg-gray-750 transition"
            >
              <!-- Material Name -->
              <td class="px-4 py-3 text-white font-medium">
                {{ materialNames.get(opp.materialId) || `ID ${opp.materialId}` }}
              </td>

              <!-- Score & Recommendation Combined -->
              <td class="px-4 py-3">
                <div class="flex flex-col items-center gap-1">
                  <span
                    class="text-2xl font-bold"
                    :class="getScoreColor(opp.opportunityScore)"
                  >
                    {{ opp.opportunityScore }}
                  </span>
                  <span
                    class="px-2 py-0.5 rounded text-xs font-semibold"
                    :class="getRecommendationBgColor(opp.recommendation)"
                  >
                    {{ getRecommendationLabel(opp.recommendation) }}
                  </span>
                </div>
              </td>

              <!-- Average Price with 7d Trend -->
              <td class="px-4 py-3 text-right">
                <div class="flex flex-col items-end gap-0.5">
                  <span class="text-white font-mono font-semibold">
                    {{ formatPrice(opp.priceTrend.avg7d) }}
                  </span>
                  <span
                    class="text-xs font-mono font-semibold"
                    :class="opp.priceTrend.changePercent7d >= 0 ? 'text-green-400' : 'text-red-400'"
                  >
                    {{ opp.priceTrend.changePercent7d >= 0 ? '+' : '' }}{{ formatPercent(opp.priceTrend.changePercent7d) }}
                  </span>
                </div>
              </td>

              <!-- Demand with Daily Volume -->
              <td class="px-4 py-3 text-center">
                <div class="flex flex-col items-center gap-1">
                  <span
                    class="inline-block px-2 py-1 rounded text-xs font-medium uppercase"
                    :class="getDemandColor(opp.demand.demandLevel)"
                  >
                    {{ getDemandLabel(opp.demand.demandLevel) }}
                  </span>
                  <span class="text-xs text-gray-400">
                    {{ formatNumber(Math.round(opp.demand.volumeAvgPerDay)) }} units/day
                  </span>
                </div>
              </td>

              <!-- Revenue per Day -->
              <td class="px-4 py-3 text-right text-white font-mono">
                {{ formatPrice(opp.demand.revenueAvgPerDay) }}
              </td>

              <!-- Saturation -->
              <td class="px-4 py-3 text-center">
                <span class="text-xs text-gray-400 uppercase">
                  {{ opp.saturation.saturationLevel }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div
          v-if="searchFilteredOpportunities.length === 0"
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
</style>
