<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StockAnalysisResult } from '@/v2/services/stockAnalysis'
import type { GdIndex } from '@/v2/services/gamedata/types'
import { translate, formatNumber, formatCurrency, formatDays } from '@/v2/localisation'
import { getMaterialExchangeLink } from '@/v2/services/gamedata/gameDataRepository'
import { usePriceAlerts } from '@/v2/services/priceAlerts/alertManager'
import AlertOverlay from '@/v2/components/AlertOverlay.vue'

const props = defineProps<{
  analysis: StockAnalysisResult
  index: GdIndex
  timeframeHours: number
  priceResolver: (materialId: number) => number
}>()

type ViewMode = 'combined' | 'by-material' | 'by-base'
const viewMode = ref<ViewMode>('combined')

// Price alert functionality
const { getAlert } = usePriceAlerts()
const alertOverlayOpen = ref(false)
const alertMaterialId = ref<number | null>(null)
const alertMaterialName = ref<string>('')

function hasAlert(materialId: number, type: 'buy' | 'sell'): boolean {
  return getAlert(materialId, type) !== undefined
}

function openAlertOverlay(materialId: number, materialName: string) {
  alertMaterialId.value = materialId
  alertMaterialName.value = materialName
  alertOverlayOpen.value = true
}

function closeAlertOverlay() {
  alertOverlayOpen.value = false
  alertMaterialId.value = null
  alertMaterialName.value = ''
}

const alertCurrentPrice = computed(() => {
  if (alertMaterialId.value === null) return 0
  return props.priceResolver(alertMaterialId.value)
})

// For average price, we'll use current price as fallback
// In a real scenario, you might want to compute historical average
const alertAveragePrice = computed(() => alertCurrentPrice.value)

// Sort combined warnings by urgency (time left)
const sortedCombinedWarnings = computed(() => {
  return [...props.analysis.combinedWarnings].sort((a, b) => a.urgency - b.urgency)
})

// Group warnings by base for "by-base" view
const warningsByBase = computed(() => {
  const grouped = new Map<string, typeof props.analysis.allWarnings>()

  props.analysis.allWarnings.forEach((warning) => {
    if (!grouped.has(warning.baseId)) {
      grouped.set(warning.baseId, [])
    }
    grouped.get(warning.baseId)!.push(warning)
  })

  return Array.from(grouped.entries()).map(([baseId, warnings]) => {
    if (warnings.length === 0) return null

    const totalWeight = warnings.reduce((sum, w) => sum + w.weight, 0)
    const totalValue = warnings.reduce((sum, w) => sum + w.value, 0)
    const urgency = Math.min(...warnings.map((w) => w.daysUntilEmpty))

    return {
      baseId,
      baseName: warnings[0]!.baseName,
      warnings,
      totalWeight,
      totalValue,
      urgency,
    }
  }).filter((x): x is NonNullable<typeof x> => x !== null)
   .sort((a, b) => a.urgency - b.urgency)
})

const formatWeight = (kg: number): string => {
  // Always show in tons
  return `${formatNumber(kg / 1000)}t`
}

const getUrgencyClass = (days: number): string => {
  if (days <= 1) return 'urgency-critical'
  if (days <= 3) return 'urgency-high'
  if (days <= 7) return 'urgency-medium'
  return 'urgency-low'
}
</script>

<template>
  <div class="stock-warnings">
    <!-- Header with Collapse Toggle -->
    <div class="stock-warnings__header">
      <h2 class="section-title">
        ⚠️ {{ translate('materialsRunningOut') }}
      </h2>
      <div class="view-toggle">
        <button
          class="view-toggle__btn"
          :class="{ 'view-toggle__btn--active': viewMode === 'combined' }"
          @click="viewMode = 'combined'"
        >
          {{ translate('groupByMaterial') }}
        </button>
        <button
          class="view-toggle__btn"
          :class="{ 'view-toggle__btn--active': viewMode === 'by-base' }"
          @click="viewMode = 'by-base'"
        >
          {{ translate('groupByBase') }}</button>
      </div>
    </div>

    <div>
      <div v-if="analysis.allWarnings.length === 0" class="empty-state">
        <div class="empty-state__icon">✅</div>
        <div class="empty-state__text">{{ translate('noMaterialsRunningOut') }}</div>
      </div>

      <!-- Combined View (Default) -->
      <div v-else-if="viewMode === 'combined'" class="material-groups">
        <section class="material-group">
            <table class="material-table">
              <thead>
                <tr>
                  <th class="text-left">{{ translate('material') }}</th>
                  <th class="text-center">{{ translate('bases') }}</th>
                  <th class="text-center">{{ translate('actionRedistribute') }}</th>
                  <th class="text-right">{{ translate('timeLeft') }}</th>
                  <th class="text-right">{{ translate('currentStock') }}</th>
                  <th class="text-right">{{ translate('toBuy') }}</th>
                  <th class="text-right">{{ translate('weight') }}</th>
                  <th class="text-right">{{ translate('value') }}</th>
                  <th class="text-right">{{ translate('alert') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="group in sortedCombinedWarnings" :key="group.materialId">
                  <td class="material-cell">
                    <a :href="getMaterialExchangeLink(group.materialId)" target="_blank" class="material-link">
                      <span>{{ group.materialName }}</span>
                    </a>
                  </td>
                  <td class="text-center">
                    <div class="bases-list">
                      <span v-for="base in group.bases" :key="base.baseId" class="base-name">
                        {{ base.baseName }}
                      </span>
                    </div>
                  </td>
                  <td class="text-center">
                    <span
                      class="action-badge"
                      :class="group.actionType === 'redistribute' ? 'action-badge--redistribute' : 'action-badge--purchase'"
                    >
                      {{ group.actionType === 'redistribute' ? '🔄' : '🛒' }}
                      {{ group.actionType === 'redistribute' ? translate('actionRedistribute') : translate('actionPurchase') }}
                    </span>
                    <div v-if="group.actionType === 'redistribute' && group.sourceBases" class="source-bases">
                      <span class="source-label">{{ translate('sourceBase') }}:</span>
                      <span v-for="(source, idx) in group.sourceBases" :key="source.baseId" class="source-base">
                        {{ source.baseName }}{{ idx < group.sourceBases.length - 1 ? ', ' : '' }}
                      </span>
                    </div>
                  </td>
                  <td class="text-right">
                    <span :class="getUrgencyClass(group.urgency)">
                      {{ formatDays(group.urgency) }}
                    </span>
                  </td>
                  <td class="text-right">
                    <div class="stock-per-base">
                      <div v-for="base in group.bases" :key="base.baseId" class="stock-item">
                        <span class="base-label">{{ base.baseName }}:</span>
                        <span class="stock-value">{{ formatNumber(base.currentStock) }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="text-right">{{ formatNumber(group.totalToBuy) }}</td>
                  <td class="text-right">{{ formatWeight(group.totalWeight) }}</td>
                  <td class="text-right">{{ formatCurrency(group.totalValue) }}</td>
                  <td class="text-right">
                    <button
                      @click.stop="openAlertOverlay(group.materialId, group.materialName)"
                      :class="[
                        'alert-button',
                        hasAlert(group.materialId, 'buy') ? 'alert-button--buy' :
                        hasAlert(group.materialId, 'sell') ? 'alert-button--sell' :
                        'alert-button--none'
                      ]"
                      :title="hasAlert(group.materialId, 'buy') ? 'Buy alert set' : hasAlert(group.materialId, 'sell') ? 'Sell alert set' : 'Set price alert'"
                    >
                      {{ hasAlert(group.materialId, 'buy') ? '💰' : hasAlert(group.materialId, 'sell') ? '📈' : '🔔' }}
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="sortedCombinedWarnings.length > 0">
                <tr class="total-row">
                  <td colspan="7" class="text-right">{{ translate('total') }}</td>
                  <td class="text-right">
                    {{ formatWeight(sortedCombinedWarnings.reduce((s, g) => s + g.totalWeight, 0)) }}
                  </td>
                  <td class="text-right">
                    {{ formatCurrency(sortedCombinedWarnings.reduce((s, g) => s + g.totalValue, 0), 0) }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
        </section>
      </div>

      <!-- By Base View -->
      <div v-else class="base-groups">
        <section v-for="base in warningsByBase" :key="base.baseId" class="base-group">
          <div class="base-group__header">
            <h3 class="base-group__title">{{ base.baseName }}</h3>
            <div class="base-group__summary">
              <span class="base-summary-item">
                <span class="label">{{ translate('weight') }}:</span>
                <span class="value">{{ formatWeight(base.totalWeight) }}</span>
              </span>
              <span class="base-summary-item">
                <span class="label">{{ translate('value') }}:</span>
                <span class="value">{{ formatCurrency(base.totalValue, 0) }}</span>
              </span>
              <span class="base-summary-item">
                <span class="label">{{ translate('urgency') }}:</span>
                <span class="value" :class="getUrgencyClass(base.urgency)">
                  {{ formatDays(base.urgency) }}
                </span>
              </span>
            </div>
          </div>

          <div class="material-table-wrapper">
            <table class="material-table">
              <thead>
                <tr>
                  <th class="text-left">{{ translate('material') }}</th>
                  <th class="text-right">{{ translate('timeLeft') }}</th>
                  <th class="text-right">{{ translate('currentStock') }}</th>
                  <th class="text-right">{{ translate('toBuy') }}</th>
                  <th class="text-right">{{ translate('weight') }}</th>
                  <th class="text-right">{{ translate('value') }}</th>
                  <th class="text-right">{{ translate('alert') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="warning in base.warnings" :key="warning.materialId">
                  <td class="material-cell">
                    <a :href="getMaterialExchangeLink(warning.materialId)" target="_blank" class="material-link">

                      <span>{{ warning.materialName }}</span>
                    </a>
                  </td>
                  <td class="text-right">
                    <span :class="getUrgencyClass(warning.daysUntilEmpty)">
                      {{ formatDays(warning.daysUntilEmpty) }}
                    </span>
                  </td>
                  <td class="text-right">{{ formatNumber(warning.currentStock) }}</td>
                  <td class="text-right">{{ formatNumber(warning.toBuy) }}</td>
                  <td class="text-right">{{ formatWeight(warning.weight) }}</td>
                  <td class="text-right">{{ formatCurrency(warning.value, 0) }}</td>
                  <td class="text-right">
                    <button
                      @click.stop="openAlertOverlay(warning.materialId, warning.materialName)"
                      :class="[
                        'alert-button',
                        hasAlert(warning.materialId, 'buy') ? 'alert-button--buy' :
                        hasAlert(warning.materialId, 'sell') ? 'alert-button--sell' :
                        'alert-button--none'
                      ]"
                      :title="hasAlert(warning.materialId, 'buy') ? 'Buy alert set' : hasAlert(warning.materialId, 'sell') ? 'Sell alert set' : 'Set price alert'"
                    >
                      {{ hasAlert(warning.materialId, 'buy') ? '💰' : hasAlert(warning.materialId, 'sell') ? '📈' : '🔔' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </div>

  <!-- Alert Overlay -->
  <AlertOverlay
    v-if="alertOverlayOpen && alertMaterialId !== null"
    :materialId="alertMaterialId"
    :materialName="alertMaterialName"
    :currentPrice="alertCurrentPrice"
    :averagePrice="alertAveragePrice"
    :open="alertOverlayOpen"
    @close="closeAlertOverlay"
  />
</template>

<style scoped>
.stock-warnings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stock-warnings__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-heading);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  user-select: none;
}

.collapse-icon {
  display: inline-block;
  width: 1rem;
  text-align: center;
  transition: transform 0.2s ease;
}

.view-toggle {
  display: flex;
  gap: 0.5rem;
  background: rgb(15 23 42);
  padding: 0.25rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(51 65 85);
}

.view-toggle__btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  color: var(--color-text-soft);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.view-toggle__btn:hover {
  background: rgb(30 41 59);
  color: var(--color-text);
}

.view-toggle__btn--active {
  background: rgb(139, 92, 246);
  color: white;
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
}

.material-groups {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.material-group {
  background: rgb(30 41 59);
  border: 1px solid rgb(51 65 85);
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.material-group--redistribution {
  border-color: rgba(59, 130, 246, 0.4);
}

.material-group--purchase {
  border-color: rgba(251, 191, 36, 0.4);
}

.material-group__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: var(--color-heading);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.material-group__subtitle {
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--color-text-soft);
}

.material-table-wrapper {
  overflow-x: auto;
  margin-top: 1rem;
  border: 1px solid rgb(51 65 85);
  border-radius: 0.5rem;
}

.material-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.material-table thead {
  background: rgb(15 23 42);
  border-bottom: 2px solid rgb(51 65 85);
}

.material-table th {
  padding: 0.75rem 1rem;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
}

.material-table td {
  padding: 0.75rem 1rem;
  border-top: 1px solid rgb(51 65 85);
}

.material-table tfoot {
  background: rgb(15 23 42);
  border-top: 2px solid rgb(51 65 85);
  font-weight: 600;
}

.total-row td {
  border-top: none;
}

.material-cell {
  min-width: 200px;
}

.material-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-heading);
  text-decoration: none;
  transition: color 0.2s;
}

.material-link:hover {
  color: rgb(139, 92, 246);
}

.material-icon {
  flex-shrink: 0;
}

.text-left {
  text-align: left;
}

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: rgb(51 65 85);
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
}

.action-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.action-badge--redistribute {
  background: rgba(59, 130, 246, 0.2);
  color: rgb(96, 165, 250);
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.action-badge--purchase {
  background: rgba(251, 191, 36, 0.2);
  color: rgb(251, 191, 36);
  border: 1px solid rgba(251, 191, 36, 0.4);
}

.source-bases {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
  font-size: 0.6875rem;
}

.source-label {
  color: var(--color-text-soft);
  font-weight: 500;
}

.source-base {
  color: var(--color-text);
  background: rgb(51 65 85);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  display: inline-block;
}

.bases-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
}

.stock-per-base {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.stock-item {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  align-items: center;
}

.base-label {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

.stock-value {
  font-weight: 500;
  color: var(--color-text);
}

.base-name {
  color: var(--color-text);
  background: rgb(51 65 85);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  white-space: nowrap;
}

.urgency-critical {
  color: #ef4444;
  font-weight: 600;
}

.urgency-high {
  color: #f59e0b;
  font-weight: 600;
}

.urgency-medium {
  color: #eab308;
}

.urgency-low {
  color: var(--color-text-soft);
}

.base-groups {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.base-group {
  background: rgb(30 41 59);
  border: 1px solid rgb(51 65 85);
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.base-group__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.base-group__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-heading);
}

.base-group__summary {
  display: flex;
  gap: 1.5rem;
  font-size: 0.875rem;
}

.base-summary-item {
  display: flex;
  gap: 0.5rem;
}

.base-summary-item .label {
  color: var(--color-text-soft);
}

.base-summary-item .value {
  color: var(--color-heading);
  font-weight: 600;
}

.alert-button {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.125rem;
  padding: 0.25rem;
  transition: all 0.2s;
  line-height: 1;
}

.alert-button--none {
  color: rgb(100 116 139);
}

.alert-button--none:hover {
  color: rgb(250 204 21);
}

.alert-button--buy {
  color: rgb(59 130 246);
}

.alert-button--buy:hover {
  color: rgb(96 165 250);
}

.alert-button--sell {
  color: rgb(251 146 60);
}

.alert-button--sell:hover {
  color: rgb(253 186 116);
}

@media (max-width: 768px) {
  .stock-warnings__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-title {
    font-size: 1.25rem;
  }

  .view-toggle {
    width: 100%;
  }

  .view-toggle__btn {
    flex: 1;
  }

  .material-table {
    font-size: 0.8125rem;
  }

  .material-table th,
  .material-table td {
    padding: 0.5rem 0.75rem;
  }

  .base-group__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .base-group__summary {
    flex-direction: column;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .material-table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .material-table {
    min-width: 600px;
  }
}
</style>
