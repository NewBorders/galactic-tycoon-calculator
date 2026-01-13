<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, onMounted } from 'vue'
import { formatNumber, formatPrice } from '@/v2/utils/formatNumber'
import type { GameData, GdIndex, Worker } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import { computeBaseReport } from '@/v2/services/production/engine'
import { calculateWorkforceProductivity } from '@/v2/services/production/workforceProductivity'
import { calculateLostProfit } from '@/v2/services/production/lostProfit'
import { translate } from '@/v2/localisation'
import MaterialIcon from '@/v2/components/MaterialIcon.vue'
import AlertOverlay from '@/v2/components/AlertOverlay.vue'
import { useMaterialPricing } from '@/v2/services/gamedata/prices'
import { usePriceAlerts } from '@/v2/services/priceAlerts/alertManager'
import { getExportThresholdRatio, getExportThresholdRef, setExportThreshold } from '@/v2/services/config/exportThreshold'
import { getApiKey } from '@/v2/services/api/apiKeyManager'
import { refreshEntry } from '@/v2/services/syncService'
import { formatWeight } from '@/v2/utils/materialHelpers'

const props = defineProps<{
  base: PlayerBase
  gameData: GameData
  index: GdIndex
  priceResolver: (materialId: number) => number
  technologyLevels: Partial<Record<number, number>>
  startingBonus: number
  currentTechnologyLevels: Partial<Record<number, number>>
  currentStartingBonus: number
  timeframeHours: number
  globalWorkforceBurden: number
  warehouseStocks: Record<number, number>
}>()

const emit = defineEmits<{
  updateOptional: [number[]]
  updateStock: [Record<number, number>]
  updateMaterialSortOrder: [sortOrder: 'name' | 'recipe']
}>()

// Get all optional consumables from game data
function getAllOptionalConsumables(): Set<number> {
  const optionals = new Set<number>()
  ;[1, 2, 3, 4].forEach((tier) => {
    const worker = props.index.workerByType.get(tier as Worker['type'])
    if (!worker) return
    worker.consumables
      .filter((c) => !c.essential)
      .forEach((c) => optionals.add(c.matId))
  })
  return optionals
}

// Initialize with ALL optional consumables active by default
const optionalActive = ref<Set<number>>(getAllOptionalConsumables())

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

  // Ensure optionalConsumables are saved if not already set
  if (!props.base.optionalConsumables || props.base.optionalConsumables.length === 0) {
    emit('updateOptional', Array.from(optionalActive.value).sort((a, b) => a - b))
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

  if (!props.base.gameWarehouseId) {
    warehouseError.value = 'Base not linked to game warehouse'
    return
  }

  warehouseLoading.value = true
  warehouseError.value = null

  try {
    // Use syncService as single source of truth
    await refreshEntry(`warehouse-${props.base.gameWarehouseId}`)

    // Update timestamp (syncService already updated it, but we update local state too)
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

// Current technology levels (from API)
const currentTechnologyLevelMap = computed(() => {
  const map = new Map<number, number>()
  Object.entries(props.currentTechnologyLevels ?? {}).forEach(([key, value]) => {
    const spec = Number(key)
    const level = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(spec) || Number.isNaN(level)) return
    map.set(spec, Math.max(0, Math.floor(level)))
  })
  return map
})

const currentTechnologyLevelsOption = computed(() => {
  const obj: Record<number, number> = {}
  currentTechnologyLevelMap.value.forEach((level, spec) => {
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

// Current assignment (uses currentBuildings from API and currentCount for recipes)
// For new bases without API import, current values are empty (not falling back to planned)
const currentAssignment = computed(() => ({
  planetId: props.base.planetId,
  buildings: (props.base.currentBuildings ?? []).map((b) => ({
    buildingId: b.buildingId,
    level: b.level,
  })),
  recipes: props.base.recipes
    .filter((r) => r.currentCount !== undefined)
    .map((r) => ({
      recipeId: r.recipeId,
      count: typeof r.currentCount === 'number' && Number.isFinite(r.currentCount) ? Math.max(0, Math.floor(r.currentCount)) : 0,
    })),
}))

// Planned assignment (uses user-editable buildings)
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

// Planned production report (uses planned technology levels and buildings)
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

// Current production report (uses current technology levels and buildings from API)
const reportCurrent = computed(() =>
  computeBaseReport(props.gameData, {
    assignment: currentAssignment.value,
    horizonDays: 1,
    options: {
      activeOptionalConsumables: optionalActive.value,
      priceResolver: props.priceResolver,
      technologyLevels: currentTechnologyLevelsOption.value,
      startingBonus: props.currentStartingBonus,
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

// Combined material rows with both current and planned data
const materialRows = computed(() => {
  // Build a map of material ID to combined row data
  const combinedMap = new Map<number, {
    materialId: number
    current: {
      balancePerDay: number
      balancePerPeriod: number
      valuePerDay: number
      valuePerPeriod: number
      unitPrice: number
      stock: number
      daysCoverage: number | null
      toBuy: number
    }
    planned: {
      balancePerDay: number
      balancePerPeriod: number
      valuePerDay: number
      valuePerPeriod: number
      unitPrice: number
      stock: number
      daysCoverage: number | null
      toBuy: number
    }
  }>()

  // Process planned materials
  report.value.materials.forEach((row) => {
    const stock = stockByMaterialId.value.get(row.materialId) ?? 0
    const daysCoverage = row.balancePerDay < 0 ? (stock > 0 ? stock / -row.balancePerDay : 0) : null
    const balancePerPeriod = row.balancePerDay * periodFactor.value
    const valuePerPeriod = row.valuePerDay * periodFactor.value
    const toBuy = row.balancePerDay < 0 ? Math.max(0, -balancePerPeriod - stock) : 0

    combinedMap.set(row.materialId, {
      materialId: row.materialId,
      current: {
        balancePerDay: 0,
        balancePerPeriod: 0,
        valuePerDay: 0,
        valuePerPeriod: 0,
        unitPrice: row.unitPrice,
        stock: 0,
        daysCoverage: null,
        toBuy: 0,
      },
      planned: {
        balancePerDay: row.balancePerDay,
        balancePerPeriod,
        valuePerDay: row.valuePerDay,
        valuePerPeriod,
        unitPrice: row.unitPrice,
        stock,
        daysCoverage,
        toBuy,
      },
    })
  })

  // Process current materials and merge
  reportCurrent.value.materials.forEach((row) => {
    const stock = stockByMaterialId.value.get(row.materialId) ?? 0
    const daysCoverage = row.balancePerDay < 0 ? (stock > 0 ? stock / -row.balancePerDay : 0) : null
    const balancePerPeriod = row.balancePerDay * periodFactor.value
    const valuePerPeriod = row.valuePerDay * periodFactor.value
    const toBuy = row.balancePerDay < 0 ? Math.max(0, -balancePerPeriod - stock) : 0

    const existing = combinedMap.get(row.materialId)
    if (existing) {
      existing.current = {
        balancePerDay: row.balancePerDay,
        balancePerPeriod,
        valuePerDay: row.valuePerDay,
        valuePerPeriod,
        unitPrice: row.unitPrice,
        stock,
        daysCoverage,
        toBuy,
      }
    } else {
      combinedMap.set(row.materialId, {
        materialId: row.materialId,
        current: {
          balancePerDay: row.balancePerDay,
          balancePerPeriod,
          valuePerDay: row.valuePerDay,
          valuePerPeriod,
          unitPrice: row.unitPrice,
          stock,
          daysCoverage,
          toBuy,
        },
        planned: {
          balancePerDay: 0,
          balancePerPeriod: 0,
          valuePerDay: 0,
          valuePerPeriod: 0,
          unitPrice: row.unitPrice,
          stock: 0,
          daysCoverage: null,
          toBuy: 0,
        },
      })
    }
  })

  let rows = Array.from(combinedMap.values())

  // Sort by name or keep recipe order
  if (materialSortOrder.value === 'name') {
    rows = rows.sort((a, b) => {
      const nameA = materialName(a.materialId).toLowerCase()
      const nameB = materialName(b.materialId).toLowerCase()
      return nameA.localeCompare(nameB)
    })
  }

  return rows
})

const nonExportMaterials = computed(() => {
  return materialRows.value.filter(row => !exportMaterialIds.value.has(row.materialId))
})

const exportMaterials = computed(() => {
  return materialRows.value.filter(row => exportMaterialIds.value.has(row.materialId))
})

// Totals for non-export materials
const nonExportTotals = computed(() => {
  return nonExportMaterials.value.reduce(
    (acc, row) => ({
      currentWeight: acc.currentWeight + getWeightValue(row.current.balancePerPeriod, row.materialId),
      plannedWeight: acc.plannedWeight + getWeightValue(row.planned.balancePerPeriod, row.materialId),
      currentRevenue: acc.currentRevenue + row.current.valuePerPeriod,
      plannedRevenue: acc.plannedRevenue + row.planned.valuePerPeriod,
    }),
    { currentWeight: 0, plannedWeight: 0, currentRevenue: 0, plannedRevenue: 0 }
  )
})

// Negative materials totals (consumption/import)
const nonExportNegativeTotals = computed(() => {
  return nonExportMaterials.value.reduce(
    (acc, row) => {
      if (row.current.balancePerDay < 0) {
        acc.currentWeight += getWeightValue(row.current.balancePerPeriod, row.materialId)
        acc.currentRevenue += row.current.valuePerPeriod
      }

      if (row.planned.balancePerDay < 0) {
        acc.plannedWeight += getWeightValue(row.planned.balancePerPeriod, row.materialId)
        acc.plannedRevenue += row.planned.valuePerPeriod
      }

      return acc
    },
    { currentWeight: 0, plannedWeight: 0, currentRevenue: 0, plannedRevenue: 0 },
  )
})

// Positive materials totals (production/export)
const nonExportPositiveTotals = computed(() => {
  return nonExportMaterials.value.reduce(
    (acc, row) => {
      if (row.current.balancePerDay >= 0) {
        acc.currentWeight += getWeightValue(row.current.balancePerPeriod, row.materialId)
        acc.currentRevenue += row.current.valuePerPeriod
      }

      if (row.planned.balancePerDay >= 0) {
        acc.plannedWeight += getWeightValue(row.planned.balancePerPeriod, row.materialId)
        acc.plannedRevenue += row.planned.valuePerPeriod
      }

      return acc
    },
    { currentWeight: 0, plannedWeight: 0, currentRevenue: 0, plannedRevenue: 0 },
  )
})

// Check if we have both negative and positive materials
const nonExportHasBothTypes = computed(() => {
  const hasCurrentNegative = nonExportMaterials.value.some(row => row.current.balancePerDay < 0)
  const hasCurrentPositive = nonExportMaterials.value.some(row => row.current.balancePerDay >= 0)
  const hasPlannedNegative = nonExportMaterials.value.some(row => row.planned.balancePerDay < 0)
  const hasPlannedPositive = nonExportMaterials.value.some(row => row.planned.balancePerDay >= 0)

  return (hasCurrentNegative && hasCurrentPositive) || (hasPlannedNegative && hasPlannedPositive)
})

// Totals for export materials
const exportTotals = computed(() => {
  return exportMaterials.value.reduce(
    (acc, row) => ({
      currentWeight: acc.currentWeight + getWeightValue(row.current.balancePerPeriod, row.materialId),
      plannedWeight: acc.plannedWeight + getWeightValue(row.planned.balancePerPeriod, row.materialId),
      currentRevenue: acc.currentRevenue + row.current.valuePerPeriod,
      plannedRevenue: acc.plannedRevenue + row.planned.valuePerPeriod,
    }),
    { currentWeight: 0, plannedWeight: 0, currentRevenue: 0, plannedRevenue: 0 }
  )
})

function materialName(id: number) {
  return props.index.materialById.get(id)?.name ?? `#${id}`
}

// Helper to calculate weight value for comparisons
function getWeightValue(amount: number, materialId: number): number {
  const weightInTonnes = props.index.materialById.get(materialId)?.weightInTonnes ?? 0
  return amount * weightInTonnes
}


// Auto-unmute buy alerts for low-stock materials (don't create new ones)
watch([materialRows, timeframeHours], () => {
  const thresholdHours = timeframeHours.value

  materialRows.value.forEach((row) => {
    // Only for materials with negative balance (consumption) - use planned values
    if (row.planned.balancePerDay >= 0) return

    const daysCoverage = row.planned.daysCoverage ?? 0
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

// Combined worker rows with both current and planned data
const workerRows = computed(() => {
  // Build a map of worker type + materialId to combined row data
  const combinedMap = new Map<string, {
    tier: 1 | 2 | 3 | 4
    materialId: number
    optional: boolean
    active: boolean
    current: {
      consumptionPerDay: number
      costPerDay: number
      unitPrice: number
    }
    planned: {
      consumptionPerDay: number
      costPerDay: number
      unitPrice: number
    }
  }>()

  // Process planned workers
  report.value.workers.forEach((row) => {
    const key = `${row.tier}-${row.materialId}`
    combinedMap.set(key, {
      tier: row.tier,
      materialId: row.materialId,
      optional: row.optional,
      active: row.active,
      current: {
        consumptionPerDay: 0,
        costPerDay: 0,
        unitPrice: row.unitPrice,
      },
      planned: {
        consumptionPerDay: row.consumptionPerDay,
        costPerDay: row.costPerDay,
        unitPrice: row.unitPrice,
      },
    })
  })

  // Process current workers and merge
  reportCurrent.value.workers.forEach((row) => {
    const key = `${row.tier}-${row.materialId}`
    const existing = combinedMap.get(key)
    if (existing) {
      existing.current = {
        consumptionPerDay: row.consumptionPerDay,
        costPerDay: row.costPerDay,
        unitPrice: row.unitPrice,
      }
    } else {
      combinedMap.set(key, {
        tier: row.tier,
        materialId: row.materialId,
        optional: row.optional,
        active: row.active,
        current: {
          consumptionPerDay: row.consumptionPerDay,
          costPerDay: row.costPerDay,
          unitPrice: row.unitPrice,
        },
        planned: {
          consumptionPerDay: 0,
          costPerDay: 0,
          unitPrice: row.unitPrice,
        },
      })
    }
  })

  const rows = Array.from(combinedMap.values())
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
    current: {
      ...row.current,
      consumptionPerPeriod: row.current.consumptionPerDay * periodFactor.value,
      costPerPeriod: row.current.costPerDay * periodFactor.value,
    },
    planned: {
      ...row.planned,
      consumptionPerPeriod: row.planned.consumptionPerDay * periodFactor.value,
      costPerPeriod: row.planned.costPerDay * periodFactor.value,
    },
  })),
)

const totalWorkerCosts = computed(() =>
  workerDisplayRows.value.reduce((acc, row) => acc + row.planned.costPerPeriod, 0),
)

// Calculate workforce productivity
const workforceProductivity = computed(() => {
  return calculateWorkforceProductivity(report.value, props.warehouseStocks)
})

// Calculate EXACT lost profit using service
const lostProfitResult = computed(() => {
  return calculateLostProfit(
    workforceProductivity.value,
    report.value,
    props.gameData,
    props.index,
    assignment.value,
    props.priceResolver,
    technologyLevelsOption.value,
    props.startingBonus,
    props.globalWorkforceBurden,
  )
})

const lostProfitData = computed(() => {
  if (workforceProductivity.value.overallProductivityPercent >= 100) {
    return null
  }
  return {
    lostProfitPerPeriod: lostProfitResult.value.lostProfitPerDay * periodFactor.value,
    currentProductivity: workforceProductivity.value.overallProductivityPercent,
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
    // If user has explicitly set optionals, use those
    // Otherwise, default to all optional consumables active
    if (list && list.length > 0) {
      optionalActive.value = new Set((list ?? []).filter((id): id is number => typeof id === 'number'))
    } else if (list === undefined || list.length === 0) {
      // Default: all optionals active
      optionalActive.value = getAllOptionalConsumables()
    }
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
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-slate-400 text-xs uppercase">
              <tr>
                <th class="text-left pb-1" rowspan="2">{{ translate('material') }}</th>
                <th class="text-center pb-1 px-2 border-l border-slate-700" colspan="4">Current</th>
                <th class="text-center pb-1 px-2 border-l border-slate-700" colspan="4">Planned</th>
                <th class="text-right pb-1 border-l border-slate-700" rowspan="2">{{ translate('unitPrice') }}</th>
              </tr>
              <tr>
                <th class="text-right pb-1 px-1 border-l border-slate-700 text-[10px]">{{ periodLabel }}</th>
                <th class="text-right pb-1 px-1 text-[10px]">Weight</th>
                <th class="text-right pb-1 px-1 text-[10px]">Revenue</th>
                <th class="text-right pb-1 px-1 text-[10px]">Stock</th>
                <th class="text-right pb-1 px-1 border-l border-slate-700 text-[10px]">{{ periodLabel }}</th>
                <th class="text-right pb-1 px-1 text-[10px]">Weight</th>
                <th class="text-right pb-1 px-1 text-[10px]">Revenue</th>
                <th class="text-right pb-1 px-1 text-[10px]">Stock</th>
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
                <!-- Current Production -->
                <td
                  class="py-1 text-right px-1 border-l border-slate-700/50 text-xs"
                  :class="row.current.balancePerDay >= 0 ? 'text-emerald-300' : 'text-rose-300'"
                >
                  {{ formatNumber(row.current.balancePerPeriod, 1) }}
                </td>
                <td class="py-1 text-right px-1 text-xs text-slate-400">
                  {{ formatWeight(props.gameData, row.current.balancePerPeriod, row.materialId) }}
                </td>
                <td class="py-1 text-right px-1 text-xs" :class="row.current.valuePerPeriod < 0 ? 'text-rose-300' : 'text-emerald-400'">
                  {{ formatPrice(row.current.valuePerPeriod, 0) }}
                </td>
                <td class="py-1 text-right px-1 text-xs" :class="(row.current.daysCoverage ?? 0) < periodFactor ? 'text-rose-300' : 'text-emerald-400'">
                  <span v-if="row.current.daysCoverage !== null">
                    {{ formatNumber(row.current.daysCoverage, 1) }}d
                  </span>
                  <span v-else>—</span>
                </td>
                <!-- Planned Production -->
                <td
                  class="py-1 text-right px-1 border-l border-slate-700/50 text-xs"
                  :class="[
                    row.planned.balancePerDay >= 0 ? 'text-emerald-300' : 'text-rose-300',
                    Math.abs(row.planned.balancePerPeriod - row.current.balancePerPeriod) > 0.01 ? 'bg-blue-900/20' : ''
                  ]"
                >
                  {{ formatNumber(row.planned.balancePerPeriod, 1) }}
                </td>
                <td
                  class="py-1 text-right px-1 text-xs text-slate-400"
                  :class="Math.abs(getWeightValue(row.planned.balancePerPeriod, row.materialId) - getWeightValue(row.current.balancePerPeriod, row.materialId)) > 0.01 ? 'bg-blue-900/20' : ''"
                >
                  {{ formatWeight(props.gameData, row.planned.balancePerPeriod, row.materialId) }}
                </td>
                <td
                  class="py-1 text-right px-1 text-xs"
                  :class="[
                    row.planned.valuePerPeriod < 0 ? 'text-rose-300' : 'text-emerald-400',
                    Math.abs(row.planned.valuePerPeriod - row.current.valuePerPeriod) > 0.01 ? 'bg-blue-900/20' : ''
                  ]"
                >
                  {{ formatPrice(row.planned.valuePerPeriod, 0) }}
                </td>
                <td
                  class="py-1 text-right px-1 text-xs"
                  :class="[
                    (row.planned.daysCoverage ?? 0) < periodFactor ? 'text-rose-300' : 'text-emerald-400',
                    Math.abs((row.planned.daysCoverage ?? 0) - (row.current.daysCoverage ?? 0)) > 0.01 ? 'bg-blue-900/20' : ''
                  ]"
                >
                  <span v-if="row.planned.daysCoverage !== null">
                    {{ formatNumber(row.planned.daysCoverage, 1) }}d
                  </span>
                  <span v-else>—</span>
                </td>
                <td class="py-1 text-right border-l border-slate-700/50">
                  <div class="flex items-center justify-end gap-1">
                    <span>{{ formatPrice(row.planned.unitPrice, 2) }}</span>
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
              </tr>
            </tbody>
            <tfoot class="border-t-2 border-slate-700">
              <!-- Negative materials summary (if exists) -->
              <tr v-if="nonExportNegativeTotals.currentRevenue !== 0 || nonExportNegativeTotals.plannedRevenue !== 0" class="font-semibold text-rose-300">
                <td class="py-2">Consumption</td>
                <td class="py-2 text-right px-1 border-l border-slate-700/50"></td>
                <td class="py-2 text-right px-1 text-xs">
                  {{ formatNumber(nonExportNegativeTotals.currentWeight, 1) }}t
                </td>
                <td class="py-2 text-right px-1 text-xs text-rose-300">
                  {{ formatPrice(nonExportNegativeTotals.currentRevenue, 0) }}
                </td>
                <td class="py-2 text-right px-1"></td>
                <td class="py-2 text-right px-1 border-l border-slate-700/50"></td>
                <td class="py-2 text-right px-1 text-xs"
                  :class="Math.abs(nonExportNegativeTotals.plannedWeight - nonExportNegativeTotals.currentWeight) > 0.01 ? 'bg-blue-900/20' : ''"
                >
                  {{ formatNumber(nonExportNegativeTotals.plannedWeight, 1) }}t
                </td>
                <td class="py-2 text-right px-1 text-xs text-rose-300"
                  :class="Math.abs(nonExportNegativeTotals.plannedRevenue - nonExportNegativeTotals.currentRevenue) > 0.01 ? 'bg-blue-900/20' : ''"
                >
                  {{ formatPrice(nonExportNegativeTotals.plannedRevenue, 0) }}
                </td>
                <td class="py-2 text-right px-1"></td>
                <td class="py-2 text-right border-l border-slate-700/50"></td>
              </tr>

              <!-- Positive materials summary (if exists) -->
              <tr v-if="nonExportPositiveTotals.currentRevenue !== 0 || nonExportPositiveTotals.plannedRevenue !== 0" class="font-semibold text-emerald-300">
                <td class="py-2">Production</td>
                <td class="py-2 text-right px-1 border-l border-slate-700/50"></td>
                <td class="py-2 text-right px-1 text-xs">
                  {{ formatNumber(nonExportPositiveTotals.currentWeight, 1) }}t
                </td>
                <td class="py-2 text-right px-1 text-xs text-emerald-400">
                  {{ formatPrice(nonExportPositiveTotals.currentRevenue, 0) }}
                </td>
                <td class="py-2 text-right px-1"></td>
                <td class="py-2 text-right px-1 border-l border-slate-700/50"></td>
                <td class="py-2 text-right px-1 text-xs"
                  :class="Math.abs(nonExportPositiveTotals.plannedWeight - nonExportPositiveTotals.currentWeight) > 0.01 ? 'bg-blue-900/20' : ''"
                >
                  {{ formatNumber(nonExportPositiveTotals.plannedWeight, 1) }}t
                </td>
                <td class="py-2 text-right px-1 text-xs text-emerald-400"
                  :class="Math.abs(nonExportPositiveTotals.plannedRevenue - nonExportPositiveTotals.currentRevenue) > 0.01 ? 'bg-blue-900/20' : ''"
                >
                  {{ formatPrice(nonExportPositiveTotals.plannedRevenue, 0) }}
                </td>
                <td class="py-2 text-right px-1"></td>
                <td class="py-2 text-right border-l border-slate-700/50"></td>
              </tr>

              <!-- Combined total (if both types exist) -->
              <tr v-if="nonExportHasBothTypes" class="font-semibold text-slate-300">
                <td class="py-2">Total</td>
                <td class="py-2 text-right px-1 border-l border-slate-700/50"></td>
                <td class="py-2 text-right px-1 text-xs">
                  {{ formatNumber(nonExportTotals.currentWeight, 1) }}t
                </td>
                <td class="py-2 text-right px-1 text-xs">
                  {{ formatPrice(nonExportTotals.currentRevenue, 0) }}
                </td>
                <td class="py-2 text-right px-1"></td>
                <td class="py-2 text-right px-1 border-l border-slate-700/50"></td>
                <td class="py-2 text-right px-1 text-xs"
                  :class="Math.abs(nonExportTotals.plannedWeight - nonExportTotals.currentWeight) > 0.01 ? 'bg-blue-900/20' : ''"
                >
                  {{ formatNumber(nonExportTotals.plannedWeight, 1) }}t
                </td>
                <td class="py-2 text-right px-1 text-xs"
                  :class="Math.abs(nonExportTotals.plannedRevenue - nonExportTotals.currentRevenue) > 0.01 ? 'bg-blue-900/20' : ''"
                >
                  {{ formatPrice(nonExportTotals.plannedRevenue, 0) }}
                </td>
                <td class="py-2 text-right px-1"></td>
                <td class="py-2 text-right border-l border-slate-700/50"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Export Materials Table (moved below Other Materials) -->
      <div v-if="exportMaterials.length" class="space-y-2 mt-4">
        <div class="text-sm font-semibold text-emerald-300">{{ translate('exportMaterials') }}</div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-slate-400 text-xs uppercase">
              <tr>
                <th class="text-left pb-1" rowspan="2">{{ translate('material') }}</th>
                <th class="text-center pb-1 px-2 border-l border-slate-700" colspan="3">Current</th>
                <th class="text-center pb-1 px-2 border-l border-slate-700" colspan="3">Planned</th>
                <th class="text-right pb-1 border-l border-slate-700" rowspan="2">{{ translate('unitPrice') }}</th>
              </tr>
              <tr>
                <th class="text-right pb-1 px-1 border-l border-slate-700 text-[10px]">{{ periodLabel }}</th>
                <th class="text-right pb-1 px-1 text-[10px]">Weight</th>
                <th class="text-right pb-1 px-1 text-[10px]">Revenue</th>
                <th class="text-right pb-1 px-1 border-l border-slate-700 text-[10px]">{{ periodLabel }}</th>
                <th class="text-right pb-1 px-1 text-[10px]">Weight</th>
                <th class="text-right pb-1 px-1 text-[10px]">Revenue</th>
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
                <!-- Current Production -->
                <td class="py-1 text-right px-1 border-l border-slate-700/50 text-xs text-emerald-300 font-medium">
                  {{ formatNumber(row.current.balancePerPeriod, 1) }}
                </td>
                <td class="py-1 text-right px-1 text-xs text-slate-400">
                  {{ formatWeight(props.gameData, row.current.balancePerPeriod, row.materialId) }}
                </td>
                <td class="py-1 text-right px-1 text-xs text-emerald-400">
                  {{ formatPrice(row.current.valuePerPeriod, 0) }}
                </td>
                <!-- Planned Production -->
                <td
                  class="py-1 text-right px-1 border-l border-slate-700/50 text-xs text-emerald-300 font-medium"
                  :class="Math.abs(row.planned.balancePerPeriod - row.current.balancePerPeriod) > 0.01 ? 'bg-blue-900/20' : ''"
                >
                  {{ formatNumber(row.planned.balancePerPeriod, 1) }}
                </td>
                <td
                  class="py-1 text-right px-1 text-xs text-slate-400"
                  :class="Math.abs(getWeightValue(row.planned.balancePerPeriod, row.materialId) - getWeightValue(row.current.balancePerPeriod, row.materialId)) > 0.01 ? 'bg-blue-900/20' : ''"
                >
                  {{ formatWeight(props.gameData, row.planned.balancePerPeriod, row.materialId) }}
                </td>
                <td
                  class="py-1 text-right px-1 text-xs text-emerald-400"
                  :class="Math.abs(row.planned.valuePerPeriod - row.current.valuePerPeriod) > 0.01 ? 'bg-blue-900/20' : ''"
                >
                  {{ formatPrice(row.planned.valuePerPeriod, 0) }}
                </td>
                <td class="py-1 text-right border-l border-slate-700/50">
                  <div class="flex items-center justify-end gap-1">
                    <span>{{ formatPrice(row.planned.unitPrice, 2) }}</span>
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
              </tr>
            </tbody>
            <tfoot class="border-t-2 border-slate-700">
              <tr class="font-semibold">
                <td class="py-2 text-slate-300">Total</td>
                <td class="py-2 text-right px-1 border-l border-slate-700/50"></td>
                <td class="py-2 text-right px-1 text-xs text-slate-300">
                  {{ formatNumber(exportTotals.currentWeight, 1) }}t
                </td>
                <td class="py-2 text-right px-1 text-xs text-slate-300">
                  {{ formatPrice(exportTotals.currentRevenue, 0) }}
                </td>
                <td class="py-2 text-right px-1 border-l border-slate-700/50"></td>
                <td class="py-2 text-right px-1 text-xs text-slate-300"
                  :class="Math.abs(exportTotals.plannedWeight - exportTotals.currentWeight) > 0.01 ? 'bg-blue-900/20' : ''"
                >
                  {{ formatNumber(exportTotals.plannedWeight, 1) }}t
                </td>
                <td class="py-2 text-right px-1 text-xs text-slate-300"
                  :class="Math.abs(exportTotals.plannedRevenue - exportTotals.currentRevenue) > 0.01 ? 'bg-blue-900/20' : ''"
                >
                  {{ formatPrice(exportTotals.plannedRevenue, 0) }}
                </td>
                <td class="py-2 text-right border-l border-slate-700/50"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div v-if="!materialRows.length" class="text-sm text-slate-400">—</div>
    </div>

    <!-- Worker Consumption (right column, bottom) -->
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

      <template v-if="workerDisplayRows.length">
        <!-- Workforce Productivity Section -->
        <div class="space-y-3 pb-3 border-b border-slate-700">
        <!-- No stock data warning -->
        <div v-if="!workforceProductivity.hasStockData" class="flex items-center gap-2 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-xs">
          <span class="text-blue-400">ℹ️</span>
          <span class="text-slate-300">{{ workforceProductivity.explanation }}</span>
        </div>

        <div class="flex justify-between">
          <span class="text-sm font-semibold">⚙️
            {{ translate('workforceProductivity') }}
            {{ formatNumber(workforceProductivity.overallProductivityPercent, 0) }}%
          </span>
          <span v-if="workforceProductivity.overallProductivityPercent < 100 && lostProfitData" class="text-sm gap-1 px-2 bg-orange-900/30 border border-orange-600 rounded text-orange-300">
            Lost Profit {{ formatPrice(lostProfitData.lostProfitPerPeriod, 0) }}
            <template v-if="Math.floor(lostProfitResult.minHousingCoverage) < 100 || Math.floor(lostProfitResult.minSatisfaction) < 100">
              (<template v-if="Math.floor(lostProfitResult.minHousingCoverage) < 100">{{ Math.floor(lostProfitResult.minHousingCoverage) }}% housing coverage<template v-if="Math.floor(lostProfitResult.minSatisfaction) < 100">, </template></template><template v-if="Math.floor(lostProfitResult.minSatisfaction) < 100">{{ Math.floor(lostProfitResult.minSatisfaction) }}% satisfaction</template>)
            </template>
          </span>
        </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-slate-400 text-xs uppercase">
              <tr>
                <th class="text-left pb-1" rowspan="2">{{ translate('material') }}</th>
                <th class="text-center pb-1 px-2 border-l border-slate-700" colspan="2">Current</th>
                <th class="text-center pb-1 px-2 border-l border-slate-700" colspan="2">Planned</th>
                <th class="text-center pb-1 px-2 border-l border-slate-700" rowspan="2">Unit Price</th>
              </tr>
              <tr>
                <th class="text-right pb-1 px-1 border-l border-slate-700 text-[10px]">{{ periodLabel }}</th>
                <th class="text-right pb-1 px-1 text-[10px]">{{ translate('costs') }}</th>
                <th class="text-right pb-1 px-1 border-l border-slate-700 text-[10px]">{{ periodLabel }}</th>
                <th class="text-right pb-1 px-1 text-[10px]">{{ translate('costs') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in workerDisplayRows"
                :key="row.tier + '-' + row.materialId"
                class="border-t border-slate-800/60"
                :class="{ 'opacity-40': row.optional && !row.active }"
              >
                <td class="py-1">
                  <div class="flex items-center gap-1">
                    <MaterialIcon :name="materialName(row.materialId)" variant="sm" />
                    <span>{{ materialName(row.materialId) }}</span>
                    <span v-if="row.optional" class="text-xs text-orange-400">({{ translate('optional') }})</span>
                  </div>
                </td>
                <!-- Current Consumption -->
                <td class="py-1 text-right px-1 border-l border-slate-700/50 text-xs">
                  {{ formatNumber(row.current.consumptionPerPeriod, 1) }}
                </td>
                <td class="py-1 text-right px-1 text-xs text-rose-300">
                  {{ formatPrice(row.current.costPerPeriod, 0) }}
                </td>
                <!-- Planned Consumption -->
                <td
                  class="py-1 text-right px-1 border-l border-slate-700/50 text-xs"
                  :class="Math.abs(row.planned.consumptionPerPeriod - row.current.consumptionPerPeriod) > 0.01 ? 'bg-blue-900/20' : ''"
                >
                  {{ formatNumber(row.planned.consumptionPerPeriod, 1) }}
                </td>
                <td
                  class="py-1 text-right px-1 text-xs text-rose-300"
                  :class="Math.abs(row.planned.costPerPeriod - row.current.costPerPeriod) > 0.01 ? 'bg-blue-900/20' : ''"
                >
                  {{ formatPrice(row.planned.costPerPeriod, 0) }}
                </td>
                <td class="py-1 text-right border-l border-slate-700/50">
                  <div class="flex items-center justify-end gap-1">
                    <span>{{ formatPrice(row.planned.unitPrice, 2) }}</span>
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
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pt-2 border-t border-slate-700 text-sm font-semibold text-right">
          {{ translate('totalWorkerCosts') }}: <span class="text-rose-300">{{ formatPrice(totalWorkerCosts, 2) }}</span>
        </div>
      </template>
      <template v-else>
        <div class="text-sm text-slate-400">—</div>
      </template>
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
