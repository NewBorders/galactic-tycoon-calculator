<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerBases } from '@/v2/services/playerBases'
import { useGlobalSummary } from '@/v2/composables/useGlobalSummary'
import { useMaterialPricing } from '@/v2/services/gamedata/prices'
import type { GameData, GdIndex } from '@/v2/services/gamedata/types'

const props = defineProps<{
  gameData: GameData
  index: GdIndex
}>()

const { state } = usePlayerBases(props.gameData)
const bases = computed(() => state.value.bases)

const { priceResolver } = useMaterialPricing(props.gameData)

// Mock values for now - these should come from config/services
const technologyLevels = computed(() => ({}))
const startingBonus = computed(() => 0)
const planDays = computed(() => 7)
const globalWorkforceBurden = computed(() => 2000)
const exportThreshold = computed(() => 50)

const summary = useGlobalSummary(
  bases,
  computed(() => props.gameData),
  computed(() => props.index),
  priceResolver,
  technologyLevels,
  startingBonus,
  computed(() => planDays.value * 24), // Convert days to hours
  globalWorkforceBurden,
  exportThreshold,
)

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
</script>

<template>
  <div class="global-summary">
    <!-- Overview Header -->
    <div class="global-summary__header">
      <h1 class="global-summary__title">🌌 Production Overview</h1>
      
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
      <h2 class="section-title">🏭 Your Bases ({{ bases.length }})</h2>
      <div class="bases-grid">
        <div 
          v-for="baseSummary in summary.baseSummaries.value" 
          :key="baseSummary.baseId"
          class="base-card"
        >
          <div class="base-card__header">
            <div class="base-card__name">{{ baseSummary.baseName }}</div>
            <div class="base-card__planet">Planet {{ baseSummary.planetId }}</div>
          </div>
          
          <div class="base-card__body">
            <div class="base-metric">
              <span class="base-metric__label">Workforce Coverage</span>
              <span 
                class="base-metric__value"
                :class="{
                  'base-metric__value--good': baseSummary.workforceCoverage >= 100,
                  'base-metric__value--warning': baseSummary.workforceCoverage < 100
                }"
              >
                {{ formatNumber(baseSummary.workforceCoverage) }}%
              </span>
            </div>
            
            <div class="base-metric" v-if="baseSummary.exportMaterials.length > 0">
              <span class="base-metric__label">Export Materials</span>
              <span class="base-metric__value">{{ baseSummary.exportMaterials.length }}</span>
            </div>
            
            <div class="base-metric" v-if="baseSummary.materialsRunningOut.length > 0">
              <span class="base-metric__label">⚠️ Running Out</span>
              <span class="base-metric__value base-metric__value--danger">
                {{ baseSummary.materialsRunningOut.length }}
              </span>
            </div>
          </div>
          
          <div class="base-card__footer">
            <button class="btn btn--sm">View Details →</button>
          </div>
        </div>
      </div>
      
      <div v-if="bases.length === 0" class="empty-state">
        <div class="empty-state__icon">🏭</div>
        <div class="empty-state__text">No bases configured yet</div>
        <button class="btn btn--primary">Add Your First Base</button>
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
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-card--primary {
  border-color: rgba(139, 92, 246, 0.3);
  background: rgba(139, 92, 246, 0.05);
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

.base-card__header {
  padding: 1.25rem;
  background: var(--color-background-mute);
  border-bottom: 1px solid var(--color-border);
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
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: var(--color-background-mute);
  border-color: var(--color-border-hover);
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
  background: var(--color-background-soft);
  border: 2px dashed var(--color-border);
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
  background: var(--color-background);
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
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
}

.materials-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.materials-table thead {
  background: var(--color-background-mute);
  border-bottom: 2px solid var(--color-border);
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
  border-top: 1px solid var(--color-border);
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
}
</style>
