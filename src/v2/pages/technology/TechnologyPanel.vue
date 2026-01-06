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
import { refreshEntry } from '@/v2/services/syncService'

const { state, setLevel, setStartingBonus } = usePlayerTechnology()
const { current } = useWorldData()

const isRefreshing = ref(false)

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
      setStartingBonus(numeric)
    }
  },
})

// Current level from API (read-only)
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
  setLevel(id, level)
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
</script>

<template>
  <div class="space-y-6 text-slate-100">
    <!-- Company Data Last Updated -->
    <div class="rounded border border-slate-700 bg-slate-900 p-4">
      <div class="flex items-center justify-between">
        <div class="text-sm text-slate-400">
          {{ translate('companyDataLastUpdated') }}: <span class="text-slate-300">{{ formattedLastFetched }}</span>
        </div>
        <button
          @click="handleRefreshCompanyData"
          :disabled="isRefreshing"
          class="px-3 py-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm flex items-center gap-2"
        >
          <span>{{ isRefreshing ? '⏳' : '🔄' }}</span>
          <span>{{ translate('refresh') }}</span>
        </button>
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
          class="rounded border border-slate-700 bg-slate-900 p-4 space-y-3"
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
                min="0"
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
        </div>
      </div>
    </div>
  </div>
</template>
