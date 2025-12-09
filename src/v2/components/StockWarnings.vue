<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StockAnalysisResult } from '@/v2/services/stockAnalysis'
import type { GdIndex } from '@/v2/services/gamedata/types'
import { translate, formatNumber, formatCurrency } from '@/v2/localisation'

const props = defineProps<{
  analysis: StockAnalysisResult
  index: GdIndex
  timeframeHours: number
}>()

type ViewMode = 'by-material' | 'by-base'
const viewMode = ref<ViewMode>('by-material')

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

const getMaterialLink = (materialId: number): string => {
  return `https://www.galactictycoons.com/market/${materialId}`
}

const formatWeight = (kg: number): string => {
  if (kg < 1000) {
    return `${formatNumber(kg)} kg`
  }
  return `${formatNumber(kg / 1000)} t`
}

const getUrgencyClass = (days: number): string => {
  if (days <= 1) return 'urgency-critical'
  if (days <= 3) return 'urgency-high'
  if (days <= 7) return 'urgency-medium'
  return 'urgency-low'
}

const hasRedistributionNeeded = computed(() => props.analysis.redistributionNeeded.length > 0)
const hasPurchaseNeeded = computed(() => props.analysis.purchaseNeeded.length > 0)
</script>

<template>
  <div class="stock-warnings">
    <!-- View Mode Toggle -->
    <div class="stock-warnings__header">
      <h2 class="section-title">⚠️ {{ translate('materialsRunningOut') }}</h2>
      <div class="view-toggle">
        <button
          class="view-toggle__btn"
          :class="{ 'view-toggle__btn--active': viewMode === 'by-material' }"
          @click="viewMode = 'by-material'"
        >
          {{ translate('groupByMaterial') }}
        </button>
        <button
          class="view-toggle__btn"
          :class="{ 'view-toggle__btn--active': viewMode === 'by-base' }"
          @click="viewMode = 'by-base'"
        >
          {{ translate('groupByBase') }}
        </button>
      </div>
    </div>

    <div v-if="analysis.allWarnings.length === 0" class="empty-state">
      <div class="empty-state__icon">✅</div>
      <div class="empty-state__text">{{ translate('noMaterialsRunningOut') }}</div>
    </div>

    <!-- By Material View -->
    <div v-else-if="viewMode === 'by-material'" class="material-groups">
      <!-- Redistribution Needed -->
      <section v-if="hasRedistributionNeeded" class="material-group material-group--redistribution">
        <h3 class="material-group__title">
          🔄 {{ translate('redistributionNeeded') }}
          <span class="material-group__subtitle">{{ translate('redistributionNeededHint') }}</span>
        </h3>
        
        <div class="material-table-wrapper">
          <table class="material-table">
            <thead>
              <tr>
                <th>{{ translate('material') }}</th>
                <th class="text-right">{{ translate('timeLeft') }}</th>
                <th class="text-right">{{ translate('toBuy') }}</th>
                <th class="text-right">{{ translate('weight') }}</th>
                <th class="text-right">{{ translate('value') }}</th>
                <th class="text-center">{{ translate('bases') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="group in analysis.redistributionNeeded" :key="group.materialId">
                <td class="material-cell">
                  <a :href="getMaterialLink(group.materialId)" target="_blank" class="material-link">
                    
                    <span>{{ group.materialName }}</span>
                  </a>
                </td>
                <td class="text-right">
                  <span :class="getUrgencyClass(group.urgency)">
                    {{ formatNumber(group.urgency) }}d
                  </span>
                </td>
                <td class="text-right">{{ formatNumber(group.totalToBuy) }}</td>
                <td class="text-right">{{ formatWeight(group.totalWeight) }}</td>
                <td class="text-right">{{ formatCurrency(group.totalValue) }}</td>
                <td class="text-center">
                  <span class="badge">{{ group.bases.length }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="analysis.redistributionNeeded.length > 0">
              <tr class="total-row">
                <td colspan="3" class="text-right">{{ translate('total') }}</td>
                <td class="text-right">
                  {{ formatWeight(analysis.redistributionNeeded.reduce((s, g) => s + g.totalWeight, 0)) }}
                </td>
                <td class="text-right">
                  {{ formatCurrency(analysis.redistributionNeeded.reduce((s, g) => s + g.totalValue, 0), 0) }}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <!-- Purchase Needed -->
      <section v-if="hasPurchaseNeeded" class="material-group material-group--purchase">
        <h3 class="material-group__title">
          🛒 {{ translate('purchaseNeeded') }}
          <span class="material-group__subtitle">{{ translate('purchaseNeededHint') }}</span>
        </h3>
        
        <div class="material-table-wrapper">
          <table class="material-table">
            <thead>
              <tr>
                <th>{{ translate('material') }}</th>
                <th class="text-right">{{ translate('timeLeft') }}</th>
                <th class="text-right">{{ translate('toBuy') }}</th>
                <th class="text-right">{{ translate('weight') }}</th>
                <th class="text-right">{{ translate('value') }}</th>
                <th class="text-center">{{ translate('bases') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="group in analysis.purchaseNeeded" :key="group.materialId">
                <td class="material-cell">
                  <a :href="getMaterialLink(group.materialId)" target="_blank" class="material-link">
                    
                    <span>{{ group.materialName }}</span>
                  </a>
                </td>
                <td class="text-right">
                  <span :class="getUrgencyClass(group.urgency)">
                    {{ formatNumber(group.urgency) }}d
                  </span>
                </td>
                <td class="text-right">{{ formatNumber(group.totalToBuy) }}</td>
                <td class="text-right">{{ formatWeight(group.totalWeight) }}</td>
                <td class="text-right">{{ formatCurrency(group.totalValue) }}</td>
                <td class="text-center">
                  <span class="badge">{{ group.bases.length }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="analysis.purchaseNeeded.length > 0">
              <tr class="total-row">
                <td colspan="3" class="text-right">{{ translate('total') }}</td>
                <td class="text-right">
                  {{ formatWeight(analysis.purchaseNeeded.reduce((s, g) => s + g.totalWeight, 0)) }}
                </td>
                <td class="text-right">
                  {{ formatCurrency(analysis.purchaseNeeded.reduce((s, g) => s + g.totalValue, 0), 0) }}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
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
                {{ formatNumber(base.urgency) }}d
              </span>
            </span>
          </div>
        </div>

        <div class="material-table-wrapper">
          <table class="material-table">
            <thead>
              <tr>
                <th>{{ translate('material') }}</th>
                <th class="text-right">{{ translate('timeLeft') }}</th>
                <th class="text-right">{{ translate('currentStock') }}</th>
                <th class="text-right">{{ translate('toBuy') }}</th>
                <th class="text-right">{{ translate('weight') }}</th>
                <th class="text-right">{{ translate('value') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="warning in base.warnings" :key="warning.materialId">
                <td class="material-cell">
                  <a :href="getMaterialLink(warning.materialId)" target="_blank" class="material-link">
                    
                    <span>{{ warning.materialName }}</span>
                  </a>
                </td>
                <td class="text-right">
                  <span :class="getUrgencyClass(warning.daysUntilEmpty)">
                    {{ formatNumber(warning.daysUntilEmpty) }}d
                  </span>
                </td>
                <td class="text-right">{{ formatNumber(warning.currentStock) }}</td>
                <td class="text-right">{{ formatNumber(warning.toBuy) }}</td>
                <td class="text-right">{{ formatWeight(warning.weight) }}</td>
                <td class="text-right">{{ formatCurrency(warning.value, 0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
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
  text-align: left;
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
