<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '@/v2/utils/formatNumber'
import { translate } from '@/v2/localisation'
import MaterialIcon from '@/v2/components/MaterialIcon.vue'
import type { BaseSummaryData } from '@/v2/composables/useGlobalSummary'
import type { BaseReport } from '@/v2/services/production/types'
import type { GdIndex } from '@/v2/services/gamedata/types'

const props = defineProps<{
  summary: BaseSummaryData
  report: BaseReport
  index: GdIndex
  timeframeHours: number
}>()

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const periodFactor = computed(() => props.timeframeHours / 24)

const getMaterialName = (materialId: number): string => {
  return props.index.materialById.get(materialId)?.name || `Material ${materialId}`
}

const getTierLabel = (tier: 1 | 2 | 3 | 4): string => {
  return translate(`workerTier${tier}`)
}

// Group materials by balance type
const materialsProducing = computed(() => 
  props.report.materials.filter(m => m.balancePerDay > 0.01)
)

const materialsConsuming = computed(() => 
  props.report.materials.filter(m => m.balancePerDay < -0.01)
)

const materialsBalanced = computed(() => 
  props.report.materials.filter(m => Math.abs(m.balancePerDay) <= 0.01)
)

// Calculate total values
const totalProductionValue = computed(() => 
  materialsProducing.value.reduce((sum, m) => sum + m.valuePerDay, 0) * periodFactor.value
)

const totalConsumptionValue = computed(() => 
  Math.abs(materialsConsuming.value.reduce((sum, m) => sum + m.valuePerDay, 0)) * periodFactor.value
)

const productivityColor = (percent: number) => {
  if (percent >= 95) return 'text-emerald-400'
  if (percent >= 75) return 'text-amber-400'
  return 'text-red-400'
}

const getLimitingMaterialName = (materialId: number | undefined): string => {
  if (!materialId) return ''
  return getMaterialName(materialId)
}
</script>

<template>
  <div class="base-details">
    <!-- Economic Summary -->
    <section class="detail-section">
      <h3 class="detail-section__title">💰 {{ translate('dailySummary') }}</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-item__label">{{ translate('productionRevenue') }}</span>
          <span class="summary-item__value text-emerald-400">
            {{ formatCurrency(report.summary.productionRevenue * periodFactor) }}
          </span>
        </div>
        <div class="summary-item">
          <span class="summary-item__label">{{ translate('materialPurchaseCosts') }}</span>
          <span class="summary-item__value text-red-400">
            {{ formatCurrency(report.summary.materialPurchaseCosts * periodFactor) }}
          </span>
        </div>
        <div class="summary-item">
          <span class="summary-item__label">{{ translate('workerPurchaseCosts') }}</span>
          <span class="summary-item__value text-red-400">
            {{ formatCurrency(report.summary.workerPurchaseCosts * periodFactor) }}
          </span>
        </div>
        <div class="summary-item summary-item--highlight">
          <span class="summary-item__label">{{ translate('netResult') }}</span>
          <span 
            class="summary-item__value"
            :class="report.summary.net > 0 ? 'text-emerald-400' : 'text-red-400'"
          >
            {{ formatCurrency(report.summary.net * periodFactor) }}
          </span>
        </div>
      </div>
    </section>

    <!-- Workforce Productivity -->
    <section class="detail-section">
      <h3 class="detail-section__title">👷 {{ translate('workforceProductivity') }}</h3>
      
      <div class="workforce-overall">
        <div class="workforce-overall__main">
          <span class="workforce-overall__label">{{ translate('overallProductivity') }}</span>
          <span 
            class="workforce-overall__value"
            :class="productivityColor(summary.workforceProductivity.overallProductivityPercent)"
          >
            {{ formatNumber(summary.workforceProductivity.overallProductivityPercent) }}%
          </span>
        </div>
        <div class="workforce-overall__explanation">
          {{ summary.workforceProductivity.explanation }}
        </div>
        <div 
          v-if="summary.workforceProductivity.potentialLostProfitPerDay > 1" 
          class="workforce-overall__lost-profit"
        >
          ⚠️ {{ translate('potentialLostProfit') }}: 
          <span class="text-amber-400">
            {{ formatCurrency(summary.workforceProductivity.potentialLostProfitPerDay * periodFactor) }}
          </span>
        </div>
      </div>

      <div class="workforce-tiers">
        <div 
          v-for="tier in summary.workforceProductivity.tiers" 
          :key="tier.tier"
          class="workforce-tier"
        >
          <div class="workforce-tier__header">
            <span class="workforce-tier__name">{{ getTierLabel(tier.tier) }}</span>
            <span 
              class="workforce-tier__productivity"
              :class="productivityColor(tier.productivityPercent)"
            >
              {{ formatNumber(tier.productivityPercent) }}%
            </span>
          </div>
          <div class="workforce-tier__details">
            <div class="workforce-tier__metric">
              <span class="label">{{ translate('requiredWorkers') }}:</span>
              <span>{{ formatNumber(tier.requiredWorkers, 0) }}</span>
            </div>
            <div class="workforce-tier__metric">
              <span class="label">{{ translate('housingCapacity') }}:</span>
              <span :class="tier.housingCoverage < 100 ? 'text-amber-400' : ''">
                {{ formatNumber(tier.housingCoverage) }}%
              </span>
            </div>
            <div class="workforce-tier__metric">
              <span class="label">{{ translate('consumptionCoverage') }}:</span>
              <span :class="tier.consumptionCoverage < 100 ? 'text-amber-400' : ''">
                {{ formatNumber(tier.consumptionCoverage) }}%
              </span>
            </div>
          </div>
          <div v-if="tier.limitingFactor !== 'none'" class="workforce-tier__limiting">
            <span v-if="tier.limitingFactor === 'housing'" class="text-amber-400">
              🏠 {{ translate('limitedByHousing') }}
            </span>
            <span v-else-if="tier.limitingMaterialId" class="text-amber-400">
              📦 {{ translate('limitedByMaterial') }}: {{ getLimitingMaterialName(tier.limitingMaterialId) }}
              <span v-if="tier.daysOfConsumptionRemaining !== undefined">
                ({{ formatNumber(tier.daysOfConsumptionRemaining, 1) }} {{ translate('daysLeft') }})
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Export Materials -->
    <section v-if="summary.exportMaterials.length > 0" class="detail-section">
      <h3 class="detail-section__title">🚢 {{ translate('exportMaterials') }} ({{ summary.exportMaterials.length }})</h3>
      <div class="materials-list">
        <div 
          v-for="material in summary.exportMaterials.slice(0, 5)" 
          :key="material.materialId"
          class="material-item"
        >
          <div class="material-item__info">
            <MaterialIcon :name="getMaterialName(material.materialId)" variant="sm" />
            <span class="material-item__name">{{ getMaterialName(material.materialId) }}</span>
          </div>
          <div class="material-item__details">
            <span class="text-emerald-400">{{ formatNumber(material.exportPerDay) }}/{{ translate('day') }}</span>
            <span class="text-slate-400">({{ formatNumber(material.exportRatio) }}%)</span>
            <span class="text-emerald-400 font-semibold">{{ formatCurrency(material.valuePerDay) }}</span>
          </div>
        </div>
        <div v-if="summary.exportMaterials.length > 5" class="text-sm text-slate-400 mt-2">
          +{{ summary.exportMaterials.length - 5 }} {{ translate('more') }}
        </div>
      </div>
    </section>

    <!-- Materials Running Out -->
    <section v-if="summary.materialsRunningOut.length > 0" class="detail-section detail-section--warning">
      <h3 class="detail-section__title">⚠️ {{ translate('materialsRunningOut') }}</h3>
      <div class="materials-list">
        <div 
          v-for="material in summary.materialsRunningOut" 
          :key="material.materialId"
          class="material-item material-item--warning"
        >
          <div class="material-item__info">
            <MaterialIcon :name="getMaterialName(material.materialId)" variant="sm" />
            <span class="material-item__name">{{ getMaterialName(material.materialId) }}</span>
          </div>
          <div class="material-item__details">
            <span>{{ formatNumber(material.currentStock) }} {{ translate('units') }}</span>
            <span class="text-red-400 font-semibold">
              {{ formatNumber(material.daysUntilEmpty, 1) }} {{ translate('daysLeft') }}
            </span>
            <span class="text-slate-400">-{{ formatNumber(material.consumptionPerDay) }}/{{ translate('day') }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Materials Balance Overview -->
    <section class="detail-section">
      <h3 class="detail-section__title">📦 {{ translate('materialBalance') }}</h3>
      
      <div class="balance-summary">
        <div class="balance-summary__item">
          <span class="label">{{ translate('production') }}:</span>
          <span class="text-emerald-400">{{ formatCurrency(totalProductionValue) }}</span>
        </div>
        <div class="balance-summary__item">
          <span class="label">{{ translate('consumption') }}:</span>
          <span class="text-red-400">{{ formatCurrency(totalConsumptionValue) }}</span>
        </div>
      </div>

      <!-- Producing Materials -->
      <details v-if="materialsProducing.length > 0" class="materials-details" open>
        <summary class="materials-details__summary">
          <span class="text-emerald-400">▲ {{ translate('producing') }} ({{ materialsProducing.length }})</span>
        </summary>
        <div class="materials-list materials-list--compact">
          <div 
            v-for="material in materialsProducing" 
            :key="material.materialId"
            class="material-item material-item--compact"
          >
            <div class="material-item__info">
              <MaterialIcon :name="getMaterialName(material.materialId)" variant="sm" />
              <span class="material-item__name">{{ getMaterialName(material.materialId) }}</span>
            </div>
            <div class="material-item__details">
              <span class="text-emerald-400">+{{ formatNumber(material.balancePerDay * periodFactor) }}</span>
              <span class="text-slate-400">{{ formatCurrency(material.valuePerDay * periodFactor) }}</span>
            </div>
          </div>
        </div>
      </details>

      <!-- Consuming Materials -->
      <details v-if="materialsConsuming.length > 0" class="materials-details">
        <summary class="materials-details__summary">
          <span class="text-red-400">▼ {{ translate('consuming') }} ({{ materialsConsuming.length }})</span>
        </summary>
        <div class="materials-list materials-list--compact">
          <div 
            v-for="material in materialsConsuming" 
            :key="material.materialId"
            class="material-item material-item--compact"
          >
            <div class="material-item__info">
              <MaterialIcon :name="getMaterialName(material.materialId)" variant="sm" />
              <span class="material-item__name">{{ getMaterialName(material.materialId) }}</span>
            </div>
            <div class="material-item__details">
              <span class="text-red-400">{{ formatNumber(material.balancePerDay * periodFactor) }}</span>
              <span class="text-slate-400">{{ formatCurrency(material.valuePerDay * periodFactor) }}</span>
            </div>
          </div>
        </div>
      </details>
    </section>
  </div>
</template>

<style scoped>
.base-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-section {
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1rem;
}

.detail-section--warning {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.2);
}

.detail-section__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 0.75rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: var(--color-background);
  border-radius: 0.375rem;
  border: 1px solid var(--color-border);
}

.summary-item--highlight {
  border-color: rgb(139, 92, 246);
  background: rgba(139, 92, 246, 0.05);
}

.summary-item__label {
  font-size: 0.8125rem;
  color: var(--color-text-soft);
}

.summary-item__value {
  font-size: 1.125rem;
  font-weight: 600;
}

.workforce-overall {
  padding: 1rem;
  background: var(--color-background);
  border-radius: 0.375rem;
  border: 1px solid var(--color-border);
  margin-bottom: 1rem;
}

.workforce-overall__main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.workforce-overall__label {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-heading);
}

.workforce-overall__value {
  font-size: 1.5rem;
  font-weight: 700;
}

.workforce-overall__explanation {
  font-size: 0.875rem;
  color: var(--color-text-soft);
  margin-top: 0.5rem;
}

.workforce-overall__lost-profit {
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: rgba(251, 191, 36, 0.1);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--color-text);
}

.workforce-tiers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.75rem;
}

.workforce-tier {
  padding: 0.75rem;
  background: var(--color-background);
  border-radius: 0.375rem;
  border: 1px solid var(--color-border);
}

.workforce-tier__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.workforce-tier__name {
  font-weight: 600;
  color: var(--color-heading);
}

.workforce-tier__productivity {
  font-size: 1.125rem;
  font-weight: 700;
}

.workforce-tier__details {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.8125rem;
}

.workforce-tier__metric {
  display: flex;
  justify-content: space-between;
}

.workforce-tier__metric .label {
  color: var(--color-text-soft);
}

.workforce-tier__limiting {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.8125rem;
}

.materials-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.materials-list--compact {
  gap: 0.375rem;
}

.material-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--color-background);
  border-radius: 0.375rem;
  border: 1px solid var(--color-border);
}

.material-item--compact {
  padding: 0.5rem;
}

.material-item--warning {
  border-color: rgba(239, 68, 68, 0.3);
}

.material-item__info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.material-item__name {
  font-weight: 500;
  color: var(--color-heading);
  font-size: 0.875rem;
}

.material-item__details {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8125rem;
}

.balance-summary {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: var(--color-background);
  border-radius: 0.375rem;
}

.balance-summary__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.balance-summary__item .label {
  color: var(--color-text-soft);
  font-size: 0.875rem;
}

.materials-details {
  margin-top: 0.75rem;
}

.materials-details__summary {
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  padding: 0.5rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.materials-details__summary:hover {
  background: var(--color-background);
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

.font-semibold {
  font-weight: 600;
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .workforce-tiers {
    grid-template-columns: 1fr;
  }

  .balance-summary {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
