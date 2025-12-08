<script setup lang="ts">
import { computed } from 'vue'
import { translate, formatCurrency, formatNumber } from '@/v2/localisation'
import type { BaseSummaryData } from '@/v2/composables/useGlobalSummary'
import type { GdIndex } from '@/v2/services/gamedata/types'
import MaterialIcon from './MaterialIcon.vue'

const props = defineProps<{
  summary: BaseSummaryData
  isExpanded: boolean
  index?: GdIndex
  timeframeHours?: number
}>()

const emit = defineEmits<{
  toggle: []
  navigate: []
}>()

const periodLabel = computed(() => translate('perHours', { hours: props.timeframeHours ?? 24 }))

// Summary values are already scaled by periodFactor for the selected timeframe
const netProfit = computed(() => props.summary.netProfit)
const exportNetProfit = computed(() => props.summary.exportNetProfit)

const profitColor = computed(() => {
  if (netProfit.value > 0) return 'text-emerald-400'
  if (netProfit.value < 0) return 'text-red-400'
  return 'text-slate-400'
})

const productivityColor = computed(() => {
  const percent = props.summary.workforceProductivity.overallProductivityPercent
  if (percent >= 95) return 'text-emerald-400'
  if (percent >= 75) return 'text-amber-400'
  return 'text-red-400'
})

const hasIssues = computed(() => {
  return (
    props.summary.materialsRunningOut.length > 0 ||
    props.summary.workforceProductivity.overallProductivityPercent < 90 ||
    props.summary.workforceCoverage < 90
  )
})

// All export materials (show all with icons)
const topExportMaterials = computed(() => {
  return props.summary.exportMaterials
})

const getMaterialName = (materialId: number): string => {
  if (!props.index) return `Material ${materialId}`
  return props.index.materialById.get(materialId)?.name || `Material ${materialId}`
}

const priceTrendColor = computed(() => {
  const trend = props.summary.exportPriceTrend7d
  if (!trend || !Number.isFinite(trend)) return 'text-slate-400'
  if (trend > 5) return 'text-emerald-400' // strong positive
  if (trend > 0) return 'text-green-300' // slight positive
  if (trend < -5) return 'text-red-400' // strong negative
  if (trend < 0) return 'text-orange-300' // slight negative
  return 'text-slate-400' // stable
})

const priceTrendIcon = computed(() => {
  const trend = props.summary.exportPriceTrend7d
  if (!trend || !Number.isFinite(trend)) return ''
  if (trend > 5) return '📈' // strong positive
  if (trend > 0) return '↗' // slight positive
  if (trend < -5) return '📉' // strong negative
  if (trend < 0) return '↘' // slight negative
  return '→' // stable
})

const showPriceTrend = computed(() => {
  const trend = props.summary.exportPriceTrend7d
  return trend !== undefined && Number.isFinite(trend) && trend !== 0
})
</script>

<template>
  <div
    class="base-card"
    :class="{ 'base-card--expanded': isExpanded, 'base-card--has-issues': hasIssues }"
  >
    <div class="base-card__header" @click="emit('toggle')">
      <div class="base-card__info">
        <div class="base-card__name">
          {{ summary.baseName }}
          <span v-if="hasIssues" class="base-card__warning-badge">⚠️</span>
        </div>
        <div class="base-card__planet">{{ translate('planet') }} {{ summary.planetId }}</div>
      </div>
      <button class="base-card__toggle" :aria-label="isExpanded ? 'Collapse' : 'Expand'">
        <span v-if="isExpanded">▼</span>
        <span v-else>▶</span>
      </button>
    </div>

    <div class="base-card__body">
      <!-- Collapsed View: Key Metrics -->
      <div v-if="!isExpanded" class="base-card__metrics">
        <div class="metric">
          <div class="metric__label">💰 {{ translate('netProfit') }}</div>
          <div class="metric__value" :class="profitColor">
            {{ formatCurrency(netProfit) }}
          </div>
        </div>

        <div class="metric">
          <div class="metric__label">📦 {{ translate('exportNetProfit') }}</div>
          <div class="metric__value text-emerald-400">
            {{ formatCurrency(exportNetProfit) }}
            <span v-if="showPriceTrend" class="price-trend" :class="priceTrendColor">
              {{ priceTrendIcon }} {{ formatNumber(Math.abs(summary.exportPriceTrend7d), { maximumFractionDigits: 1 }) }}%
            </span>
          </div>
        </div>

        <div class="metric">
          <div class="metric__label">🚢 {{ translate('exportMaterials') }}</div>
          <div class="metric__value export-materials-list">
            <span v-if="topExportMaterials.length === 0" class="text-slate-400">—</span>
            <div v-else class="export-materials-grid">
              <div
                v-for="exportMat in topExportMaterials"
                :key="exportMat.materialId"
                class="export-material-item"
                :title="getMaterialName(exportMat.materialId)"
              >
                <MaterialIcon
                  v-if="index"
                  :name="getMaterialName(exportMat.materialId)"
                  :size="16"
                />
                <span v-else class="material-text">
                  {{ getMaterialName(exportMat.materialId).substring(0, 3) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="metric">
          <div class="metric__label">👷 {{ translate('productivity') }}</div>
          <div class="metric__value" :class="productivityColor">
            {{ formatNumber(summary.workforceProductivity.overallProductivityPercent) }}%
          </div>
        </div>
      </div>

      <!-- Expanded View: Detailed Information -->
      <div v-else class="base-card__details">
        <slot name="expanded-content" :summary="summary">
          <!-- Default expanded content (will be replaced by parent) -->
          <div class="text-sm text-slate-400">{{ translate('loadingDetails') }}...</div>
        </slot>
      </div>
    </div>

    <div v-if="!isExpanded" class="base-card__footer">
      <button class="btn btn--sm btn--outline" @click.stop="emit('navigate')">
        {{ translate('viewDetails') }} →
      </button>
    </div>
  </div>
</template>

<style scoped>
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

.base-card--has-issues {
  border-color: rgba(251, 191, 36, 0.5);
  background: rgb(30 41 59);
}

.base-card--expanded {
  border-color: rgb(139, 92, 246);
}

.base-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: rgb(15 23 42);
  border-bottom: 1px solid rgb(51 65 85);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.base-card__header:hover {
  background: rgb(30 41 59);
}

.base-card__info {
  flex: 1;
}

.base-card__name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.base-card__warning-badge {
  font-size: 0.875rem;
}

.base-card__planet {
  font-size: 0.875rem;
  color: var(--color-text-soft);
}

.base-card__toggle {
  padding: 0.5rem;
  background: none;
  border: none;
  color: var(--color-text-soft);
  cursor: pointer;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.base-card__toggle:hover {
  color: var(--color-text);
}

.base-card__body {
  padding: 1.25rem;
}

.base-card__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metric__label {
  font-size: 0.8125rem;
  color: var(--color-text-soft);
  white-space: nowrap;
}

.metric__value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.price-trend {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: rgba(0, 0, 0, 0.2);
}

.text-emerald-400 {
  color: rgb(52, 211, 153);
}

.text-green-300 {
  color: rgb(134, 239, 172);
}

.text-orange-300 {
  color: rgb(253, 186, 116);
}

.text-amber-400 {
  color: rgb(251, 191, 36);
}

.text-red-400 {
  color: rgb(248, 113, 113);
}

.text-slate-400 {
  color: rgb(148, 163, 184);
}

.export-materials-list {
  display: flex;
  align-items: center;
}

.export-materials-grid {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
  max-width: 200px;
}

.export-material-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 0.25rem;
  background: rgb(15 23 42);
  border: 1px solid rgb(51 65 85);
  transition: all 0.2s;
}

.export-material-item:hover {
  border-color: rgb(71 85 105);
  transform: scale(1.1);
}

.material-text {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--color-text);
}

.export-more {
  font-size: 0.75rem;
  color: rgb(148, 163, 184);
  font-weight: 500;
}

.base-card__details {
  /* Content provided by parent component via slot */
}

.base-card__footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid rgb(51 65 85);
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: none;
}

.btn--sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.btn--outline {
  border: 1px solid rgb(51 65 85);
  color: var(--color-text);
}

.btn--outline:hover {
  background: rgb(30 41 59);
  border-color: rgb(71 85 105);
}

@media (max-width: 768px) {
  .base-card__metrics {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .metric__label {
    font-size: 0.75rem;
  }

  .metric__value {
    font-size: 0.9375rem;
  }
}
</style>
