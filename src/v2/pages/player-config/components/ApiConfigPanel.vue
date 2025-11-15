<script setup lang="ts">
import { ref, computed } from 'vue'
import { getApiKey, setApiKey, clearApiKey } from '@/v2/services/api/apiKeyManager'
import { fetchCompanyBases, fetchWarehouseStock } from '@/v2/services/api/warehouseService'
import { translate } from '@/v2/localisation/localisation'

const emit = defineEmits<{
  basesLoaded: [bases: Array<{ id: number; name: string; planetId: number; warehouseId: number }>]
  stocksLoaded: [
    stocks: Array<{
      baseId: number
      items: Array<{ materialId: number; quantity: number }>
    }>,
  ]
}>()

const apiKey = ref(getApiKey() || '')
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const isConfigured = computed(() => getApiKey() !== null)

async function handleSaveApiKey() {
  const success = setApiKey(apiKey.value)
  if (success) {
    error.value = null
  } else {
    error.value = translate('apiKeySaveError')
  }
}

function handleClearApiKey() {
  clearApiKey()
  apiKey.value = ''
  error.value = null
  success.value = null
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
    const result = await fetchCompanyBases(key, true)
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

  loading.value = true
  error.value = null
  success.value = null

  try {
    const result = await fetchWarehouseStock(key, true)
    const stocks = result.data.warehouses.map((warehouse) => ({
      baseId: warehouse.baseId,
      items: warehouse.items,
    }))
    emit('stocksLoaded', stocks)
    success.value = translate('warehouseStockLoadedSuccess')
  } catch (e) {
    error.value = `${translate('warehouseStockLoadError')}: ${e instanceof Error ? e.message : String(e)}`
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="rounded border border-slate-700 bg-slate-900 p-4 space-y-4">
    <div class="font-semibold">{{ translate('apiConfiguration') }}</div>

    <div class="space-y-2">
      <label class="block text-sm">
        <span class="text-slate-400">{{ translate('apiKeyLabel') }}</span>
        <input
          v-model="apiKey"
          type="password"
          class="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
          :placeholder="translate('apiKeyPlaceholder')"
        />
      </label>
      <p class="text-xs text-slate-400">{{ translate('apiKeyHint') }}</p>
    </div>

    <div class="flex gap-2">
      <button
        @click="handleSaveApiKey"
        class="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 rounded text-sm"
      >
        {{ translate('saveApiKey') }}
      </button>
      <button
        v-if="isConfigured"
        @click="handleClearApiKey"
        class="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
      >
        {{ translate('clearApiKey') }}
      </button>
    </div>

    <div v-if="isConfigured" class="space-y-2 border-t border-slate-700 pt-4">
      <div class="font-semibold text-sm">{{ translate('apiSyncActions') }}</div>
      <div class="flex gap-2">
        <button
          @click="handleSyncBases"
          :disabled="loading"
          class="px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded text-sm"
        >
          {{ loading ? '…' : translate('syncBases') }}
        </button>
        <button
          @click="handleSyncWarehouse"
          :disabled="loading"
          class="px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded text-sm"
        >
          {{ loading ? '…' : translate('syncWarehouse') }}
        </button>
      </div>
    </div>

    <div v-if="error" class="text-xs text-rose-400 bg-rose-900/30 rounded px-3 py-2">{{ error }}</div>
    <div v-if="success" class="text-xs text-emerald-400 bg-emerald-900/30 rounded px-3 py-2">{{ success }}</div>
  </div>
</template>
