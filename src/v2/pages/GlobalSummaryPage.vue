<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayerBases } from '@/v2/services/playerBases'
import { useGlobalSummary } from '@/v2/composables/useGlobalSummary'
import { useMaterialPricing } from '@/v2/services/gamedata/prices'
import { usePlayerTechnology } from '@/v2/services/playerTechnology'
import { getExportThresholdRef } from '@/v2/services/config/exportThreshold'
import type { GameData, GdIndex } from '@/v2/services/gamedata/types'
import BaseCard from '@/v2/components/BaseCard.vue'
import BaseDetailExpanded from '@/v2/components/BaseDetailExpanded.vue'
import { translate } from '@/v2/localisation'

const props = defineProps<{
  gameData: GameData
  index: GdIndex
}>()

const { state, toggleBaseOpen } = usePlayerBases(props.gameData)
const bases = computed(() => state.value.bases)
const expandedBases = computed(() => state.value.ui.basesOpen)

const { priceResolver } = useMaterialPricing(props.gameData)
const { state: technologyState } = usePlayerTechnology()
const exportThreshold = getExportThresholdRef()

const timeframeHours = ref(168) // 7 days default
const globalWorkforceBurden = ref(2000) // Default threshold

const technologyLevels = computed(() => technologyState.value.levels)
const startingBonus = computed(() => technologyState.value.startingBonus)

const summary = useGlobalSummary(
  bases,
  computed(() => props.gameData),
  computed(() => props.index),
  priceResolver,
  technologyLevels,
  startingBonus,
  computed(() => timeframeHours.value),
  globalWorkforceBurden,
  exportThreshold,
)

// Use baseReports from useGlobalSummary instead of recalculating
const baseReports = computed(() => {
  const map = new Map()
  summary.baseReports.value.forEach(({ base, report }) => {
    map.set(base.id, report)
  })
  return map
})

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

const getMaterialName = (materialId: number): string => {
  return props.index.materialById.get(materialId)?.name || `Material ${materialId}`
}

const toggleBase = (baseId: string) => {
  toggleBaseOpen(baseId)
}

const navigateToBase = (baseId: string) => {
  // For now, just expand - later can navigate to player-config page
  if (!expandedBases.value[baseId]) {
    toggleBaseOpen(baseId)
  }
}

const isBaseExpanded = (baseId: string): boolean => {
  return expandedBases.value[baseId] ?? false
}
</script>

<template>
  <div class="global-summary">
    <!-- Timeframe Control -->
    <div class="flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-slate-700">
      <h1 class="text-xl font-semibold text-slate-100">{{ translate('globalSummary') }}</h1>
      <div class="flex items-center gap-2 text-sm">
        <label class="flex items-center gap-2 text-slate-300">
          <span>{{ translate('timeframeHoursLabel') }}</span>
          <input
            v-model.number="timeframeHours"
            type="number"
            min="1"
            max="336"
            step="24"
            class="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <span class="text-slate-500 text-xs hidden md:inline">
          {{ translate('timeframeHoursHint') }}
        </span>
      </div>
    </div>

    <!-- Overview Header -->
    <div class="global-summary__header">
      <div class="global-summary__stats">
        <div class="stat-card stat-card--primary">
          <div class="stat-card__icon">💰</div>
          <div class="stat-card__content">
            <div class="stat-card__label">Total Net Profit</div>
            <div class="stat-card__value">{{ formatCurrency(summary.totalNetProfit.value) }}/day</div>
          </div>
        </div>
        
        <div class="stat-card" v-if="summary.totalWorkforceDeficitCost.value > 0">
          <div class="stat-card__icon">👷</div>
          <div class="stat-card__content">
            <div class="stat-card__label">Workforce Deficit Cost</div>
            <div class="stat-card__value stat-card__value--warning">
              {{ formatCurrency(summary.totalWorkforceDeficitCost.value) }}/day
            </div>
          </div>
        </div>
        
        <div class="stat-card" v-if="summary.totalConsumptionOverheadCost.value > 0">
          <div class="stat-card__icon">📊</div>
          <div class="stat-card__content">
            <div class="stat-card__label">Consumption Overhead</div>
            <div class="stat-card__value stat-card__value--info">
              {{ formatCurrency(summary.totalConsumptionOverheadCost.value) }}/day
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bases Grid -->
    <section class="global-summary__section">
      <h2 class="section-title">🏭 {{ translate('yourBases') }} ({{ bases.length }})</h2>
      <div class="bases-grid">
        <BaseCard
          v-for="baseSummary in summary.baseSummaries.value" 
          :key="baseSummary.baseId"
          :summary="baseSummary"
          :is-expanded="isBaseExpanded(baseSummary.baseId)"
          :index="index"
          :timeframe-hours="timeframeHours"
          @toggle="toggleBase(baseSummary.baseId)"
          @navigate="navigateToBase(baseSummary.baseId)"
        >
          <template #expanded-content="{ summary: expandedSummary }">
            <BaseDetailExpanded
              v-if="baseReports.get(expandedSummary.baseId)"
              :summary="expandedSummary"
              :report="baseReports.get(expandedSummary.baseId)!"
              :index="index"
              :timeframe-hours="timeframeHours"
            />
          </template>
        </BaseCard>
      </div>
      
      <div v-if="bases.length === 0" class="empty-state">
        <div class="empty-state__icon">🏭</div>
        <div class="empty-state__text">{{ translate('noBasesConfigured') }}</div>
      </div>
    </section>

    <!-- Stock Warnings -->
    <section class="global-summary__section" v-if="summary.baseSummaries.value.some((b: any) => b.materialsRunningOut.length > 0)">
      <h2 class="section-title">⚠️ Materials Running Out of Stock</h2>
      <div class="stock-warnings">
        <div 
          v-for="baseSummary in summary.baseSummaries.value.filter((b: any) => b.materialsRunningOut.length > 0)" 
          :key="baseSummary.baseId"
          class="stock-warning-group"
        >
          <h3 class="stock-warning-group__title">{{ baseSummary.baseName }}</h3>
          <div class="stock-warning-list">
            <div 
              v-for="material in baseSummary.materialsRunningOut" 
              :key="material.materialId"
              class="stock-warning-item"
            >
              <div class="stock-warning-item__material">
                {{ getMaterialName(material.materialId) }}
              </div>
              <div class="stock-warning-item__details">
                <span class="detail">{{ formatNumber(material.currentStock) }} units</span>
                <span class="detail detail--danger">{{ formatNumber(material.daysUntilEmpty) }} days left</span>
                <span class="detail">-{{ formatNumber(material.consumptionPerDay) }}/day</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Global Materials Overview -->
    <section class="global-summary__section">
      <h2 class="section-title">📦 Global Materials Balance</h2>
      <div class="materials-table-wrapper">
        <table class="materials-table">
          <thead>
            <tr>
              <th>Material</th>
              <th class="text-right">Production</th>
              <th class="text-right">Consumption</th>
              <th class="text-right">Net Balance</th>
              <th class="text-right">Value/Day</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="material in summary.globalMaterials.value.filter((m: any) => Math.abs(m.netBalance) > 0.01)" 
              :key="material.materialId"
            >
              <td class="material-name">
                {{ getMaterialName(material.materialId) }}
              </td>
              <td class="text-right">{{ formatNumber(material.totalProduction) }}</td>
              <td class="text-right">{{ formatNumber(material.totalConsumption) }}</td>
              <td 
                class="text-right"
                :class="{
                  'text-success': material.netBalance > 0,
                  'text-danger': material.netBalance < 0
                }"
              >
                {{ material.netBalance > 0 ? '+' : '' }}{{ formatNumber(material.netBalance) }}
              </td>
              <td class="text-right">{{ formatCurrency(material.totalValue) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.global-summary {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.global-summary__header {
  margin-bottom: 2rem;
}

.global-summary__title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 1.5rem;
  color: var(--color-heading);
}

.global-summary__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: rgb(30 41 59);
  border: 1px solid rgb(51 65 85);
  border-radius: 0.75rem;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: rgb(71 85 105);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.stat-card--primary {
  border-color: rgba(139, 92, 246, 0.4);
  background: rgb(30 41 59);
}

.stat-card__icon {
  font-size: 2.5rem;
}

.stat-card__content {
  flex: 1;
}

.stat-card__label {
  font-size: 0.875rem;
  color: var(--color-text-soft);
  margin-bottom: 0.25rem;
}

.stat-card__value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-heading);
}

.stat-card__value--warning {
  color: #f59e0b;
}

.stat-card__value--info {
  color: #3b82f6;
}

.global-summary__section {
  margin-bottom: 2.5rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1rem;
  color: var(--color-heading);
}

.bases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

.base-card {
  background: rgb(30 41 59);
  border: 1px solid rgb(51 65 85);
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.2s;
}

.base-card:hover {
  border-color: rgb(71 85 105);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.base-card__header {
  padding: 1.25rem;
  background: rgb(15 23 42);
  border-bottom: 1px solid rgb(51 65 85);
}

.base-card__name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 0.25rem;
}

.base-card__planet {
  font-size: 0.875rem;
  color: var(--color-text-soft);
}

.base-card__body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.base-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.base-metric__label {
  font-size: 0.875rem;
  color: var(--color-text-soft);
}

.base-metric__value {
  font-weight: 600;
  color: var(--color-text);
}

.base-metric__value--good {
  color: #10b981;
}

.base-metric__value--warning {
  color: #f59e0b;
}

.base-metric__value--danger {
  color: #ef4444;
}

.base-card__footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid rgb(51 65 85);
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid rgb(51 65 85);
  border-radius: 0.375rem;
  background: rgb(15 23 42);
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: rgb(30 41 59);
  border-color: rgb(71 85 105);
}

.btn--sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.btn--primary {
  background: rgb(139, 92, 246);
  border-color: rgb(139, 92, 246);
  color: white;
}

.btn--primary:hover {
  background: rgb(124, 58, 237);
  border-color: rgb(124, 58, 237);
}

.empty-state {
  padding: 3rem;
  text-align: center;
  background: rgb(30 41 59);
  border: 2px dashed rgb(51 65 85);
  border-radius: 0.75rem;
}

.empty-state__icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state__text {
  font-size: 1.125rem;
  color: var(--color-text-soft);
  margin-bottom: 1.5rem;
}

.stock-warnings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stock-warning-group {
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 0.75rem;
  padding: 1.25rem;
}

.stock-warning-group__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem;
  color: var(--color-heading);
}

.stock-warning-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.stock-warning-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgb(15 23 42);
  border-radius: 0.5rem;
}

.stock-warning-item__material {
  font-weight: 500;
  color: var(--color-heading);
}

.stock-warning-item__details {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
}

.detail {
  color: var(--color-text-soft);
}

.detail--danger {
  color: #ef4444;
  font-weight: 600;
}

.materials-table-wrapper {
  overflow-x: auto;
  border: 1px solid rgb(51 65 85);
  border-radius: 0.75rem;
}

.materials-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.materials-table thead {
  background: rgb(15 23 42);
  border-bottom: 2px solid rgb(51 65 85);
}

.materials-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
}

.materials-table td {
  padding: 0.75rem 1rem;
  border-top: 1px solid rgb(51 65 85);
}

.material-name {
  font-weight: 500;
  color: var(--color-heading);
}

.text-right {
  text-align: right;
}

.text-success {
  color: #10b981;
  font-weight: 600;
}

.text-danger {
  color: #ef4444;
  font-weight: 600;
}

@media (max-width: 768px) {
  .global-summary {
    padding: 1rem;
  }
  
  .global-summary__title {
    font-size: 1.5rem;
  }
  
  .global-summary__stats {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: 1rem;
  }
  
  .stat-card__icon {
    font-size: 2rem;
  }
  
  .stat-card__value {
    font-size: 1.25rem;
  }
  
  .section-title {
    font-size: 1.25rem;
  }
  
  .bases-grid {
    grid-template-columns: 1fr;
  }
  
  .materials-table {
    font-size: 0.8125rem;
  }
  
  .materials-table th,
  .materials-table td {
    padding: 0.5rem 0.75rem;
  }
  
  .stock-warning-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .stock-warning-item__details {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .global-summary {
    padding: 0.75rem;
  }
  
  .global-summary__header {
    margin-bottom: 1.5rem;
  }
  
  .stat-card {
    padding: 0.875rem;
  }
  
  .materials-table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .materials-table {
    min-width: 500px;
  }
}
</style>
