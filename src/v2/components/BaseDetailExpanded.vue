<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber, formatPrice } from '@/v2/utils/formatNumber'
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

const coverageColor = (coverage: number) => {
  if (coverage >= 0.99) return 'text-emerald-400'
  if (coverage >= 0.75) return 'text-amber-400'
  return 'text-red-400'
}
</script>

<template>
  <div class="base-details">
    <div class="details-grid">
      <!-- Net Result Section -->
      <section class="detail-card">
        <h3 class="detail-card__title">💰 {{ translate('netResult') }}</h3>
        <div class="net-summary">
          <div class="net-row">
            <span class="net-row__label">{{ translate('productionRevenue') }}</span>
            <span class="net-row__value text-emerald-400">
              +{{ formatCurrency(report.summary.productionRevenue * periodFactor) }}
            </span>
          </div>
          <div class="net-row">
            <span class="net-row__label">{{ translate('materialPurchaseCosts') }}</span>
            <span class="net-row__value text-red-400">
              {{ formatCurrency(report.summary.materialPurchaseCosts * periodFactor) }}
            </span>
          </div>
          <div class="net-row">
            <span class="net-row__label">{{ translate('workerPurchaseCosts') }}</span>
            <span class="net-row__value text-red-400">
              {{ formatCurrency(report.summary.workerPurchaseCosts * periodFactor) }}
            </span>
          </div>
          <div class="net-row net-row--total">
            <span class="net-row__label">{{ translate('total') }}</span>
            <span 
              class="net-row__value"
              :class="report.summary.net > 0 ? 'text-emerald-400' : 'text-red-400'"
            >
              {{ formatCurrency(report.summary.net * periodFactor) }}
            </span>
          </div>
        </div>
      </section>

      <!-- Worker Consumables -->
      <section class="detail-card">
        <h3 class="detail-card__title">👷 {{ translate('workerConsumption') }}</h3>
        <div class="worker-list">
          <div v-for="worker in workerConsumption" :key="worker.tier" class="worker-row">
            <span class="worker-row__tier">{{ getTierLabel(worker.tier) }}</span>
            <div class="worker-row__details">
              <MaterialIcon :name="getMaterialName(worker.materialId)" :size="16" />
              <span class="worker-row__amount">
                {{ formatNumber(worker.consumptionPerPeriod, 0) }}x
              </span>
              <span class="worker-row__cost text-amber-400">
                {{ formatCurrency(worker.costPerPeriod) }}
              </span>
            </div>
          </div>
          <div class="worker-row worker-row--total">
            <span class="worker-row__tier">{{ translate('total') }}</span>
            <span class="worker-row__cost text-amber-400">
              {{ formatCurrency(totalWorkerCost) }}
            </span>
          </div>
        </div>
      </section>

      <!-- Production Revenue (Export Materials) -->
      <section class="detail-card">
        <h3 class="detail-card__title">📈 {{ translate('productionRevenue') }}</h3>
        <div class="material-table">
          <div v-for="mat in exportMaterials.slice(0, 8)" :key="mat.materialId" class="material-row">
            <div class="material-row__info">
              <MaterialIcon :name="getMaterialName(mat.materialId)" :size="16" />
              <span class="material-row__name">{{ getMaterialName(mat.materialId) }}</span>
            </div>
            <div class="material-row__stats">
              <span class="text-emerald-400">+{{ formatNumber(mat.balancePerPeriod, 0) }}</span>
              <span class="text-slate-400">@{{ formatPrice(mat.unitPrice, 2) }}</span>
              <span class="text-emerald-400 font-semibold">
                {{ formatCurrency(mat.valuePerPeriod) }}
              </span>
            </div>
          </div>
          <div v-if="exportMaterials.length > 8" class="material-row material-row--more">
            +{{ exportMaterials.length - 8 }} more materials
          </div>
        </div>
      </section>

      <!-- Material Purchases (Consuming) -->
      <section class="detail-card">
        <h3 class="detail-card__title">🛒 {{ translate('materialPurchases') }}</h3>
        <div class="material-table">
          <div v-for="mat in purchaseMaterials.slice(0, 8)" :key="mat.materialId" class="material-row">
            <div class="material-row__info">
              <MaterialIcon :name="getMaterialName(mat.materialId)" :size="16" />
              <span class="material-row__name">{{ getMaterialName(mat.materialId) }}</span>
            </div>
            <div class="material-row__stats">
              <span class="text-red-400">{{ formatNumber(mat.balancePerPeriod, 0) }}</span>
              <span class="text-slate-400">@{{ formatPrice(mat.unitPrice, 2) }}</span>
              <span class="text-red-400 font-semibold">
                {{ formatCurrency(mat.valuePerPeriod) }}
              </span>
            </div>
          </div>
          <div v-if="purchaseMaterials.length > 8" class="material-row material-row--more">
            +{{ purchaseMaterials.length - 8 }} more materials
          </div>
        </div>
      </section>

      <!-- Workforce Coverage -->
      <section class="detail-card">
        <h3 class="detail-card__title">🏠 {{ translate('workforceOverview') }}</h3>
        <div class="workforce-table">
          <div v-for="wf in report.workforceSummary" :key="wf.tier" class="workforce-row">
            <span class="workforce-row__tier">{{ getTierLabel(wf.tier) }}</span>
            <div class="workforce-row__stats">
              <span class="text-slate-400">
                {{ formatNumber(wf.housing, 0) }} / {{ formatNumber(wf.required, 0) }}
              </span>
              <span 
                class="workforce-row__coverage"
                :class="coverageColor(wf.coverage)"
              >
                {{ formatNumber(wf.coverage * 100, 0) }}%
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Materials Balance (Full List) -->
      <section class="detail-card detail-card--full">
        <h3 class="detail-card__title">📦 {{ translate('materialBalance') }}</h3>
        <div class="balance-tabs">
          <details class="balance-details" open>
            <summary class="balance-summary">
              <span class="text-emerald-400">
                ▲ {{ translate('producing') }} ({{ exportMaterials.length }})
              </span>
            </summary>
            <div class="balance-list">
              <div v-for="mat in exportMaterials" :key="mat.materialId" class="balance-row">
                <div class="balance-row__info">
                  <MaterialIcon :name="getMaterialName(mat.materialId)" :size="14" />
                  <span class="balance-row__name">{{ getMaterialName(mat.materialId) }}</span>
                </div>
                <div class="balance-row__stats">
                  <span class="text-emerald-400">+{{ formatNumber(mat.balancePerPeriod, 0) }}</span>
                  <span class="text-slate-400 text-xs">{{ formatCurrency(mat.valuePerPeriod) }}</span>
                </div>
              </div>
            </div>
          </details>

          <details class="balance-details">
            <summary class="balance-summary">
              <span class="text-red-400">
                ▼ {{ translate('consuming') }} ({{ purchaseMaterials.length }})
              </span>
            </summary>
            <div class="balance-list">
              <div v-for="mat in purchaseMaterials" :key="mat.materialId" class="balance-row">
                <div class="balance-row__info">
                  <MaterialIcon :name="getMaterialName(mat.materialId)" :size="14" />
                  <span class="balance-row__name">{{ getMaterialName(mat.materialId) }}</span>
                </div>
                <div class="balance-row__stats">
                  <span class="text-red-400">{{ formatNumber(mat.balancePerPeriod, 0) }}</span>
                  <span class="text-slate-400 text-xs">{{ formatCurrency(mat.valuePerPeriod) }}</span>
                </div>
              </div>
            </div>
          </details>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.base-details {
  padding: 0.5rem 0;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.detail-card {
  background: rgb(15 23 42);
  border: 1px solid rgb(51 65 85);
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-card--full {
  grid-column: 1 / -1;
}

.detail-card__title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgb(51 65 85);
}

/* Net Result */
.net-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.net-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.net-row--total {
  padding-top: 0.5rem;
  margin-top: 0.25rem;
  border-top: 1px solid rgb(51 65 85);
  font-weight: 600;
}

.net-row__label {
  color: var(--color-text-soft);
}

.net-row__value {
  font-weight: 600;
}

/* Worker Consumption */
.worker-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.worker-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.worker-row--total {
  padding-top: 0.5rem;
  margin-top: 0.25rem;
  border-top: 1px solid rgb(51 65 85);
  font-weight: 600;
}

.worker-row__tier {
  color: var(--color-text-soft);
  font-weight: 500;
  min-width: 2rem;
}

.worker-row__details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.worker-row__amount {
  color: var(--color-text);
  min-width: 3rem;
  text-align: right;
}

.worker-row__cost {
  min-width: 5rem;
  text-align: right;
  font-weight: 600;
}

/* Material Tables */
.material-table {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-height: 300px;
  overflow-y: auto;
}

.material-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: rgb(30 41 59);
  border-radius: 0.25rem;
  font-size: 0.8125rem;
}

.material-row--more {
  color: var(--color-text-soft);
  font-style: italic;
  justify-content: center;
}

.material-row__info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.material-row__name {
  font-weight: 500;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.material-row__stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

/* Workforce Table */
.workforce-table {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.workforce-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: rgb(30 41 59);
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.workforce-row__tier {
  font-weight: 600;
  color: var(--color-heading);
  min-width: 2rem;
}

.workforce-row__stats {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.workforce-row__coverage {
  font-weight: 600;
  min-width: 3rem;
  text-align: right;
}

/* Balance Tabs */
.balance-tabs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.balance-details {
  border: 1px solid rgb(51 65 85);
  border-radius: 0.375rem;
  overflow: hidden;
}

.balance-summary {
  padding: 0.75rem;
  background: rgb(30 41 59);
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.balance-summary:hover {
  background: rgb(51 65 85);
}

.balance-list {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 250px;
  overflow-y: auto;
}

.balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  transition: background-color 0.2s;
}

.balance-row:hover {
  background: rgb(30 41 59);
}

.balance-row__info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.balance-row__name {
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
}

.balance-row__stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

.text-xs {
  font-size: 0.75rem;
}

.font-semibold {
  font-weight: 600;
}

@media (max-width: 768px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
  
  .material-row__stats {
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }
}
</style>
