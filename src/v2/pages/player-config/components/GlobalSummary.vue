<script setup lang="ts">
import { ref, toRef } from 'vue'
import type { GameData, GdIndex } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import { useGlobalSummary } from '@/v2/composables/useGlobalSummary'
import { formatPrice, formatNumber } from '@/v2/utils/formatNumber'
import { translate } from '@/v2/localisation'

const props = defineProps<{
  bases: PlayerBase[]
  gameData: GameData
  index: GdIndex
  priceResolver: (materialId: number) => number
  technologyLevels: Partial<Record<number, number>>
  currentTechnologyLevels?: Partial<Record<number, number>>
  startingBonus: number
  timeframeHours: number
  globalWorkforceBurden: number
  exportThreshold: number
}>()

const isOpen = ref(true)

const { totalNetProfit, totalExportNetProfit, totalConsumptionOverheadCost, totalWorkers } =
  useGlobalSummary(
    toRef(() => props.bases),
    toRef(() => props.gameData),
    toRef(() => props.index),
    toRef(() => props.priceResolver),
    toRef(() => props.technologyLevels),
    toRef(() => props.startingBonus),
    toRef(() => props.timeframeHours),
    toRef(() => props.globalWorkforceBurden),
    toRef(() => props.exportThreshold),
    undefined, // no market opportunities in player config page
    toRef(() => props.currentTechnologyLevels),
  )
</script>

<template>
  <details class="border border-amber-600 rounded bg-gradient-to-br from-slate-800 to-slate-900 mb-4" :open="isOpen" @toggle="isOpen = ($event.target as HTMLDetailsElement).open">
    <summary class="px-4 py-3 cursor-pointer font-semibold text-amber-300 flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <span>{{ translate('globalSummary') }}</span>
    </summary>

    <div class="px-4 py-3 space-y-4">
      <!-- Key Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-slate-700/50 rounded p-3">
          <div class="text-sm text-slate-400 mb-2">{{ translate('totalNetProfit') }}</div>
          <div>
            <div class="flex items-baseline justify-between">
              <span class="text-xs text-slate-400">Current:</span>
              <span class="text-lg font-semibold" :class="totalNetProfit.current >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                {{ formatPrice(totalNetProfit.current, 0) }}
              </span>
            </div>
            <div class="flex items-baseline justify-between">
              <span class="text-xs text-slate-400">Planned:</span>
              <span class="text-lg font-semibold" :class="totalNetProfit.planned >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                {{ formatPrice(totalNetProfit.planned, 0) }}
              </span>
            </div>
          </div>
        </div>

        <div class="bg-slate-700/50 rounded p-3">
          <div class="text-sm text-slate-400 mb-2">{{ translate('exportNetProfit') }}</div>
          <div>
            <div class="flex items-baseline justify-between">
              <span class="text-xs text-slate-400">Current:</span>
              <span class="text-lg font-semibold" :class="totalExportNetProfit.current >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                {{ formatPrice(totalExportNetProfit.current, 0) }}
              </span>
            </div>
            <div class="flex items-baseline justify-between">
              <span class="text-xs text-slate-400">Planned:</span>
              <span class="text-lg font-semibold" :class="totalExportNetProfit.planned >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                {{ formatPrice(totalExportNetProfit.planned, 0) }}
              </span>
            </div>
          </div>
          <div class="text-xs text-slate-400 mt-1">{{ translate('exportNetProfitHint') }}</div>
        </div>

        <div class="bg-slate-700/50 rounded p-3">
          <div class="text-sm text-slate-400 mb-2">{{ translate('consumptionOverheadCost') }}</div>
          <div>
            <div class="flex items-baseline justify-between">
              <span class="text-xs text-slate-400">
                Current ({{ formatNumber(totalWorkers.current, 0) }} workers):
              </span>
              <span class="text-lg font-semibold text-amber-300">
                {{ formatPrice(totalConsumptionOverheadCost.current, 0) }}
              </span>
            </div>
            <div class="flex items-baseline justify-between">
              <span class="text-xs text-slate-400">
                Planned ({{ formatNumber(totalWorkers.planned, 0) }} workers):
              </span>
              <span class="text-lg font-semibold text-amber-300">
                {{ formatPrice(totalConsumptionOverheadCost.planned, 0) }}
              </span>
            </div>
          </div>
          <div class="text-xs text-slate-400 mt-2">{{ translate('consumptionOverheadHint') }}</div>
        </div>
      </div>
    </div>
  </details>
</template>
