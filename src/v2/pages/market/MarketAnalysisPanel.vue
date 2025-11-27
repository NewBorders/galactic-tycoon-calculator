<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useMarketAnalysis } from '../../composables/useMarketAnalysis'
import { translate } from '../../localisation'
import type { GameData, GdIndex } from '../../services/gamedata/service'
import { getWorld } from '../../services/api/apiKeyManager'

const props = defineProps<{
  gameData: GameData
  index: GdIndex
}>()

const world = getWorld()
const { 
  filteredOpportunities, 
  loading, 
  error, 
  lastUpdated,
  filters,
  stats,
  fetch,
  setMinScore,
  setDemandLevels,
  setTrendDirections,
  clearFilters 
} = useMarketAnalysis({ world })

// Material name lookup
const materialNames = computed(() => {
  const map = new Map<number, string>()
  props.gameData.materials.forEach(m => {
    map.set(m.id, m.name)
  })
  return map
})

// Filter UI state
const showFilters = ref(true)
const selectedMinScore = ref<number | undefined>(undefined)
const selectedDemandLevels = ref<Array<'high' | 'medium' | 'low'>>([])
const selectedTrendDirections = ref<Array<'rising' | 'falling' | 'stable'>>([])

// Apply filters
function applyFilters() {
  setMinScore(selectedMinScore.value)
  setDemandLevels(selectedDemandLevels.value.length > 0 ? selectedDemandLevels.value : undefined)
  setTrendDirections(selectedTrendDirections.value.length > 0 ? selectedTrendDirections.value : undefined)
}

// Clear all filters
function resetFilters() {
  selectedMinScore.value = undefined
  selectedDemandLevels.value = []
  selectedTrendDirections.value = []
  clearFilters()
}

// Format functions
function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}

function formatPercent(n: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1 
  }).format(n / 100)
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(n)
}

function formatTimeAgo(ts: number | null): string {
  if (!ts) return 'Never'
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

// Styling helpers
function getRecommendationColor(rec: string): string {
  switch (rec) {
    case 'strong-buy': return 'text-green-400'
    case 'buy': return 'text-green-300'
    case 'hold': return 'text-yellow-400'
    case 'sell': return 'text-orange-400'
    case 'strong-sell': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

function getRecommendationLabel(rec: string): string {
  switch (rec) {
    case 'strong-buy': return '⬆️ Strong Buy'
    case 'buy': return '↗️ Buy'
    case 'hold': return '➡️ Hold'
    case 'sell': return '↘️ Sell'
    case 'strong-sell': return '⬇️ Strong Sell'
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
        <h1 class="text-2xl font-bold text-purple-400">📊 Market Analysis</h1>
        <p class="text-sm text-gray-400 mt-1">
          Analyze market opportunities based on demand, price trends, and saturation
        </p>
      </div>
      <div class="flex gap-2 items-center">
        <span class="text-xs text-gray-500">
          Updated: {{ formatTimeAgo(lastUpdated) }}
        </span>
        <button
          @click="refresh"
          :disabled="loading"
          class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition"
        >
          {{ loading ? '⏳ Loading...' : '🔄 Refresh' }}
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="bg-red-900/50 border border-red-700 rounded p-4 text-red-200">
      ⚠️ {{ error }}
    </div>

    <!-- Stats Summary -->
    <div v-if="!loading && !error" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-gray-400 uppercase">Total</div>
        <div class="text-2xl font-bold text-white">{{ stats.total }}</div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-gray-400 uppercase">Avg Score</div>
        <div class="text-2xl font-bold" :class="getScoreColor(stats.avgScore)">
          {{ stats.avgScore }}
        </div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-green-400 uppercase">Strong Buy</div>
        <div class="text-2xl font-bold text-green-400">{{ stats.strongBuy }}</div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-green-300 uppercase">Buy</div>
        <div class="text-2xl font-bold text-green-300">{{ stats.buy }}</div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-yellow-400 uppercase">Hold</div>
        <div class="text-2xl font-bold text-yellow-400">{{ stats.hold }}</div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-orange-400 uppercase">Sell</div>
        <div class="text-2xl font-bold text-orange-400">{{ stats.sell }}</div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-red-400 uppercase">Strong Sell</div>
        <div class="text-2xl font-bold text-red-400">{{ stats.strongSell }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-gray-800 rounded p-4">
      <button 
        @click="showFilters = !showFilters"
        class="flex items-center justify-between w-full text-left"
      >
        <h2 class="text-lg font-semibold text-purple-400">🔍 Filters</h2>
        <span class="text-gray-400">{{ showFilters ? '▼' : '▶' }}</span>
      </button>
      
      <div v-if="showFilters" class="mt-4 space-y-4">
        <!-- Min Score Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Minimum Opportunity Score
          </label>
          <input
            v-model.number="selectedMinScore"
            type="number"
            min="0"
            max="100"
            step="10"
            placeholder="0-100"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          />
        </div>

        <!-- Demand Levels Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Demand Levels
          </label>
          <div class="flex gap-3">
            <label class="flex items-center gap-2">
              <input 
                v-model="selectedDemandLevels"
                type="checkbox"
                value="high"
                class="rounded"
              />
              <span class="text-sm text-green-400">High</span>
            </label>
            <label class="flex items-center gap-2">
              <input 
                v-model="selectedDemandLevels"
                type="checkbox"
                value="medium"
                class="rounded"
              />
              <span class="text-sm text-yellow-400">Medium</span>
            </label>
            <label class="flex items-center gap-2">
              <input 
                v-model="selectedDemandLevels"
                type="checkbox"
                value="low"
                class="rounded"
              />
              <span class="text-sm text-red-400">Low</span>
            </label>
          </div>
        </div>

        <!-- Trend Directions Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Price Trends
          </label>
          <div class="flex gap-3">
            <label class="flex items-center gap-2">
              <input 
                v-model="selectedTrendDirections"
                type="checkbox"
                value="rising"
                class="rounded"
              />
              <span class="text-sm text-green-400">📈 Rising</span>
            </label>
            <label class="flex items-center gap-2">
              <input 
                v-model="selectedTrendDirections"
                type="checkbox"
                value="stable"
                class="rounded"
              />
              <span class="text-sm text-yellow-400">➡️ Stable</span>
            </label>
            <label class="flex items-center gap-2">
              <input 
                v-model="selectedTrendDirections"
                type="checkbox"
                value="falling"
                class="rounded"
              />
              <span class="text-sm text-red-400">📉 Falling</span>
            </label>
          </div>
        </div>

        <!-- Filter Actions -->
        <div class="flex gap-2">
          <button
            @click="applyFilters"
            class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition"
          >
            Apply Filters
          </button>
          <button
            @click="resetFilters"
            class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>

    <!-- Opportunities Table -->
    <div v-if="!loading && !error" class="bg-gray-800 rounded overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Material
              </th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                Score
              </th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                Recommendation
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                Current Price
              </th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                7d Trend
              </th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                Demand
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                Volume/Day
              </th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                Saturation
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr 
              v-for="opp in filteredOpportunities" 
              :key="opp.materialId"
              class="hover:bg-gray-750 transition"
            >
              <!-- Material Name -->
              <td class="px-4 py-3 text-white font-medium">
                {{ materialNames.get(opp.materialId) || `ID ${opp.materialId}` }}
              </td>

              <!-- Score -->
              <td class="px-4 py-3 text-center">
                <span 
                  class="inline-block px-3 py-1 rounded font-bold text-lg"
                  :class="getScoreColor(opp.opportunityScore)"
                >
                  {{ opp.opportunityScore }}
                </span>
              </td>

              <!-- Recommendation -->
              <td class="px-4 py-3 text-center">
                <span 
                  class="inline-block px-3 py-1 rounded text-sm font-medium"
                  :class="getRecommendationColor(opp.recommendation)"
                >
                  {{ getRecommendationLabel(opp.recommendation) }}
                </span>
              </td>

              <!-- Current Price -->
              <td class="px-4 py-3 text-right text-white font-mono">
                {{ formatPrice(opp.priceTrend.current) }}
              </td>

              <!-- 7d Trend -->
              <td class="px-4 py-3 text-center">
                <div class="flex flex-col items-center gap-1">
                  <span class="text-lg">{{ getTrendIcon(opp.priceTrend.direction) }}</span>
                  <span 
                    class="text-xs font-mono"
                    :class="opp.priceTrend.changePercent7d >= 0 ? 'text-green-400' : 'text-red-400'"
                  >
                    {{ formatPercent(opp.priceTrend.changePercent7d) }}
                  </span>
                </div>
              </td>

              <!-- Demand -->
              <td class="px-4 py-3 text-center">
                <span 
                  class="inline-block px-2 py-1 rounded text-xs font-medium uppercase"
                  :class="getDemandColor(opp.demand.demandLevel)"
                >
                  {{ opp.demand.demandLevel }}
                </span>
              </td>

              <!-- Volume/Day -->
              <td class="px-4 py-3 text-right text-gray-300 font-mono text-xs">
                {{ formatNumber(opp.demand.volumeAvgPerDay) }}
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
      </div>

      <!-- Empty State -->
      <div 
        v-if="filteredOpportunities.length === 0" 
        class="text-center py-12 text-gray-400"
      >
        <div class="text-4xl mb-4">📭</div>
        <div class="text-lg">No opportunities found</div>
        <div class="text-sm mt-2">Try adjusting your filters</div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12 text-gray-400">
      <div class="text-4xl mb-4 animate-pulse">⏳</div>
      <div class="text-lg">Loading market data...</div>
    </div>
  </div>
</template>

<style scoped>
.hover\:bg-gray-750:hover {
  background-color: rgb(31 36 44);
}
</style>
