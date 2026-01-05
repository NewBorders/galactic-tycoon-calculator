<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, onMounted } from 'vue'
import { formatNumber, formatPrice } from '@/v2/utils/formatNumber'
import type { GameData, GdIndex, Worker } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import { computeBaseReport } from '@/v2/services/production/engine'
import { calculateWorkforceProductivity } from '@/v2/services/production/workforceProductivity'
import { translate } from '@/v2/localisation'
import MaterialIcon from '@/v2/components/MaterialIcon.vue'
import { formatWeight } from '@/v2/utils/materialHelpers'
import AlertOverlay from '@/v2/components/AlertOverlay.vue'
import { useMaterialPricing } from '@/v2/services/gamedata/prices'
import { usePriceAlerts } from '@/v2/services/priceAlerts/alertManager'
import { getExportThresholdRatio, getExportThresholdRef, setExportThreshold } from '@/v2/services/config/exportThreshold'
import { getApiKey, getWorld } from '@/v2/services/api/apiKeyManager'
import { fetchWarehouseStockForBase } from '@/v2/services/api/warehouseService'

const props = defineProps<{
  base: PlayerBase
  gameData: GameData
  index: GdIndex
  priceResolver: (materialId: number) => number
  technologyLevels: Partial<Record<number, number>>
  startingBonus: number
  timeframeHours: number
  globalWorkforceBurden: number
  warehouseStocks: Record<number, number>
}>()

const emit = defineEmits<{
  updateOptional: [number[]]
  updateStock: [Record<number, number>]
  updateMaterialSortOrder: [sortOrder: 'name' | 'recipe']
}>()

const optionalActive = ref<Set<number>>(new Set(props.base.optionalConsumables ?? []))

// Materials balance sort order: 'name' (default) or 'recipe'
type MaterialSortOrder = 'name' | 'recipe'
const materialSortOrder = ref<MaterialSortOrder>(props.base.materialSortOrder ?? 'name')

// Export threshold (reactive reference to global config)
const exportThreshold = getExportThresholdRef()

function handleExportThresholdChange() {
  setExportThreshold(exportThreshold.value)
}

// Alert overlay state
const alertOverlayOpen = ref(false)
const alertMaterialId = ref<number | null>(null)
const alertMaterialName = ref<string>('')

// Warehouse stock refresh state
const WAREHOUSE_STORAGE_KEY = 'warehouseLastRefresh'
const warehouseLoading = ref(false)
const warehouseError = ref<string | null>(null)
const warehouseLastRefresh = ref<number | null>(null)

// Load timestamp from localStorage on mount
onMounted(() => {
  try {
    const stored = localStorage.getItem(WAREHOUSE_STORAGE_KEY)
    if (stored) {
      warehouseLastRefresh.value = Number(stored)
    }
  } catch {
    // Silently fail on storage read
  }
})

// Save timestamp to localStorage when it changes
watch(warehouseLastRefresh, (newValue) => {
  if (newValue === null) return
  try {
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, String(newValue))
  } catch {
    // Silently fail on storage write
  }
})

const { getMarketEntry } = useMaterialPricing(props.gameData)
const { getAlert, toggleMute } = usePriceAlerts()

function hasAlert(materialId: number, type: 'buy' | 'sell'): boolean {
  return getAlert(materialId, type) !== undefined
}

const alertCurrentPrice = computed(() => {
  if (alertMaterialId.value === null) return 0
  return props.priceResolver(alertMaterialId.value)
})

const alertAveragePrice = computed(() => {
  if (alertMaterialId.value === null) return 0
  const entry = getMarketEntry.value(alertMaterialId.value)
  return entry?.averagePrice ?? alertCurrentPrice.value
})

function openAlertOverlay(materialId: number, materialNameStr: string) {
  alertMaterialId.value = materialId
  alertMaterialName.value = materialNameStr
  alertOverlayOpen.value = true
}

function closeAlertOverlay() {
  alertOverlayOpen.value = false
  alertMaterialId.value = null
  alertMaterialName.value = ''
}

async function handleRefreshWarehouseStock() {
  const key = getApiKey()
  if (!key) {
    warehouseError.value = translate('apiKeyNotConfigured')
    return
  }

  if (!props.base.gameWarehouseId || !props.base.gameBaseId) {
    warehouseError.value = 'Base not linked to game warehouse'
    return
  }

  warehouseLoading.value = true
  warehouseError.value = null

  try {
    const world = getWorld()
    const result = await fetchWarehouseStockForBase(key, props.base.gameWarehouseId, world, true)

    // Convert items array to stock record: materialId → quantity
    const stockRecord: Record<number, number> = {}
    if (result.data.items) {
      result.data.items.forEach((item) => {
        stockRecord[item.materialId] = item.quantity
      })
    }

    emit('updateStock', stockRecord)
    warehouseLastRefresh.value = Date.now()
  } catch (e) {
    warehouseError.value = `Warehouse load error: ${e instanceof Error ? e.message : String(e)}`
  } finally {
    warehouseLoading.value = false
  }
}

function formatTimestamp(value: number | null | undefined) {
  if (!value) return '—'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hours = `${date.getHours()}`.padStart(2, '0')
    const minutes = `${date.getMinutes()}`.padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch {
    return '—'
  }
}

const timeframeHours = computed(() => {
  const hours = Number(props.timeframeHours)
  if (!Number.isFinite(hours)) return 24
  return Math.min(336, Math.max(1, Math.round(hours)))
})

const periodFactor = computed(() => timeframeHours.value / 24)

const periodLabel = computed(() => translate('perHours', { hours: timeframeHours.value }))

const technologyLevelMap = computed(() => {
  const map = new Map<number, number>()
  Object.entries(props.technologyLevels ?? {}).forEach(([key, value]) => {
    const spec = Number(key)
    const level = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(spec) || Number.isNaN(level)) return
    map.set(spec, Math.max(0, Math.floor(level)))
  })
  return map
})

const technologyLevelsOption = computed(() => {
  const obj: Record<number, number> = {}
  technologyLevelMap.value.forEach((level, spec) => {
    obj[spec] = level
  })
  return obj
})

const stockByMaterialId = computed(() => {
  const map = new Map<number, number>()
  Object.entries(props.warehouseStocks ?? {}).forEach(([key, value]) => {
    const materialId = Number(key)
    const amount = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(materialId) || Number.isNaN(amount) || amount < 0) return
    map.set(materialId, amount)
  })
  return map
})

const assignment = computed(() => ({
  planetId: props.base.planetId,
  buildings: props.base.buildings.map((b) => ({
    buildingId: b.buildingId,
    level: b.level,
  })),
  recipes: props.base.recipes.map((r) => ({
    recipeId: r.recipeId,
    count: typeof r.count === 'number' && Number.isFinite(r.count) ? Math.max(0, Math.floor(r.count)) : 1,
  })),
}))

const report = computed(() =>
  computeBaseReport(props.gameData, {
    assignment: assignment.value,
    horizonDays: 1,
    options: {
      activeOptionalConsumables: optionalActive.value,
      priceResolver: props.priceResolver,
      technologyLevels: technologyLevelsOption.value,
      startingBonus: props.startingBonus,
      globalWorkforceBurden: props.globalWorkforceBurden,
    },
  }),
)

// Determine which materials are "export materials" based on export threshold
// (similar logic to useGlobalSummary)
const exportMaterialIds = computed(() => {
  const threshold = getExportThresholdRatio()
  const exportIds = new Set<number>()

  // Build production and consumption maps
  const productionMap = new Map<number, number>()
  const consumptionMap = new Map<number, number>()

  // Get production from recipe outputs
  report.value.recipes.forEach((recipe) => {
    const current = productionMap.get(recipe.outputMaterialId) || 0
    productionMap.set(recipe.outputMaterialId, current + recipe.outputPerDay)
  })

  // Get consumption from recipe inputs
  report.value.recipes.forEach((recipe) => {
    recipe.inputsPerDay.forEach((input) => {
      const current = consumptionMap.get(input.materialId) || 0
      consumptionMap.set(input.materialId, current + input.amount)
    })
  })

  // Add worker consumption
  report.value.workers.forEach((worker) => {
    const current = consumptionMap.get(worker.materialId) || 0
    consumptionMap.set(worker.materialId, current + worker.consumptionPerDay)
  })

  // Determine export materials
  productionMap.forEach((production, materialId) => {
    const consumption = consumptionMap.get(materialId) || 0
    if (production > 0) {
      const localConsumptionRatio = consumption / production
      // Material is exported if less than threshold is consumed locally
      if (localConsumptionRatio < (1 - threshold)) {
        exportIds.add(materialId)
      }
    }
  })

  return exportIds
})

const materialRows = computed(() => {
  const rows = report.value.materials.map((row) => {
    const stock = stockByMaterialId.value.get(row.materialId) ?? 0
    const daysCoverage = row.balancePerDay < 0 ? (stock > 0 ? stock / -row.balancePerDay : 0) : null
    const balancePerPeriod = row.balancePerDay * periodFactor.value
    const valuePerPeriod = row.valuePerDay * periodFactor.value
    const toBuy = row.balancePerDay < 0 ? Math.max(0, -balancePerPeriod - stock) : 0
    return { ...row, stock, daysCoverage, balancePerPeriod, valuePerPeriod, toBuy }
  })

  // Sort by name or keep recipe order
  if (materialSortOrder.value === 'name') {
    return rows.sort((a, b) => {
      const nameA = materialName(a.materialId).toLowerCase()
      const nameB = materialName(b.materialId).toLowerCase()
      return nameA.localeCompare(nameB)
    })
  }
  
  // 'recipe' order: keep as is (from production order)
  return rows
})

// Split materials into export and non-export
const exportMaterials = computed(() => {
  return materialRows.value.filter(row => exportMaterialIds.value.has(row.materialId))
})

const nonExportMaterials = computed(() => {
  return materialRows.value.filter(row => !exportMaterialIds.value.has(row.materialId))
})

function materialName(id: number) {
  return props.index.materialById.get(id)?.name ?? `#${id}`
}

// Auto-unmute buy alerts for low-stock materials (don't create new ones)
watch([materialRows, timeframeHours], () => {
  const thresholdHours = timeframeHours.value

  materialRows.value.forEach((row) => {
    // Only for materials with negative balance (consumption)
    if (row.balancePerDay >= 0) return

    const daysCoverage = row.daysCoverage ?? 0
    const hoursCoverage = daysCoverage * 24

    // If stock coverage is below threshold, unmute existing buy alert if muted
    if (hoursCoverage < thresholdHours) {
      const existingAlert = getAlert(row.materialId, 'buy')
      if (existingAlert && existingAlert.status === 'muted') {
        toggleMute(existingAlert.id)
      }
    }
  })
}, { deep: true })

const workerRows = computed(() => {
  const rows = report.value.workers.slice()
  rows.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    if (a.optional !== b.optional) return a.optional ? 1 : -1
    return a.materialId - b.materialId
  })
  return rows
})

const workerDisplayRows = computed(() =>
  workerRows.value.map((row) => ({
    ...row,
    consumptionPerPeriod: row.consumptionPerDay * periodFactor.value,
    costPerPeriod: row.costPerDay * periodFactor.value,
  })),
)

const totalWorkerCosts = computed(() =>
  workerDisplayRows.value.reduce((acc, row) => acc + row.costPerPeriod, 0),
)

// Calculate workforce productivity
const workforceProductivity = computed(() => {
  return calculateWorkforceProductivity(report.value, props.warehouseStocks)
})

const productivityColor = (productivity: number) => {
  if (productivity >= 95) return 'text-emerald-400'
  if (productivity >= 75) return 'text-amber-400'
  return 'text-red-400'
}

// Calculate EXACT lost profit by comparing current state with optimal state
const lostProfitData = computed(() => {
  const productivity = workforceProductivity.value
  if (productivity.overallProductivityPercent >= 100) {
    return null
  }

  // Check if productivity loss is due to housing shortage or consumable shortage
  const hasHousingShortage = productivity.tiers.some(t => t.housingCoverage < 100)
  const hasConsumableShortage = productivity.tiers.some(t => t.missingEssentials > 0 || t.missingOptionals > 0)

  let lostProfitPerDay = 0

  if (hasHousingShortage || hasConsumableShortage) {
    // Calculate optimal state: 100% housing AND all optionals active
    
    // Step 1: Get report with all optionals active (if consumable shortage exists)
    let optimalReport = report.value
    if (hasConsumableShortage) {
      const allOptionalIds = new Set<number>()
      ;[1, 2, 3, 4].forEach((tier) => {
        const worker = props.index.workerByType.get(tier as Worker['type'])
        if (!worker) return
        worker.consumables
          .filter((c) => !c.essential)
          .forEach((c) => allOptionalIds.add(c.matId))
      })

      optimalReport = computeBaseReport(props.gameData, {
        assignment: assignment.value,
        horizonDays: 1,
        options: {
          activeOptionalConsumables: allOptionalIds,
          priceResolver: props.priceResolver,
          technologyLevels: technologyLevelsOption.value,
          startingBonus: props.startingBonus,
          globalWorkforceBurden: props.globalWorkforceBurden,
        },
      })
    }

    // Step 2: Scale to 100% housing if needed
    let netAtOptimal = optimalReport.summary.net
    
    if (hasHousingShortage) {
      const minHousingCoverage = Math.min(...productivity.tiers.map(t => t.housingCoverage))
      const housingFactor = minHousingCoverage / 100

      if (housingFactor > 0) {
        // Scale revenue and costs of the optimal report to 100% housing
        const revenueOptimal = optimalReport.summary.productionRevenue / housingFactor
        const costsOptimal = (optimalReport.summary.workerPurchaseCosts + 
                             optimalReport.summary.materialPurchaseCosts) / housingFactor
        netAtOptimal = revenueOptimal - costsOptimal
      }
    }

    // Lost profit = optimal state - current state
    lostProfitPerDay = netAtOptimal - report.value.summary.net
  }

  return {
    lostProfitPerPeriod: lostProfitPerDay * periodFactor.value,
    currentProductivity: productivity.overallProductivityPercent,
  }
})

const optionalConsumables = computed(() => {
  const groups: Array<{ tier: 1 | 2 | 3 | 4; options: Array<{ materialId: number; amount: number }> }> = []
  ;[1, 2, 3, 4].forEach((tier) => {
    const worker = props.index.workerByType.get(tier as Worker['type'])
    if (!worker) return
    const options = worker.consumables
      .filter((c) => !c.essential)
      .map((c) => ({ materialId: c.matId, amount: c.amount }))
    if (options.length) {
      groups.push({ tier: tier as 1 | 2 | 3 | 4, options })
    }
  })
  return groups
})

function formatShare(value: number) {
  return `${formatNumber(value, 1)}%`
}

function formatCoverage(days: number | null) {
  if (days == null || !Number.isFinite(days)) return '—'
  if (days <= 0) return '0h'
  const totalHours = days * 24
  const dayPart = Math.floor(totalHours / 24)
  const hourPart = Math.floor(totalHours - dayPart * 24)
  const remainderMinutes = Math.round((totalHours - Math.floor(totalHours)) * 60)
  const parts: string[] = []
  if (dayPart > 0) parts.push(`${dayPart}d`)
  if (hourPart > 0) parts.push(`${hourPart}h`)
  if (!parts.length) {
    if (remainderMinutes > 0) {
      parts.push(translate('lessThanHour'))
    } else {
      parts.push('0h')
    }
  }
  return parts.join(' ')
}

function tierLabel(tier: number) {
  switch (tier) {
    case 1:
      return 'T1'
    case 2:
      return 'T2'
    case 3:
      return 'T3'
    case 4:
      return 'T4'
    default:
      return `T${tier}`
  }
}

function toggleOptional(materialId: number) {
  const next = new Set(optionalActive.value)
  if (next.has(materialId)) {
    next.delete(materialId)
  } else {
    next.add(materialId)
  }
  optionalActive.value = next
  emit('updateOptional', Array.from(next).sort((a, b) => a - b))
}

function isOptionalActive(materialId: number) {
  return optionalActive.value.has(materialId)
}

watch(
  () => props.base.optionalConsumables,
  (list) => {
    optionalActive.value = new Set((list ?? []).filter((id): id is number => typeof id === 'number'))
  },
  { immediate: true },
)

watch(
  () => props.base.id,
  () => {
    // Reset state on base change
  },
)

// Emit sort order changes to parent for persistence
watch(materialSortOrder, (newSortOrder) => {
  emit('updateMaterialSortOrder', newSortOrder)
})

onBeforeUnmount(() => {
  // Cleanup if needed
})
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-2">
    <!-- Materials Balance - Split into Export and Non-Export (left column, full height) -->
    <div class="rounded border border-slate-700 bg-slate-900 p-4 space-y-4 lg:row-span-2">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-2">
          <div class="font-semibold">{{ translate('materialBalance') }}</div>
          <button
            @click="handleRefreshWarehouseStock"
            :disabled="warehouseLoading || !base.gameWarehouseId"
            class="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            :title="base.gameWarehouseId ? 'Refresh warehouse stock from API' : 'Base not linked to warehouse'"
          >
            {{ warehouseLoading ? '⏳' : '🔄' }} {{ warehouseLoading ? translate('loading') : 'Refresh Stock' }}
          </button>
          <span v-if="warehouseLastRefresh" class="text-xs text-slate-500">
            {{ formatTimestamp(warehouseLastRefresh) }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <!-- Export Threshold Control -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-slate-400 whitespace-nowrap">{{ translate('exportThresholdLabel') }}:</label>
            <input
              v-model.number="exportThreshold"
              @change="handleExportThresholdChange"
              type="range"
              min="0"
              max="100"
              step="5"
              class="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              :title="translate('exportThresholdHint')"
            />
            <span class="text-xs font-semibold text-purple-400 w-8 text-right">{{ exportThreshold }}%</span>
          </div>
          <!-- Sort Toggle -->
          <button
            @click="materialSortOrder = materialSortOrder === 'name' ? 'recipe' : 'name'"
            class="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors whitespace-nowrap"
            :title="materialSortOrder === 'name' ? translate('sortByRecipeOrder') : translate('sortByName')"
          >
            {{ materialSortOrder === 'name' ? '📋' : '🔤' }} {{ materialSortOrder === 'name' ? translate('sortedByName') : translate('sortedByRecipe') }}
          </button>
        </div>
      </div>

      <!-- Warehouse Error Message -->
      <div v-if="warehouseError" class="px-3 py-2 bg-rose-900/30 border border-rose-700 rounded text-xs text-rose-300">
        {{ warehouseError }}
      </div>

      <!-- Non-Export Materials Table (with To Buy info) - NOW FIRST -->
      <div v-if="nonExportMaterials.length" class="space-y-2">
        <div class="text-sm font-semibold text-slate-300">{{ translate('otherMaterials') }}</div>
        <table class="w-full text-sm">
          <thead class="text-slate-400 text-xs uppercase">
            <tr>
              <th class="text-left pb-1">{{ translate('material') }}</th>
              <th class="text-right pb-1">{{ periodLabel }}</th>
              <th class="text-right pb-1">{{ translate('unitPrice') }}</th>
              <th class="text-right pb-1">{{ translate('toBuy') }}</th>
              <th class="text-right pb-1">{{ translate('stockCoverage') }}</th>
              <th class="text-right pb-1">{{ translate('netResult') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in nonExportMaterials" :key="row.materialId" class="border-t border-slate-800/60">
              <td class="py-1">
                <a :href="'https://g2.galactictycoons.com/exchange/'+ row.materialId" target="_blank" class="underline inline-flex items-center gap-1">
                  <MaterialIcon :name="materialName(row.materialId)" variant="sm" />
                  <span>{{ materialName(row.materialId) }}</span>
                </a>
              </td>
              <td
                class="py-1 text-right"
                :class="row.balancePerDay >= 0 ? 'text-emerald-300' : 'text-rose-300'"
              >
                {{ formatNumber(row.balancePerPeriod) }} / {{ formatWeight(gameData, row.balancePerPeriod, row.materialId) }}
              </td>
              <td class="py-1 text-right">
                <div class="flex items-center justify-end gap-1">
                  <span>{{ formatPrice(row.unitPrice,2) }}</span>
                  <button
                    @click.stop="openAlertOverlay(row.materialId, materialName(row.materialId))"
                    :class="[
                      'transition-colors',
                      hasAlert(row.materialId, 'buy') ? 'text-blue-400 hover:text-blue-300' :
                      hasAlert(row.materialId, 'sell') ? 'text-orange-400 hover:text-orange-300' :
                      'text-slate-500 hover:text-yellow-400'
                    ]"
                    :title="hasAlert(row.materialId, 'buy') ? 'Buy alert set' : hasAlert(row.materialId, 'sell') ? 'Sell alert set' : 'Set price alert'"
                  >
                    {{ hasAlert(row.materialId, 'buy') ? '💰' : hasAlert(row.materialId, 'sell') ? '📈' : '🔔' }}
                  </button>
                </div>
              </td>
              <td class="py-1 text-right">
                <span v-if="row.toBuy > 0">{{ formatNumber(row.toBuy,0,true) }} / {{ formatWeight(gameData, row.toBuy, row.materialId) }}</span>
                <span v-else>—</span>
              </td>
              <td
                class="py-1 text-right"
                :class="row.toBuy > 0 ? 'text-rose-300' : 'text-emerald-300'"
              >
                <template v-if="row.balancePerDay < 0">
                  {{ formatNumber(row.stock, 0) }} / {{ formatCoverage(row.daysCoverage ?? null) }}
                </template>
                <template v-else>—</template>
              </td>
              <td
                class="py-1 text-right"
                :class="row.valuePerPeriod >= 0 ? 'text-emerald-300' : 'text-rose-300'"
              >
                {{ formatPrice(row.valuePerPeriod,2) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Export Materials Table - NOW SECOND -->
      <div v-if="exportMaterials.length" class="space-y-2">
        <div class="text-sm font-semibold text-emerald-300">{{ translate('exportMaterials') }}</div>
        <table class="w-full text-sm">
          <thead class="text-slate-400 text-xs uppercase">
            <tr>
              <th class="text-left pb-1">{{ translate('material') }}</th>
              <th class="text-right pb-1">{{ periodLabel }}</th>
              <th class="text-right pb-1">{{ translate('unitPrice') }}</th>
              <th class="text-right pb-1">{{ translate('netResult') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in exportMaterials" :key="row.materialId" class="border-t border-slate-800/60">
              <td class="py-1">
                <a :href="'https://g2.galactictycoons.com/exchange/'+ row.materialId" target="_blank" class="underline inline-flex items-center gap-1">
                  <MaterialIcon :name="materialName(row.materialId)" variant="sm" />
                  <span>{{ materialName(row.materialId) }}</span>
                </a>
              </td>
              <td class="py-1 text-right text-emerald-300">
                {{ formatNumber(row.balancePerPeriod) }} / {{ formatWeight(gameData, row.balancePerPeriod, row.materialId) }}
              </td>
              <td class="py-1 text-right">
                <div class="flex items-center justify-end gap-1">
                  <span>{{ formatPrice(row.unitPrice,2) }}</span>
                  <button
                    @click.stop="openAlertOverlay(row.materialId, materialName(row.materialId))"
                    :class="[
                      'transition-colors',
                      hasAlert(row.materialId, 'buy') ? 'text-blue-400 hover:text-blue-300' :
                      hasAlert(row.materialId, 'sell') ? 'text-orange-400 hover:text-orange-300' :
                      'text-slate-500 hover:text-yellow-400'
                    ]"
                    :title="hasAlert(row.materialId, 'buy') ? 'Buy alert set' : hasAlert(row.materialId, 'sell') ? 'Sell alert set' : 'Set price alert'"
                  >
                    {{ hasAlert(row.materialId, 'buy') ? '💰' : hasAlert(row.materialId, 'sell') ? '📈' : '🔔' }}
                  </button>
                </div>
              </td>
              <td class="py-1 text-right text-emerald-300">
                {{ formatPrice(row.valuePerPeriod,2) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!materialRows.length" class="text-sm text-slate-400">—</div>
    </div>

    <!-- Worker Consumption (right column, top) -->
    <div class="rounded border border-slate-700 bg-slate-900 p-4 space-y-3">
      <div class="font-semibold">{{ translate('workerConsumption') }}</div>
      <div v-if="optionalConsumables.length" class="space-y-2 text-xs text-slate-400">
        <div>{{ translate('optionalHint') }}</div>
        <div class="space-y-1">
          <div
            v-for="group in optionalConsumables"
            :key="group.tier"
            class="flex flex-wrap items-center gap-2"
          >
            <span class="text-slate-500">{{ tierLabel(group.tier) }}</span>
            <label
              v-for="opt in group.options"
              :key="opt.materialId"
              class="inline-flex items-center gap-1"
            >
              <input
                type="checkbox"
                class="accent-emerald-500"
                :checked="isOptionalActive(opt.materialId)"
                @change="toggleOptional(opt.materialId)"
              />
              <span class="text-slate-300 inline-flex items-center gap-1">
                <MaterialIcon :name="materialName(opt.materialId)" variant="sm" />
                <span>{{ materialName(opt.materialId) }} ({{ formatNumber(opt.amount) }})</span>
              </span>
            </label>
          </div>
        </div>
      </div>
      
      <!-- Workforce Productivity Section -->
      <div v-if="workerDisplayRows.length" class="space-y-3 pb-3 border-b border-slate-700">
        <!-- No stock data warning -->
        <div v-if="!workforceProductivity.hasStockData" class="flex items-center gap-2 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-xs">
          <span class="text-blue-400">ℹ️</span>
          <span class="text-slate-300">{{ workforceProductivity.explanation }}</span>
        </div>
        
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold">⚙️ {{ translate('workforceProductivity') }}</span>
          <span
            class="text-sm font-semibold"
            :class="productivityColor(workforceProductivity.overallProductivityPercent)"
          >
            {{ formatNumber(workforceProductivity.overallProductivityPercent, 0) }}%
          </span>
        </div>

        <!-- Detailed productivity issues if < 100% -->
        <div v-if="workforceProductivity.overallProductivityPercent < 100 && workforceProductivity.hasStockData" class="space-y-2">
          <template v-for="tier in workforceProductivity.tiers" :key="tier.tier">
            <!-- Housing shortage -->
            <div v-if="tier.housingCoverage < 100" class="flex items-center gap-2 p-2 bg-orange-900/20 border border-orange-700/30 rounded text-xs">
              <span class="text-orange-400">🏠</span>
              <span class="text-slate-300">
                {{ tierLabel(tier.tier) }}: Housing shortage
                ({{ formatNumber(tier.housingCoverage, 1) }}% coverage)
              </span>
            </div>
            <!-- Missing essential materials -->
            <div v-if="tier.missingEssentials > 0" class="flex items-center gap-2 p-2 bg-red-900/20 border border-red-700/30 rounded text-xs">
              <span class="text-red-400">⚠️</span>
              <span class="text-slate-300">
                {{ tierLabel(tier.tier) }}: Missing {{ tier.missingEssentials }} essential material{{ tier.missingEssentials > 1 ? 's' : '' }}
                ({{ formatNumber(tier.satisfaction, 0) }}% satisfaction)
              </span>
            </div>
            <!-- Missing optional materials -->
            <div v-if="tier.missingOptionals > 0" class="flex items-center gap-2 p-2 bg-amber-900/20 border border-amber-700/30 rounded text-xs">
              <span class="text-amber-400">📦</span>
              <span class="text-slate-300">
                {{ tierLabel(tier.tier) }}: Missing {{ tier.missingOptionals }} optional material{{ tier.missingOptionals > 1 ? 's' : '' }}
                ({{ formatNumber(tier.satisfaction, 0) }}% satisfaction)
              </span>
            </div>
          </template>
        </div>

        <div v-if="lostProfitData" class="flex items-center gap-2 p-2 bg-amber-900/20 border border-amber-700/30 rounded text-xs">
          <span class="text-amber-400">⚠️</span>
          <span class="text-slate-300">{{ translate('lostProfitWarning') }}:</span>
          <span class="font-semibold text-amber-400">
            {{ formatPrice(lostProfitData.lostProfitPerPeriod, 2) }}
          </span>
        </div>
      </div>
      
      <template v-if="workerDisplayRows.length">
        <table class="w-full text-sm">
          <thead class="text-slate-400 text-xs uppercase">
            <tr>
              <th class="text-left pb-1">{{ translate('material') }}</th>
              <th class="text-right pb-1">{{ periodLabel }}</th>
              <th class="text-right pb-1">{{ translate('unitPrice') }}</th>
              <th class="text-right pb-1">{{ translate('totalCosts') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in workerDisplayRows"
              :key="row.tier + '-' + row.materialId"
              class="border-t border-slate-800/60"
              :class="{ 'opacity-60': row.optional && !row.active }"
            >
              <td class="py-1">
                <span class="inline-flex items-center gap-1">
                  <MaterialIcon :name="materialName(row.materialId)" variant="sm" />
                  <span>{{ materialName(row.materialId) }}</span>
                </span>
                <span
                  v-if="row.optional"
                  class="ml-2 text-[11px]"
                  :class="row.active ? 'text-emerald-300' : 'text-slate-500'"
                >
                  {{ row.active ? translate('optionalActive') : translate('optionalInactive') }}
                </span>
              </td>
              <td class="py-1 text-right">{{ formatNumber(row.consumptionPerPeriod) }}</td>
              <td class="py-1 text-right">{{ formatPrice(row.unitPrice) }}</td>
              <td class="py-1 text-right">{{ formatPrice(row.costPerPeriod, 2) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="text-right text-xs text-slate-400">
          {{ translate('totalWorkerCosts') }}:
          <span class="text-slate-200">{{ formatPrice(totalWorkerCosts, 2) }}</span>
        </div>
      </template>
      <div v-else class="text-sm text-slate-400">—</div>
    </div>
  </div>

  <!-- Alert Overlay -->
  <AlertOverlay
    v-if="alertMaterialId !== null"
    :open="alertOverlayOpen"
    :material-id="alertMaterialId"
    :material-name="alertMaterialName"
    :current-price="alertCurrentPrice"
    :average-price="alertAveragePrice"
    @close="closeAlertOverlay"
  />
</template>
