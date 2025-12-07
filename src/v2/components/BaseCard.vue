<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '@/v2/utils/formatNumber'
import { translate } from '@/v2/localisation'
import type { BaseSummaryData } from '@/v2/composables/useGlobalSummary'

const props = defineProps<{
  summary: BaseSummaryData
  isExpanded: boolean
}>()

const emit = defineEmits<{
  toggle: []
  navigate: []
}>()

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const profitColor = computed(() => {
  if (props.summary.netProfit > 0) return 'text-emerald-400'
  if (props.summary.netProfit < 0) return 'text-red-400'
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
            {{ formatCurrency(summary.netProfit) }}/{{ translate('day') }}
          </div>
        </div>

        <div class="metric">
          <div class="metric__label">📦 {{ translate('exportValue') }}</div>
          <div class="metric__value text-emerald-400">
            {{ formatCurrency(summary.exportNetProfit) }}/{{ translate('day') }}
          </div>
        </div>

        <div class="metric">
          <div class="metric__label">🚢 {{ translate('exportMaterials') }}</div>
          <div class="metric__value">
            {{ summary.exportMaterials.length }}
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
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.2s;
}

.base-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.base-card--has-issues {
  border-color: rgba(251, 191, 36, 0.3);
  background: rgba(251, 191, 36, 0.02);
}

.base-card--expanded {
  border-color: rgb(139, 92, 246);
}

.base-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--color-background-mute);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.base-card__header:hover {
  background: var(--color-background);
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
}

.text-emerald-400 {
  color: rgb(52, 211, 153);
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

.base-card__details {
  /* Content provided by parent component via slot */
}

.base-card__footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--color-border);
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
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn--outline:hover {
  background: var(--color-background-mute);
  border-color: var(--color-border-hover);
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
