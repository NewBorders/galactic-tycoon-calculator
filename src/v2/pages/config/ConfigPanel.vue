<script setup lang="ts">
import { ref, watch } from 'vue'
import { getApiKey, getApiKeyRef, setApiKey, getWorld, setWorld } from '@/v2/services/api/apiKeyManager'
import { getExportThreshold, setExportThreshold } from '@/v2/services/config/exportThreshold'
import { translate } from '@/v2/localisation'
import LanguageSwitcher from '@/v2/components/LanguageSwitcher.vue'
import WorldSwitcher from '@/v2/components/WorldSwitcher.vue'
import PriceManagement from './components/PriceManagement.vue'
import SyncStatus from './components/SyncStatus.vue'
import type { World } from '@/v2/services/api/types'

const apiKey = ref(getApiKey() || '')
const world = ref<World>(getWorld())
const exportThreshold = ref(getExportThreshold())
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

function handleExportThresholdChange() {
  setExportThreshold(exportThreshold.value)
}
</script>

<template>
  <div class="space-y-4 text-slate-100">
    <!-- Two-column layout for config options -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Left Column: Language & Export Threshold -->
      <div class="space-y-4">
        <!-- Language Selection -->
        <div class="space-y-2">
          <div class="text-sm">
            <span class="text-slate-400">{{ translate('languageLabel') }}</span>
            <div class="mt-1">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        <!-- Export Threshold -->
        <div class="border-t border-slate-700 pt-4 space-y-2">
          <label class="block text-sm">
            <span class="text-slate-400">{{ translate('exportThresholdLabel') }}</span>
            <div class="flex items-center gap-3 mt-2">
              <input
                v-model.number="exportThreshold"
                @change="handleExportThresholdChange"
                type="range"
                min="0"
                max="100"
                step="5"
                class="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <span class="text-lg font-semibold text-purple-400 w-12 text-right">{{ exportThreshold }}%</span>
            </div>
          </label>
          <p class="text-xs text-slate-400">{{ translate('exportThresholdHint') }}</p>
          <div class="bg-blue-900/30 border border-blue-700 rounded p-3">
            <p class="text-xs text-blue-200">
              <strong>{{ translate('exportThresholdExample') }}:</strong><br>
              {{ translate('exportThresholdExampleText', { threshold: exportThreshold }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Right Column: World Selection & API Key -->
      <div class="space-y-4">
        <!-- World Selection with WorldSwitcher -->
        <div class="space-y-2">
          <span class="block text-sm text-slate-400">{{ translate('worldLabel') }}</span>
          <WorldSwitcher />
          <p class="text-xs text-slate-400">{{ translate('worldHint') }}</p>
        </div>

        <!-- API Key -->
        <div class="border-t border-slate-700 pt-4 space-y-2">
          <label class="block text-sm">
            <span class="text-slate-400">{{ translate('apiKeyLabel') }}</span>
            <input
              v-model="apiKey"
              type="password"
              class="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
              :placeholder="translate('apiKeyPlaceholder')"
            />
          </label>
          <div class="space-y-2">
            <p class="text-xs text-slate-400">{{ translate('apiKeyHint') }}</p>
            <div class="bg-blue-900/30 border border-blue-700 rounded p-3">
              <p class="text-xs text-blue-200">
                <strong>{{ translate('apiKeyGeneration') }}:</strong><br>
                <span v-html="translate('apiKeyGenerationInstructions')"></span>
              </p>
            </div>
          </div>
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
        
        <!-- Sync Status -->
        <div class="border-t border-slate-700 pt-4">
          <SyncStatus />
        </div>
      </div>
    </div>

    <!-- Price Management (full width) -->
    <div class="border-t border-slate-700 pt-4">
      <Suspense>
        <PriceManagement />
        <template #fallback>
          <div class="flex items-center justify-center py-8">
            <div class="text-slate-400">Loading price management...</div>
          </div>
        </template>
      </Suspense>
    </div>
  </div>
</template>
