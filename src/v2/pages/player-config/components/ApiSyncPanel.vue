<script setup lang="ts">
import { ref, computed } from 'vue'
import { getApiKey, getWorld } from '@/v2/services/api/apiKeyManager'
import { fetchCompanyBases, fetchWarehouseStockForAllBases } from '@/v2/services/api/warehouseService'
import { translate } from '@/v2/localisation/localisation'
import type { PlayerBase } from '@/v2/services/playerBases'

const props = defineProps<{
  bases: PlayerBase[]
}>()

const emit = defineEmits<{
  basesLoaded: [bases: Array<{ id: number; name: string; planetId: number; warehouseId: number }>]
  stocksLoaded: [
    stocks: Array<{
      baseId: number
      items: Array<{ materialId: number; quantity: number }>
    }>,
  ]
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const lastWarehouseRefresh = ref<number | null>(null)

const isConfigured = computed(() => getApiKey() !== null)

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

async function handleSyncBases() {
  const key = getApiKey()
  if (!key) {
    error.value = translate('apiKeyNotConfigured')
    return
  }

  loading.value = true
  error.value = null
  success.value = null

  try {
    const world = getWorld()
    const result = await fetchCompanyBases(key, world, true)
    const bases = result.data.bases.map((base) => ({
      id: base.id,
      name: base.name,
      planetId: base.planetId,
      warehouseId: base.warehouseId,
    }))
    emit('basesLoaded', bases)
    success.value = translate('basesLoadedSuccess', { count: bases.length })
  } catch (e) {
    error.value = `${translate('basesLoadError')}: ${e instanceof Error ? e.message : String(e)}`
  } finally {
    loading.value = false
  }
}

async function handleSyncWarehouse() {
  const key = getApiKey()
  if (!key) {
    error.value = translate('apiKeyNotConfigured')
    return
  }

  if (props.bases.length === 0) {
    error.value = 'No bases configured. Load my bases first.'
    return
  }

  loading.value = true
  error.value = null
  success.value = null

  try {
    const world = getWorld()
    // Only load stocks for bases that have gameWarehouseId
    const warehouseIds = props.bases
      .map((b: PlayerBase) => b.gameWarehouseId)
      .filter((id: number | undefined): id is number => id !== undefined)

    if (warehouseIds.length === 0) {
      error.value = 'No bases with warehouse IDs found. Try loading bases first.'
      return
    }

    const result = await fetchWarehouseStockForAllBases(key, warehouseIds, world, true)

    const stocks = result.warehouses.map((w) => ({
      baseId: w.data.baseId,
      items: w.data.items,
    }))

    emit('stocksLoaded', stocks)
    lastWarehouseRefresh.value = Date.now()
    success.value = translate('warehouseStockLoadedSuccess')

    if (result.errors.length > 0) {
      error.value = `Partially loaded. Errors: ${result.errors.join(', ')}`
    }
  } catch (e) {
    error.value = `${translate('warehouseStockLoadError')}: ${e instanceof Error ? e.message : String(e)}`
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex items-center gap-3">
    <button
      v-if="isConfigured"
      @click="handleSyncBases"
      :disabled="loading"
      class="px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded text-sm"
    >
      {{ loading ? '…' : translate('syncBases') }}
    </button>
    <button
      v-if="isConfigured"
      @click="handleSyncWarehouse"
      :disabled="loading"
      class="px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded text-sm"
    >
      {{ loading ? '…' : translate('syncWarehouse') }}
    </button>
    <div v-if="lastWarehouseRefresh" class="text-xs text-slate-400">
      {{ translate('lastWarehouseRefresh') }}: <span class="text-slate-200">{{ formatTimestamp(lastWarehouseRefresh) }}</span>
    </div>
    <div v-if="error" class="text-xs text-rose-400">{{ error }}</div>
    <div v-if="success" class="text-xs text-emerald-400">{{ success }}</div>
  </div>
</template>
