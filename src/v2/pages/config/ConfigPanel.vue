<script setup lang="ts">
import { ref, watch } from 'vue'
import { getApiKey, getApiKeyRef, setApiKey, getWorld, setWorld } from '@/v2/services/api/apiKeyManager'
import { translate } from '@/v2/localisation/localisation'
import LanguageSwitcher from '@/v2/components/LanguageSwitcher.vue'
import type { World } from '@/v2/services/api/types'

const apiKey = ref(getApiKey() || '')
const world = ref<World>(getWorld())
const saveSuccess = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null

// Sync apiKey ref when it changes in apiKeyManager
watch(getApiKeyRef(), (newKey) => {
  if (newKey !== apiKey.value) {
    apiKey.value = newKey || ''
  }
})

function handleSaveApiKey() {
  setApiKey(apiKey.value)
  saveSuccess.value = true

  if (saveTimer !== null) {
    clearTimeout(saveTimer)
  }
  saveTimer = setTimeout(() => {
    saveSuccess.value = false
  }, 3000)
}

function handleWorldChange() {
  setWorld(world.value)
}
</script>

<template>
  <div class="space-y-4 text-slate-100">
    <!-- API Key -->
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
      <button
        @click="handleSaveApiKey"
        class="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 rounded text-sm"
      >
        {{ translate('saveApiKey') }}
      </button>
      <div v-if="saveSuccess" class="text-xs text-emerald-400 bg-emerald-900/30 rounded px-2 py-1">
        {{ translate('apiKeySaved') }}
      </div>
    </div>

    <!-- World Selection -->
    <div class="border-t border-slate-700 pt-4 space-y-2">
      <label class="block text-sm">
        <span class="text-slate-400">{{ translate('worldLabel') }}</span>
        <select
          v-model="world"
          @change="handleWorldChange"
          class="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
        >
          <option value="g1">{{ translate('worldG1') }}</option>
          <option value="g2">{{ translate('worldG2') }}</option>
        </select>
      </label>
      <p class="text-xs text-slate-400">{{ translate('worldHint') }}</p>
    </div>

    <!-- Language Selection -->
    <div class="border-t border-slate-700 pt-4 space-y-2">
      <div class="text-sm">
        <span class="text-slate-400">{{ translate('languageLabel') }}</span>
        <div class="mt-1">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  </div>
</template>
