<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getApiKey, getApiKeyRef, getWorld } from '@/v2/services/api/apiKeyManager'
import { fetchWarehouseStockForBase } from '@/v2/services/api/warehouseService'
import { translate } from '@/v2/localisation'
import type { PlayerBase } from '@/v2/services/playerBases'

const props = defineProps<{
  bases: PlayerBase[]
}>()

const emit = defineEmits<{
  stocksLoaded: [
    stocks: Array<{
      gameBaseId: number
      stock: Record<number, number>
    }>,
  ]
}>()

const STORAGE_KEY = 'warehouseLastRefresh'
const SUCCESS_MESSAGE_TIMEOUT = 5000 // 5 seconds

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const lastWarehouseRefresh = ref<number | null>(null)

// Load timestamp from localStorage on mount
onMounted(() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      lastWarehouseRefresh.value = Number(stored)
    }
  } catch {
    // Silently fail on storage read
  }
})

// Save timestamp to localStorage when it changes
watch(lastWarehouseRefresh, (newValue) => {
  if (newValue === null) return
  try {
    localStorage.setItem(STORAGE_KEY, String(newValue))
  } catch {
    // Silently fail on storage write
  }
})

// Auto-dismiss success message after timeout
watch(success, (newValue) => {
  if (!newValue) return
  const timer = setTimeout(() => {
    success.value = null
  }, SUCCESS_MESSAGE_TIMEOUT)
  return () => clearTimeout(timer)
})

const isConfigured = computed(() => getApiKeyRef().value !== null)

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
    console.log('[Warehouse] Starting stock sync for world:', world)

    const stocks: Array<{ gameBaseId: number; stock: Record<number, number> }> = []
    const errors: string[] = []

    // Process each base
    for (const base of props.bases) {
      if (!base.gameWarehouseId || !base.gameBaseId) {
        console.log(`[Warehouse] Skipping base "${base.name}" - missing gameWarehouseId or gameBaseId`)
        continue
      }

      try {
        console.log(`[Warehouse] Fetching stock for base "${base.name}" (warehouseId: ${base.gameWarehouseId})`)
        const result = await fetchWarehouseStockForBase(key, base.gameWarehouseId, world, true)

        // Convert items array to stock record: materialId → quantity
        const stockRecord: Record<number, number> = {}
        if (result.data.items) {
          result.data.items.forEach((item) => {
            stockRecord[item.materialId] = item.quantity
          })
        }

        console.log(`[Warehouse] ✓ Base "${base.name}": ${Object.keys(stockRecord).length} materials loaded`)
        stocks.push({
          gameBaseId: base.gameBaseId,
          stock: stockRecord,
        })
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        console.error(`[Warehouse] ✗ Base "${base.name}": ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    console.log(`[Warehouse] Stock sync complete: ${stocks.length}/${props.bases.length} bases loaded`)

    if (stocks.length === 0) {
      error.value = 'No stocks loaded. Check API response.'
      return
    }

    emit('stocksLoaded', stocks)
    lastWarehouseRefresh.value = Date.now()
    success.value = translate('warehouseStockLoadedSuccess')

    if (errors.length > 0) {
      error.value = `Partially loaded: ${errors.length} error(s)`
      console.warn('[Warehouse] Errors:', errors)
    }
  } catch (e) {
    error.value = `${translate('warehouseStockLoadError')}: ${e instanceof Error ? e.message : String(e)}`
    console.error('[Warehouse] Fatal error:', e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex items-center gap-3">
    <button
      v-if="isConfigured"
      @click="handleSyncWarehouse"
      :disabled="loading"
      class="px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded text-sm"
    >
      {{ loading ? '…' : translate('syncWarehouse') }}
    </button>
    <div class="text-xs text-slate-400">
      {{ translate('lastWarehouseRefresh') }}: <span class="text-slate-200">{{ formatTimestamp(lastWarehouseRefresh) }}</span>
    </div>
    <div v-if="error" class="text-xs text-rose-400">{{ error }}</div>
    <div v-if="success" class="text-xs text-emerald-400">{{ success }}</div>
  </div>
</template>
