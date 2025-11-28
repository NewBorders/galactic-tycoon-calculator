<script setup lang="ts">
import { ref, computed } from 'vue'
import { getApiKey, getApiKeyRef, getWorld } from '@/v2/services/api/apiKeyManager'
import { fetchCompanyBases } from '@/v2/services/api/warehouseService'
import { translate } from '@/v2/localisation'
import type { PlayerBase } from '@/v2/services/playerBases'

defineProps<{
  bases: PlayerBase[]
}>()

const emit = defineEmits<{
  basesLoaded: [bases: Array<{ id: number; name: string; planetId: number; warehouseId: number }>]
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const isConfigured = computed(() => getApiKeyRef().value !== null)

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
    const bases = result.data.bases.map((b) => ({
      id: b.id,
      name: b.name,
      planetId: b.planetId,
      warehouseId: b.warehouseId,
    }))
    emit('basesLoaded', bases)
    success.value = translate('basesLoadedSuccess').replace('{count}', String(bases.length))

    if (result.source === 'cache') {
      success.value += ' (cached)'
    }
  } catch (e) {
    error.value = `${translate('basesLoadError')}: ${e instanceof Error ? e.message : String(e)}`
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      v-if="isConfigured"
      @click="handleSyncBases"
      :disabled="loading"
      class="px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded text-sm whitespace-nowrap"
    >
      {{ loading ? '…' : translate('syncBases') }}
    </button>
    <div v-if="error" class="text-xs text-rose-400">{{ error }}</div>
    <div v-if="success" class="text-xs text-emerald-400">{{ success }}</div>
  </div>
</template>
