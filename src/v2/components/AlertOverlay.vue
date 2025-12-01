<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePriceAlerts } from '../services/priceAlerts/alertManager'
import type { AlertType } from '../services/priceAlerts/types'
import { formatDecimal } from '../localisation/numbers'

const props = defineProps<{
  materialId: number
  materialName: string
  currentPrice: number // in dollars
  averagePrice: number // in dollars
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { addAlert, getAlert, removeAlert } = usePriceAlerts()

// Form state
const selectedType = ref<AlertType>('buy')
const targetPrice = ref<number>(0)

// Existing alerts
const existingBuyAlert = computed(() => getAlert(props.materialId, 'buy'))
const existingSelAlert = computed(() => getAlert(props.materialId, 'sell'))

// Initialize target price
onMounted(() => {
  // Default to average price
  targetPrice.value = props.averagePrice
})

// Handle overlay click (close on outside click)
function handleOverlayClick(event: MouseEvent) {
  if ((event.target as HTMLElement).classList.contains('overlay-backdrop')) {
    emit('close')
  }
}

// Create/Update alert
function saveAlert() {
  addAlert(props.materialId, props.materialName, selectedType.value, targetPrice.value)
  emit('close')
}

// Delete alert
function deleteAlert(type: AlertType) {
  const alert = getAlert(props.materialId, type)
  if (alert) {
    removeAlert(alert.id)
  }
}

// Format price
function formatPrice(price: number): string {
  return '$' + formatDecimal(price, 2)
}

// Close on Escape
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="overlay-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click="handleOverlayClick"
    >
      <div class="bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-slate-700">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 class="text-lg font-semibold text-white">
            🔔 Price Alert: {{ materialName }}
          </h3>
          <button
            @click="emit('close')"
            class="text-gray-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <!-- Body -->
        <div class="p-4 space-y-4">
          <!-- Current Prices Info -->
          <div class="bg-slate-900 rounded p-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-400">Current Price:</span>
              <span class="text-white font-mono">{{ formatPrice(currentPrice) }}</span>
            </div>
            <div class="flex justify-between mt-1">
              <span class="text-gray-400">Average Price:</span>
              <span class="text-white font-mono">{{ formatPrice(averagePrice) }}</span>
            </div>
          </div>

          <!-- Alert Type -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Alert Type
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="selectedType = 'buy'"
                :class="[
                  'px-4 py-2 rounded border transition',
                  selectedType === 'buy'
                    ? 'bg-blue-700 border-blue-600 text-white'
                    : 'bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600'
                ]"
              >
                💰 Buy
              </button>
              <button
                @click="selectedType = 'sell'"
                :class="[
                  'px-4 py-2 rounded border transition',
                  selectedType === 'sell'
                    ? 'bg-green-700 border-green-600 text-white'
                    : 'bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600'
                ]"
              >
                📈 Sell
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              <strong>Buy:</strong> Alert when price ≤ target (good to buy)<br>
              <strong>Sell:</strong> Alert when price ≥ target (good to sell)
            </p>
          </div>

          <!-- Target Price -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Target Price ($)
            </label>
            <input
              v-model.number="targetPrice"
              type="number"
              step="0.01"
              min="0"
              class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <!-- Existing Alerts Info -->
          <div v-if="existingBuyAlert || existingSelAlert" class="text-xs text-gray-400">
            <div class="font-medium mb-1">Existing Alerts:</div>
            <div v-if="existingBuyAlert" class="flex items-center justify-between py-1">
              <span>💰 Buy: {{ formatPrice(existingBuyAlert.targetPrice) }}</span>
              <button
                @click="deleteAlert('buy')"
                class="text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
            <div v-if="existingSelAlert" class="flex items-center justify-between py-1">
              <span>📈 Sell: {{ formatPrice(existingSelAlert.targetPrice) }}</span>
              <button
                @click="deleteAlert('sell')"
                class="text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 p-4 border-t border-slate-700">
          <button
            @click="emit('close')"
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
          >
            Cancel
          </button>
          <button
            @click="saveAlert"
            class="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded transition"
          >
            {{ existingBuyAlert || existingSelAlert ? 'Update' : 'Create' }} Alert
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay-backdrop {
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
