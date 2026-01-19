<script setup lang="ts">
import { computed, ref } from 'vue'
import { translate } from '@/v2/localisation'
import {
  TECHNOLOGIES,
  technologyBonusFromLevel,
  type TechnologySpecialisation,
  usePlayerTechnology,
} from '@/v2/services/playerTechnology'
import { useWorldData } from '@/v2/services/worldData'
import { refreshEntry, getSyncEntries } from '@/v2/services/syncService'
import { getChangeTracker } from '@/v2/services/changeTracker'
import type { GameData } from '@/v2/services/gamedata/service'
import { usePlayerBases } from '@/v2/services/playerBases'
import { useMaterialPricing } from '@/v2/services/gamedata/service'
import { useTechnologyNetProfitForecast } from '@/v2/composables/useTechnologyNetProfitForecast'
import { formatNumber } from '@/v2/utils/formatNumber'

interface Props {
  gameData?: GameData
}

const props = defineProps<Props>()

const { state, setLevel, setStartingBonus } = usePlayerTechnology()
const { current } = useWorldData()

// Get player bases for net profit calculation
const playerBasesData = props.gameData ? usePlayerBases(props.gameData) : null
const basesState = computed(() => playerBasesData?.state.value ?? { bases: [] })

// Calculate global workforce burden
const globalWorkforceBurden = computed(() => {
  let total = 0
  basesState.value.bases.forEach((base) => {
    base.buildings.forEach((building) => {
      const gd = props.gameData
      if (!gd) return
      const buildingData = gd.buildings.find((b) => b.id === building.buildingId)
      if (!buildingData) return
      // Sum all worker tiers
      const housing = (buildingData.workersHousing?.worker || 0) + 
                     (buildingData.workersHousing?.technician || 0) + 
                     (buildingData.workersHousing?.engineer || 0) + 
                     (buildingData.workersHousing?.scientist || 0)
      total += housing * building.level
    })
  })
  return total
})

// Get price resolver for calculations
const { priceResolver } = props.gameData ? useMaterialPricing(props.gameData) : { priceResolver: ref(undefined) }

// Planned technology levels and starting bonus
const plannedTechnologyLevels = computed(() => state.value.levels ?? {})
const plannedStartingBonus = computed(() => state.value.startingBonus ?? 1)

// Net profit forecast composable
const { allForecasts } = useTechnologyNetProfitForecast(
  computed(() => props.gameData),
  computed(() => basesState.value.bases),
  plannedTechnologyLevels,
  plannedStartingBonus,
  globalWorkforceBurden,
  priceResolver
)

const isRefreshing = ref(false)
const syncEntries = getSyncEntries()

// Get company sync entry to check for errors
const companyEntry = computed(() => {
  return syncEntries.value.find(e => e.id === 'company')
})

const hasError = computed(() => {
  return companyEntry.value?.error != null
})

const errorMessage = computed(() => {
  return companyEntry.value?.error || null
})

// Last fetched timestamp for company data (technology levels)
const lastFetched = computed(() => {
  return current.value.fetchedAt || null
})

const formattedLastFetched = computed(() => {
  if (!lastFetched.value) return '—'
  try {
    const date = new Date(lastFetched.value)
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hours = `${date.getHours()}`.padStart(2, '0')
    const minutes = `${date.getMinutes()}`.padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch {
    return '—'
  }
})

// Starting bonus for planned production
const startingBonus = computed({
  get: () => state.value.startingBonus,
  set: (value) => {
    const numeric = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(numeric)) {
      // Track starting bonus change
      const oldBonus = state.value.startingBonus
      if (oldBonus !== numeric) {
        const changeTracker = getChangeTracker(props.gameData)
        changeTracker.trackStartingBonusChange(oldBonus, numeric)
      }
      setStartingBonus(numeric)
    }
  },
})

// Current level from API (read-only)
// Zeigt immer nur die Werte aus current.technology
function currentLevel(id: TechnologySpecialisation): number {
  return current.value.technology?.[id] ?? 0
}

// Planned level (editable, affects planned production)
function plannedLevel(id: TechnologySpecialisation): number {
  return state.value.levels?.[id] ?? 0
}

function onLevelInput(id: TechnologySpecialisation, event: Event) {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  const value = target.valueAsNumber
  const level = Number.isNaN(value) ? 0 : value
  const minLevel = currentLevel(id) // Kann nicht unter current level gesetzt werden
  const newLevel = Math.max(minLevel, level)

  // Track technology level change
  const oldLevel = plannedLevel(id)
  if (oldLevel !== newLevel) {
    const tech = TECHNOLOGIES.find(t => t.id === id)
    if (tech) {
      const changeTracker = getChangeTracker(props.gameData)
      changeTracker.trackTechnologyChange(
        id,
        translate(tech.nameKey),
        oldLevel,
        newLevel
      )
    }
  }

  setLevel(id, newLevel)
}

// Manual refresh of company data
async function handleRefreshCompanyData() {
  isRefreshing.value = true
  try {
    await refreshEntry('company')
  } finally {
    // Add small delay so user sees the refresh happened
    setTimeout(() => {
      isRefreshing.value = false
    }, 500)
  }
}

function formatBonus(level: number) {
  const multiplier = technologyBonusFromLevel(level)
  const percent = (multiplier - 1) * 100
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(0)}% · ${multiplier.toFixed(2)}×`
}

const startingBonusDisplay = computed(() => {
  const bonus = startingBonus.value
  const percent = (bonus - 1) * 100
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(0)}% · ${bonus.toFixed(2)}×`
})

// Format net profit forecast for a technology
function formatNetProfitForecast(techId: TechnologySpecialisation): string {
  const forecast = allForecasts.value.get(techId)
  if (!forecast) return '—'
  
  const change = forecast.netProfitChange
  if (Math.abs(change) < 0.01) return '±$0'
  
  const sign = change > 0 ? '+' : ''
  return `${sign}$${formatNumber(change, 0)}`
}

// Get forecast color class for a technology
function getForecastColorClass(techId: TechnologySpecialisation): string {
  const forecast = allForecasts.value.get(techId)
  if (!forecast || Math.abs(forecast.netProfitChange) < 0.01) return 'text-slate-400'
  return forecast.netProfitChange > 0 ? 'text-green-400' : 'text-red-400'
}

// Format ROI (Return on Investment) for a technology
function formatROI(techId: TechnologySpecialisation): string {
  const forecast = allForecasts.value.get(techId)
  if (!forecast || !forecast.roiDays) return '—'
  
  const days = forecast.roiDays
  if (days < 1) return '<1 day'
  if (days < 7) return `${formatNumber(days, 1)} days`
  if (days < 30) return `${formatNumber(days / 7, 1)} weeks`
  if (days < 365) return `${formatNumber(days / 30, 1)} months`
  return `${formatNumber(days / 365, 1)} years`
}

// Get upgrade cost with materials and dollar value for a technology
function getUpgradeCostDisplay(techId: TechnologySpecialisation): string {
  const forecast = allForecasts.value.get(techId)
  if (!forecast) return '—'
  
  const materials = forecast.upgradeCost || '—'
  const dollarValue = forecast.upgradeCostValue > 0 
    ? `$${formatNumber(forecast.upgradeCostValue, 0)}` 
    : ''
  
  if (materials === '—' && !dollarValue) return '—'
  if (!dollarValue) return materials
  if (materials === '—') return dollarValue
  
  return `${materials} (${dollarValue})`
}
</script>

<template>
  <div class="space-y-6 text-slate-100">
    <!-- Company Data Last Updated -->
    <div class="flex justify-end">
      <div class="rounded bg-slate-900 p-4 w-fit" :class="hasError ? 'border border-red-700' : 'border border-slate-700'">
        <div class="flex flex-col items-end gap-2">
          <button
            @click="handleRefreshCompanyData"
            :disabled="isRefreshing"
            class="px-3 py-1 text-sm rounded transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            :class="hasError ? 'bg-red-700 hover:bg-red-600' : 'bg-blue-700 hover:bg-blue-600'"
          >
            <span>{{ isRefreshing ? '⏳' : '🔄' }}</span>
            <span>{{ translate('refresh') }}</span>
          </button>
          <div class="text-xs text-slate-500">
            {{ translate('companyDataLastUpdated') }}: <span class="text-slate-400">{{ formattedLastFetched }}</span>
          </div>
          <div v-if="hasError && errorMessage" class="text-red-400 text-xs">
            ❌ {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>

    <!-- Starting Bonus -->
    <div class="rounded border border-slate-700 bg-slate-900 p-4 space-y-3">
      <div class="flex-1">
        <div class="font-semibold">{{ translate('technologyStartingBonusTitle') }}</div>
        <p class="text-sm text-slate-400">{{ translate('technologyStartingBonusHint') }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-4 text-sm">
        <label class="flex items-center gap-2">
          <span class="text-slate-300">{{ translate('startingBonus') }}</span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            class="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-24"
            v-model.number="startingBonus"
          />
        </label>
        <span class="text-xs text-slate-400">{{ translate('technologyBonusDisplay') }}: {{ startingBonusDisplay }}</span>
      </div>
    </div>

    <!-- Technology Levels -->
    <div class="space-y-3">
      <h2 class="text-lg font-semibold">{{ translate('technologyHeading') }}</h2>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="tech in TECHNOLOGIES"
          :key="tech.id"
          class="rounded border p-4 space-y-3"
          :class="plannedLevel(tech.id) !== currentLevel(tech.id) ? 'border-blue-700 bg-blue-900' : 'border-slate-700 bg-slate-900'"
        >
          <div>
            <div class="font-medium">{{ translate(tech.nameKey) }}</div>
            <p class="text-xs text-slate-400 leading-relaxed">{{ translate(tech.descriptionKey) }}</p>
          </div>

          <!-- Current Level (from API) -->
          <div class="flex flex-wrap items-center gap-3 text-sm">
            <div class="flex items-center gap-2">
              <span class="text-slate-400">{{ translate('currentLevel') }}:</span>
              <span class="text-slate-300 font-semibold">{{ currentLevel(tech.id) }}</span>
            </div>
            <span class="text-xs text-slate-400">
              {{ formatBonus(currentLevel(tech.id)) }}
            </span>
          </div>

          <!-- Planned Level (Editable, for planning your production) -->
          <div class="flex flex-wrap items-center gap-3 text-sm">
            <label class="flex items-center gap-2">
              <span class="text-slate-300">{{ translate('plannedLevel') }}</span>
              <input
                :value="plannedLevel(tech.id)"
                type="number"
                :min="currentLevel(tech.id)"
                step="1"
                class="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-20"
                :class="{ 'border-blue-500 ring-1 ring-blue-500': plannedLevel(tech.id) !== currentLevel(tech.id) }"
                @input="onLevelInput(tech.id, $event)"
              />
            </label>
            <span class="text-xs text-slate-400">
              {{ formatBonus(plannedLevel(tech.id)) }}
            </span>
          </div>

          <!-- Net Profit Forecast (+1 Level) -->
          <div class="border-t border-slate-700/50 pt-3 space-y-2">
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="text-slate-400 flex-shrink-0">{{ translate('technologyUpgradeCost') }}:</span>
              <span class="text-slate-300 font-semibold text-right">{{ getUpgradeCostDisplay(tech.id) }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">{{ translate('technologyNetProfitForecast') }}:</span>
              <span class="font-semibold" :class="getForecastColorClass(tech.id)">
                {{ formatNetProfitForecast(tech.id) }}/{{ translate('day') }}
              </span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">{{ translate('technologyROI') }}:</span>
              <span class="text-slate-300 font-semibold">{{ formatROI(tech.id) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
