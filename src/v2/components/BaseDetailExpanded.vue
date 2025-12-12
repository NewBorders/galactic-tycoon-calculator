<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber, formatPrice } from '@/v2/utils/formatNumber'
import { translate, formatCurrency } from '@/v2/localisation'
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

const periodFactor = computed(() => props.timeframeHours / 24)

const getMaterialName = (materialId: number): string => {
  return props.index.materialById.get(materialId)?.name || `Material ${materialId}`
}

// Production: Materials with positive balance (exports)
const exportMaterials = computed(() =>
  props.report.materials
    .filter(m => m.balancePerDay > 0.01)
    .map(m => ({
      ...m,
      balancePerPeriod: m.balancePerDay * periodFactor.value,
      valuePerPeriod: m.valuePerDay * periodFactor.value,
    }))
    .sort((a, b) => b.valuePerPeriod - a.valuePerPeriod)
)

// Consumption: Materials with negative balance (purchases)
const purchaseMaterials = computed(() =>
  props.report.materials
    .filter(m => m.balancePerDay < -0.01)
    .map(m => ({
      ...m,
      balancePerPeriod: m.balancePerDay * periodFactor.value,
      valuePerPeriod: m.valuePerDay * periodFactor.value,
    }))
    .sort((a, b) => a.valuePerPeriod - b.valuePerPeriod)
)

// Worker consumption by tier
const workerConsumption = computed(() =>
  props.report.workers.map(w => ({
    ...w,
    consumptionPerPeriod: w.consumptionPerDay * periodFactor.value,
    costPerPeriod: w.costPerDay * periodFactor.value,
  }))
)

const totalWorkerCost = computed(() =>
  workerConsumption.value.reduce((sum, w) => sum + w.costPerPeriod, 0)
)

const getTierLabel = (tier: 1 | 2 | 3 | 4): string => {
  const labels = { 1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4' }
  return labels[tier] || `T${tier}`
}

const productivityColor = (productivity: number) => {
  if (productivity >= 95) return 'text-emerald-400'
  if (productivity >= 75) return 'text-amber-400'
  return 'text-red-400'
}

// Calculate lost profit from non-100% productivity
const lostProfitData = computed(() => {
  const productivity = props.summary.workforceProductivity
  if (productivity.overallProductivityPercent >= 100) {
    return null // No lost profit at full productivity
  }

  // Lost profit calculation (already in service but we recalculate for display)
  const potentialLostProfitPerDay = productivity.potentialLostProfitPerDay
  const potentialLostProfitPerPeriod = potentialLostProfitPerDay * periodFactor.value

  return {
    lostProfitPerPeriod: potentialLostProfitPerPeriod,
    currentProductivity: productivity.overallProductivityPercent,
  }
})

</script>

<template>
  <div class="base-details">
    <div class="accordion">
      <!-- Net Result Accordion -->
      <details class="accordion-item" open>
        <summary class="accordion-summary">
          <span class="accordion-title">💰 {{ translate('netProfit') }}</span>
          <span
            class="accordion-value"
            :class="report.summary.net > 0 ? 'text-emerald-400' : 'text-red-400'"
          >
            {{ formatCurrency(report.summary.net * periodFactor) }}
          </span>
        </summary>
        <div class="accordion-content">
          <div class="net-breakdown">
            <div class="breakdown-row">
              <span class="breakdown-label">{{ translate('productionRevenue') }}</span>
              <span class="breakdown-value text-emerald-400">
                +{{ formatCurrency(report.summary.productionRevenue * periodFactor) }}
              </span>
            </div>
            <div class="breakdown-row">
              <span class="breakdown-label">{{ translate('materialPurchaseCosts') }}</span>
              <span class="breakdown-value text-red-400">
                {{ formatCurrency(report.summary.materialPurchaseCosts * periodFactor) }}
              </span>
            </div>
            <div class="breakdown-row">
              <span class="breakdown-label">{{ translate('workerPurchaseCosts') }}</span>
              <span class="breakdown-value text-red-400">
                {{ formatCurrency(report.summary.workerPurchaseCosts * periodFactor) }}
              </span>
            </div>
          </div>
        </div>
      </details>

      <!-- Worker Consumption Accordion -->
      <details class="accordion-item">
        <summary class="accordion-summary">
          <span class="accordion-title">👷 {{ translate('workerConsumption') }}</span>
          <span class="accordion-value text-amber-400">
            {{ formatCurrency(totalWorkerCost) }}
          </span>
        </summary>
        <div class="accordion-content">
          <div class="worker-grid">
            <div v-for="worker in workerConsumption" :key="worker.tier" class="worker-item">
              <span class="worker-tier">{{ getTierLabel(worker.tier) }}</span>
              <div class="worker-details">
                <MaterialIcon :name="getMaterialName(worker.materialId)" :size="16" />
                <span class="worker-amount">{{ formatNumber(worker.consumptionPerPeriod, 0) }}x</span>
              </div>
              <span class="worker-cost text-amber-400">{{ formatCurrency(worker.costPerPeriod) }}</span>
            </div>
          </div>
        </div>
      </details>

      <!-- Production Revenue Accordion -->
      <details class="accordion-item">
        <summary class="accordion-summary">
          <span class="accordion-title">📈 {{ translate('productionRevenue') }}</span>
          <span class="accordion-value text-emerald-400">
            +{{ formatCurrency(report.summary.productionRevenue * periodFactor) }}
          </span>
        </summary>
        <div class="accordion-content">
          <div class="material-list">
            <div v-for="mat in exportMaterials" :key="mat.materialId" class="material-item">
              <div class="material-info">
                <MaterialIcon :name="getMaterialName(mat.materialId)" :size="16" />
                <span class="material-name">{{ getMaterialName(mat.materialId) }}</span>
              </div>
              <div class="material-stats">
                <span class="text-emerald-400">+{{ formatNumber(mat.balancePerPeriod, 0) }}</span>
                <span class="text-slate-400 text-xs">@{{ formatPrice(mat.unitPrice, 2) }}</span>
                <span class="text-emerald-400 font-semibold">{{ formatCurrency(mat.valuePerPeriod) }}</span>
              </div>
            </div>
          </div>
        </div>
      </details>

      <!-- Material Purchases Accordion -->
      <details class="accordion-item">
        <summary class="accordion-summary">
          <span class="accordion-title">🛒 {{ translate('materialPurchases') }}</span>
          <span class="accordion-value text-red-400">
            {{ formatCurrency(report.summary.materialPurchaseCosts * periodFactor) }}
          </span>
        </summary>
        <div class="accordion-content">
          <div class="material-list">
            <div v-for="mat in purchaseMaterials" :key="mat.materialId" class="material-item">
              <div class="material-info">
                <MaterialIcon :name="getMaterialName(mat.materialId)" :size="16" />
                <span class="material-name">{{ getMaterialName(mat.materialId) }}</span>
              </div>
              <div class="material-stats">
                <span class="text-red-400">{{ formatNumber(mat.balancePerPeriod, 0) }}</span>
                <span class="text-slate-400 text-xs">@{{ formatPrice(mat.unitPrice, 2) }}</span>
                <span class="text-red-400 font-semibold">{{ formatCurrency(mat.valuePerPeriod) }}</span>
              </div>
            </div>
          </div>
        </div>
      </details>

      <!-- Workforce Productivity Accordion -->
      <details class="accordion-item">
        <summary class="accordion-summary">
          <span class="accordion-title">⚙️ {{ translate('workforceProductivity') }}</span>
          <span
            class="accordion-value"
            :class="productivityColor(summary.workforceProductivity.overallProductivityPercent)"
          >
            {{ formatNumber(summary.workforceProductivity.overallProductivityPercent, 0) }}%
          </span>
        </summary>
        <div class="accordion-content">
          <div class="workforce-grid">
            <div v-for="tier in summary.workforceProductivity.tiers" :key="tier.tier" class="workforce-item">
              <span class="workforce-tier">{{ getTierLabel(tier.tier) }}</span>
              <span
                class="workforce-percent"
                :class="productivityColor(tier.productivityPercent)"
              >
                {{ formatNumber(tier.productivityPercent, 0) }}%
              </span>
              <span v-if="tier.limitingFactor === 'housing'" class="workforce-limit text-slate-400">
                {{ translate('limitedByHousing') }}
              </span>
              <span v-else-if="tier.limitingFactor === 'consumption'" class="workforce-limit text-slate-400">
                {{ translate('limitedByConsumption') }}
              </span>
            </div>
          </div>
          
          <div v-if="lostProfitData" class="lost-profit-alert">
            <span class="alert-icon">⚠️</span>
            <div class="alert-content">
              <span class="alert-label">{{ translate('lostProfitWarning') }}:</span>
              <span class="alert-value text-amber-400">
                {{ formatCurrency(lostProfitData.lostProfitPerPeriod) }}
              </span>
            </div>
          </div>
        </div>
      </details>

      <!-- Material Balance Accordion -->
      <details class="accordion-item">
        <summary class="accordion-summary">
          <span class="accordion-title">📦 {{ translate('materialBalance') }}</span>
          <span class="accordion-value text-slate-400">
            <span class="text-emerald-400">+{{ exportMaterials.length }}</span>
            <span class="text-slate-500">/</span>
            <span class="text-red-400">−{{ purchaseMaterials.length }}</span>
          </span>
        </summary>
        <div class="accordion-content">
          <div class="balance-split">
            <div class="balance-column">
              <div class="balance-header text-emerald-400">
                ▲ {{ translate('producing') }} ({{ exportMaterials.length }})
              </div>
              <div class="balance-items">
                <div v-for="mat in exportMaterials" :key="mat.materialId" class="balance-item">
                  <MaterialIcon :name="getMaterialName(mat.materialId)" :size="14" />
                  <span class="balance-name">{{ getMaterialName(mat.materialId) }}</span>
                  <span class="balance-amount text-emerald-400">
                    +{{ formatNumber(mat.balancePerPeriod, 0) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="balance-column">
              <div class="balance-header text-red-400">
                ▼ {{ translate('consuming') }} ({{ purchaseMaterials.length }})
              </div>
              <div class="balance-items">
                <div v-for="mat in purchaseMaterials" :key="mat.materialId" class="balance-item">
                  <MaterialIcon :name="getMaterialName(mat.materialId)" :size="14" />
                  <span class="balance-name">{{ getMaterialName(mat.materialId) }}</span>
                  <span class="balance-amount text-red-400">
                    {{ formatNumber(mat.balancePerPeriod, 0) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
.base-details {
  padding: 0.5rem 0;
}

/* Accordion Container */
.accordion {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.accordion-item {
  background: rgb(15 23 42);
  border: 1px solid rgb(51 65 85);
  border-radius: 0.375rem;
  overflow: hidden;
  transition: all 0.2s ease;
}

.accordion-item:hover {
  border-color: rgb(71 85 105);
}

.accordion-item[open] {
  background: rgb(20 28 46);
}

/* Accordion Summary (Header Bar) */
.accordion-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  user-select: none;
  list-style: none;
  transition: background-color 0.2s;
  font-size: 0.9375rem;
}

.accordion-summary::-webkit-details-marker {
  display: none;
}

.accordion-summary:hover {
  background: rgb(30 41 59);
}

.accordion-title {
  font-weight: 600;
  color: var(--color-heading);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.accordion-value {
  font-weight: 700;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}

/* Accordion Content */
.accordion-content {
  padding: 0 1rem 1rem 1rem;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Net Breakdown */
.net-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgb(30 41 59);
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.breakdown-label {
  color: var(--color-text-soft);
}

.breakdown-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* Worker Grid */
.worker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
}

.worker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.75rem;
  background: rgb(30 41 59);
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.worker-tier {
  font-weight: 600;
  color: var(--color-heading);
  min-width: 2rem;
}

.worker-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  margin: 0 0.75rem;
}

.worker-amount {
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.worker-cost {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* Material List */
.material-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-height: 400px;
  overflow-y: auto;
}

.material-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.75rem;
  background: rgb(30 41 59);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  transition: background-color 0.15s;
}

.material-item:hover {
  background: rgb(51 65 85);
}

.material-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.material-name {
  font-weight: 500;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.material-stats {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-variant-numeric: tabular-nums;
}

/* Workforce Grid */
.workforce-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.workforce-item {
  display: grid;
  grid-template-columns: 3rem 4rem 1fr;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: rgb(30 41 59);
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.workforce-tier {
  font-weight: 600;
  color: var(--color-heading);
}

.workforce-percent {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.workforce-limit {
  font-size: 0.75rem;
  font-style: italic;
}

/* Lost Profit Alert */
.lost-profit-alert {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-top: 0.75rem;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 0.25rem;
}

.alert-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.875rem;
}

.alert-label {
  color: #fbbf24;
  font-weight: 600;
}

.alert-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Balance Split View */
.balance-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.balance-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.balance-header {
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  background: rgb(30 41 59);
  border-radius: 0.25rem;
}

.balance-items {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 300px;
  overflow-y: auto;
}

.balance-item {
  display: grid;
  grid-template-columns: 1rem 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(30, 41, 59, 0.5);
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  transition: background-color 0.15s;
}

.balance-item:hover {
  background: rgb(30 41 59);
}

.balance-name {
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
}

.balance-amount {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
}

/* Utility Classes */
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

.text-slate-500 {
  color: rgb(100, 116, 139);
}

.text-xs {
  font-size: 0.75rem;
}

.font-semibold {
  font-weight: 600;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .accordion-summary {
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
  }

  .accordion-value {
    font-size: 0.875rem;
  }

  .accordion-content {
    padding: 0 0.875rem 0.875rem 0.875rem;
  }

  .worker-grid {
    grid-template-columns: 1fr;
  }

  .balance-split {
    grid-template-columns: 1fr;
  }

  .material-stats {
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .workforce-item {
    grid-template-columns: 2.5rem 3.5rem 1fr;
    gap: 0.5rem;
    font-size: 0.8125rem;
  }
}
</style>
