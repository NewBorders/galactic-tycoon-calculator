<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { usePriceAlerts } from '../../services/priceAlerts/alertManager'
import type { PriceAlert, AlertSortColumn, SortDirection } from '../../services/priceAlerts/types'
import type { GameData, GdIndex } from '../../services/gamedata/types'
import { useMaterialPricing } from '../../services/gamedata/prices'
import { getWorld } from '../../services/api/apiKeyManager'
import { translate } from '../../localisation'
import { formatDecimal } from '../../localisation/numbers'
import MaterialIcon from '../../components/MaterialIcon.vue'
import AlertOverlay from '../../components/AlertOverlay.vue'

const props = defineProps<{
  gameData: GameData
  index: GdIndex
}>()

const {
  priceResolver,
  getMarketEntry,
  refreshPrices,
  loading: priceLoading,
  nextRefreshAt: priceNextRefreshAt,
} = useMaterialPricing(props.gameData)

const {
  alerts,
  removeAlert,
  toggleMute,
  resetAlert,
  addAlert,
  requestNotificationPermission,
  getNotificationPermission,
  sortAlerts,
} = usePriceAlerts()

// Notification permission
const notificationPermission = ref<NotificationPermission>(getNotificationPermission())

async function handleRequestPermission() {
  notificationPermission.value = await requestNotificationPermission()
}

// Search and sort
const searchTerm = ref('')
const sortColumn = ref<AlertSortColumn>('material')
const sortDirection = ref<SortDirection>('asc')

// Edit/Create overlay
const editOverlayOpen = ref(false)
const editMaterialId = ref<number | null>(null)
const editMaterialName = ref('')

// Inline editing
const editingAlertId = ref<string | null>(null)
const editingTargetPrice = ref<number>(0)
const editingType = ref<'buy' | 'sell'>('buy')

function startInlineEdit(alert: PriceAlert, event?: MouseEvent) {
  if (event) event.stopPropagation()
  editingAlertId.value = alert.id
  editingTargetPrice.value = alert.targetPrice
  editingType.value = alert.type
}

function saveInlineEdit(alert: PriceAlert) {
  if (editingAlertId.value !== alert.id) return

  // Update alert with new values
  addAlert(alert.materialId, alert.materialName, editingType.value, editingTargetPrice.value, alert.autoCreated)
  editingAlertId.value = null
}

function cancelInlineEdit() {
  editingAlertId.value = null
}

// Refresh countdown timer
const refreshCountdown = ref('—')
let refreshTimer: ReturnType<typeof setInterval> | null = null

function formatCountdown(ms: number | null) {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms <= 0) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`
}

function updateCountdown() {
  if (priceLoading.value) {
    refreshCountdown.value = '…'
    return
  }
  const target = priceNextRefreshAt.value
  if (!target) {
    refreshCountdown.value = '—'
    return
  }
  const msRemaining = target - Date.now()
  refreshCountdown.value = formatCountdown(msRemaining)
}

watch([priceNextRefreshAt, priceLoading], () => {
  updateCountdown()
})

onMounted(() => {
  updateCountdown()
  refreshTimer = setInterval(() => {
    updateCountdown()
  }, 1000)
})

onBeforeUnmount(() => {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

// Material lookup helper
function materialName(id: number): string {
  return props.index.materialById.get(id)?.name ?? `#${id}`
}

// Open edit overlay
function openEditOverlay(materialId: number) {
  editMaterialId.value = materialId
  editMaterialName.value = materialName(materialId)
  editOverlayOpen.value = true
}

function closeEditOverlay() {
  editOverlayOpen.value = false
  editMaterialId.value = null
  editMaterialName.value = ''
}

const editCurrentPrice = computed(() => {
  if (editMaterialId.value === null) return 0
  return priceResolver.value(editMaterialId.value)
})

const editAveragePrice = computed(() => {
  if (editMaterialId.value === null) return 0
  const entry = getMarketEntry.value(editMaterialId.value)
  return entry?.averagePrice ?? editCurrentPrice.value
})

// Filtered and sorted alerts
const filteredAlerts = computed(() => {
  let filtered = alerts.value

  // Search filter
  if (searchTerm.value.trim()) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(alert => {
      const name = materialName(alert.materialId).toLowerCase()
      return name.includes(search) || alert.materialId.toString().includes(search)
    })
  }

  // Sort using composable function
  return sortAlerts(filtered, sortColumn.value, sortDirection.value)
})

// Toggle sort
function toggleSort(column: AlertSortColumn) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

function getSortIndicator(column: AlertSortColumn): string {
  if (sortColumn.value !== column) return ''
  return sortDirection.value === 'asc' ? ' ▲' : ' ▼'
}

// Format functions
function formatPrice(price: number): string {
  return '$' + formatDecimal(price, 2)
}

function formatPercent(value: number): string {
  return formatDecimal(value, 1) + '%'
}

function getCurrentPrice(materialId: number): number {
  // Always use current price from market, ignore user's price mode settings
  const entry = getMarketEntry.value(materialId)
  return entry?.currentPrice ?? 0
}

function getPriceTrend(materialId: number): { changePercent: number; direction: 'rising' | 'falling' | 'stable'; period: string } | null {
  const entry = getMarketEntry.value(materialId)
  if (!entry?.currentPrice || !entry?.averagePrice) return null

  const changePercent = ((entry.currentPrice - entry.averagePrice) / entry.averagePrice) * 100
  const direction: 'rising' | 'falling' | 'stable' =
    changePercent > 2 ? 'rising' :
    changePercent < -2 ? 'falling' :
    'stable'

  return { changePercent, direction, period: 'vs avg' }
}

// Status helpers
function getStatusColor(status: PriceAlert['status']): string {
  switch (status) {
    case 'active': return 'text-blue-400'
    case 'triggered': return 'text-green-400'
    case 'muted': return 'text-gray-500'
    default: return 'text-gray-400'
  }
}

function getStatusLabel(status: PriceAlert['status']): string {
  switch (status) {
    case 'active': return translate('priceAlertActive')
    case 'triggered': return translate('priceAlertTriggered')
    case 'muted': return translate('priceAlertMuted')
    default: return status
  }
}

function getTrendColor(changePercent: number, alertType: 'buy' | 'sell'): string {
  // For buy alerts: green when price is falling (good), red when rising (bad)
  // For sell alerts: green when price is rising (good), red when falling (bad)
  if (alertType === 'buy') {
    return changePercent < 0 ? 'text-green-400' : 'text-red-400'
  } else {
    return changePercent >= 0 ? 'text-green-400' : 'text-red-400'
  }
}

function getTypeLabel(type: 'buy' | 'sell'): string {
  return type === 'buy' ? '💰 ' + translate('priceAlertBuy') : '📈 ' + translate('priceAlertSell')
}

function getRowClass(alert: PriceAlert): string {
  const currentPrice = getCurrentPrice(alert.materialId)

  // Buy alert: highlight green if current <= target
  if (alert.type === 'buy' && currentPrice <= alert.targetPrice) {
    return 'bg-green-900/30 border-green-700'
  }

  // Sell alert: highlight orange if current >= target
  if (alert.type === 'sell' && currentPrice >= alert.targetPrice) {
    return 'bg-orange-900/30 border-orange-700'
  }

  return 'border-slate-700 hover:bg-slate-700/50'
}

// Stats
const stats = computed(() => {
  const active = alerts.value.filter(a => a.status === 'active').length
  const triggered = alerts.value.filter(a => a.status === 'triggered').length
  const muted = alerts.value.filter(a => a.status === 'muted').length
  return { active, triggered, muted, total: alerts.value.length }
})

// Material search/selection
const selectedMaterialId = ref<number | null>(null)

const matchingMaterials = computed(() => {
  const search = searchTerm.value.trim().toLowerCase()
  if (!search) return []

  // Find all matching materials
  return props.gameData.materials.filter(mat =>
    mat.name.toLowerCase().includes(search) ||
    mat.id.toString() === search
  ).slice(0, 20) // Limit to 20 results
})

const hasExactMatch = computed(() => {
  const search = searchTerm.value.trim().toLowerCase()
  return matchingMaterials.value.some(mat => mat.name.toLowerCase() === search)
})

function createAlertForSearch() {
  if (selectedMaterialId.value === null) return
  openEditOverlay(selectedMaterialId.value)
  selectedMaterialId.value = null
}

// Auto-select if only one match or exact match
watch([matchingMaterials, hasExactMatch], () => {
  if (matchingMaterials.value.length === 1) {
    const firstMatch = matchingMaterials.value[0]
    if (firstMatch) {
      selectedMaterialId.value = firstMatch.id
    }
  } else if (hasExactMatch.value) {
    const exactMatch = matchingMaterials.value.find(mat =>
      mat.name.toLowerCase() === searchTerm.value.trim().toLowerCase()
    )
    if (exactMatch) {
      selectedMaterialId.value = exactMatch.id
    }
  } else if (matchingMaterials.value.length === 0) {
    selectedMaterialId.value = null
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-purple-400">🔔 {{ translate('priceAlertsTitle') }}</h1>
        <p class="text-sm text-gray-400 mt-1">
          {{ translate('priceAlertsDescription') }}
        </p>
      </div>
      <div class="flex items-center gap-4">
        <button
          v-if="notificationPermission !== 'granted'"
          @click="handleRequestPermission"
          class="px-3 py-1 text-xs bg-yellow-700 hover:bg-yellow-600 rounded transition flex items-center gap-1"
          :title="notificationPermission === 'denied' ? 'Notifications blocked by browser' : 'Enable browser notifications'"
        >
          🔔 {{ notificationPermission === 'denied' ? 'Blocked' : 'Enable Notifications' }}
        </button>
        <div class="text-xs text-gray-400">
          Next refresh: <span class="text-white">{{ refreshCountdown }}</span>
        </div>
        <button
          @click="refreshPrices()"
          :disabled="priceLoading"
          class="px-3 py-1 text-xs bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded transition"
        >
          {{ priceLoading ? '...' : '↻ Refresh' }}
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-gray-400 uppercase font-semibold">Total</div>
        <div class="text-2xl font-bold text-gray-300">{{ stats.total }}</div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-blue-400 uppercase font-semibold">Active</div>
        <div class="text-2xl font-bold text-blue-400">{{ stats.active }}</div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-green-400 uppercase font-semibold">Triggered</div>
        <div class="text-2xl font-bold text-green-400">{{ stats.triggered }}</div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-gray-500 uppercase font-semibold">Muted</div>
        <div class="text-2xl font-bold text-gray-500">{{ stats.muted }}</div>
      </div>
    </div>

    <!-- Search & Create -->
    <div class="bg-gray-800 rounded p-4">
      <label class="block text-sm font-medium text-gray-300 mb-2">
        Search Material
      </label>
      <div class="flex gap-2">
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Search materials..."
          class="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <select
          v-if="matchingMaterials.length > 1"
          v-model="selectedMaterialId"
          class="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[200px]"
        >
          <option :value="null" disabled>Select material...</option>
          <option
            v-for="material in matchingMaterials"
            :key="material.id"
            :value="material.id"
          >
            {{ materialName(material.id) }}
          </option>
        </select>
        <button
          @click="createAlertForSearch"
          :disabled="selectedMaterialId === null"
          :title="selectedMaterialId ? `Create alert for ${materialName(selectedMaterialId)}` : 'Search and select a material'"
          class="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded transition whitespace-nowrap"
        >
          🔔 Create Alert
        </button>
      </div>
      <div v-if="searchTerm" class="mt-2 text-xs">
        <span v-if="matchingMaterials.length === 0" class="text-yellow-400">
          No materials found
        </span>
        <span v-else-if="matchingMaterials.length === 1 && matchingMaterials[0]" class="text-green-400">
          ✓ Found: {{ matchingMaterials[0].name }}
        </span>
        <span v-else class="text-blue-400">
          Found {{ matchingMaterials.length }} materials - select one
        </span>
        <span class="ml-2 text-gray-400">
          · Showing {{ filteredAlerts.length }} of {{ alerts.length }} alerts
        </span>
      </div>
    </div>

    <!-- Alerts Table -->
    <div v-if="filteredAlerts.length > 0" class="bg-gray-800 rounded overflow-visible">
      <div class="overflow-x-hidden max-h-[max(300px,calc(100vh-450px))] overflow-y-auto rounded">
        <table class="table-fixed w-full text-sm">
          <thead class="bg-gray-700 sticky top-0 z-20">
            <tr>
              <th
                class="w-[35%] px-3 py-2 text-left text-[11px] font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition"
                @click="toggleSort('material')"
              >
                Material{{ getSortIndicator('material') }}
              </th>
              <th
                class="w-[12%] px-3 py-2 text-center text-[11px] font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition"
                @click="toggleSort('type')"
              >
                Type{{ getSortIndicator('type') }}
              </th>
              <th
                class="w-[15%] px-3 py-2 text-right text-[11px] font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition"
                @click="toggleSort('price')"
              >
                Target Price{{ getSortIndicator('price') }}
              </th>
              <th class="w-[13%] px-3 py-2 text-right text-[11px] font-medium text-gray-300 uppercase tracking-wider">
                Current Price
              </th>
              <th
                class="w-[12%] px-3 py-2 text-center text-[11px] font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition"
                @click="toggleSort('status')"
              >
                Status{{ getSortIndicator('status') }}
              </th>
              <th class="w-[13%] px-3 py-2 text-center text-[11px] font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr
              v-for="alert in filteredAlerts"
              :key="alert.id"
              :class="['border-b transition', editingAlertId === alert.id ? 'bg-gray-700' : 'cursor-pointer hover:bg-slate-700/50', getRowClass(alert)]"
              @click="editingAlertId !== alert.id ? openEditOverlay(alert.materialId) : null"
            >
              <!-- Material -->
              <td class="px-3 py-2">
                <div class="flex items-center gap-2 min-w-0">
                  <a
                    :href="`https://${getWorld()}.galactictycoons.com/exchange/${alert.materialId}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:opacity-80 transition"
                    @click.stop
                    title="Open in Exchange"
                  >
                    <MaterialIcon :name="alert.materialName" variant="sm" />
                  </a>
                  <div class="flex flex-col min-w-0">
                    <a
                      :href="`https://${getWorld()}.galactictycoons.com/exchange/${alert.materialId}`"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-white hover:text-purple-400 transition truncate underline decoration-dotted"
                      :title="alert.materialName"
                      @click.stop
                    >
                      {{ alert.materialName }}
                    </a>
                    <span v-if="alert.autoCreated" class="text-[10px] text-yellow-500">
                      Auto-created
                    </span>
                  </div>
                </div>
              </td>

              <!-- Type -->
              <td class="px-3 py-2 text-center whitespace-nowrap">
                <div v-if="editingAlertId === alert.id" @click.stop>
                  <select
                    v-model="editingType"
                    class="px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="buy">💰 {{ translate('priceAlertBuy') }}</option>
                    <option value="sell">📈 {{ translate('priceAlertSell') }}</option>
                  </select>
                </div>
                <button
                  v-else
                  @click="startInlineEdit(alert, $event)"
                  class="text-sm hover:text-purple-400 transition"
                >
                  {{ getTypeLabel(alert.type) }}
                </button>
              </td>

              <!-- Target Price -->
              <td class="px-3 py-2 text-right whitespace-nowrap">
                <div v-if="editingAlertId === alert.id" @click.stop class="flex justify-end gap-1">
                  <input
                    v-model.number="editingTargetPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-24 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white text-right font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                    @keyup.enter="saveInlineEdit(alert)"
                    @keyup.esc="cancelInlineEdit"
                  />
                  <button
                    @click="saveInlineEdit(alert)"
                    class="px-2 py-1 text-xs bg-green-700 hover:bg-green-600 rounded transition"
                    title="Save"
                  >
                    ✓
                  </button>
                  <button
                    @click="cancelInlineEdit"
                    class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
                <button
                  v-else
                  @click="startInlineEdit(alert, $event)"
                  class="text-white font-mono font-semibold hover:text-purple-400 transition text-right w-full"
                >
                  {{ formatPrice(alert.targetPrice) }}
                </button>
              </td>

              <!-- Current Price with Trend -->
              <td class="px-3 py-2 text-right whitespace-nowrap">
                <div class="flex flex-col items-end gap-0.5">
                  <span class="text-white font-mono font-semibold text-sm">
                    {{ formatPrice(getCurrentPrice(alert.materialId)) }}
                  </span>
                  <span
                    v-if="getPriceTrend(alert.materialId)"
                    class="text-[11px] font-mono font-semibold"
                    :class="getTrendColor(getPriceTrend(alert.materialId)!.changePercent, alert.type)"
                  >
                    {{ getPriceTrend(alert.materialId)!.changePercent >= 0 ? '+' : '' }}{{ formatPercent(getPriceTrend(alert.materialId)!.changePercent) }} {{ getPriceTrend(alert.materialId)!.period }}
                  </span>
                  <span v-else class="text-[11px] text-gray-500">
                    —
                  </span>
                </div>
              </td>

              <!-- Status -->
              <td class="px-3 py-2 text-center whitespace-nowrap">
                <span
                  class="inline-block px-2 py-0.5 rounded text-[11px] font-medium uppercase"
                  :class="getStatusColor(alert.status)"
                >
                  {{ getStatusLabel(alert.status) }}
                </span>
              </td>

              <!-- Actions -->
              <td class="px-3 py-2">
                <div class="flex items-center justify-center gap-1">
                  <!-- Mute/Unmute -->
                  <button
                    @click.stop="toggleMute(alert.id)"
                    :title="alert.status === 'muted' ? 'Unmute' : 'Mute'"
                    class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition"
                  >
                    {{ alert.status === 'muted' ? '🔊' : '🔇' }}
                  </button>

                  <!-- Reset (if triggered) -->
                  <button
                    v-if="alert.status === 'triggered'"
                    @click.stop="resetAlert(alert.id)"
                    title="Reset"
                    class="px-2 py-1 text-xs bg-blue-700 hover:bg-blue-600 rounded transition"
                  >
                    ↻
                  </button>

                  <!-- Delete -->
                  <button
                    @click.stop="removeAlert(alert.id)"
                    title="Delete"
                    class="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 rounded transition"
                  >
                    ✕
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-gray-800 rounded p-12 text-center">
      <div class="text-4xl mb-4">🔔</div>
      <div class="text-lg text-gray-400">No price alerts yet</div>
      <div class="text-sm text-gray-500 mt-2">
        {{ searchTerm ? 'No alerts match your search' : 'Add alerts from the Material Balance in your bases' }}
      </div>
    </div>
  </div>

  <!-- Alert Overlay -->
  <AlertOverlay
    v-if="editMaterialId !== null"
    :open="editOverlayOpen"
    :material-id="editMaterialId"
    :material-name="editMaterialName"
    :current-price="editCurrentPrice"
    :average-price="editAveragePrice"
    @close="closeEditOverlay"
  />
</template>

<style scoped>
.hover\:bg-gray-750:hover {
  background-color: rgb(31 36 44);
}
</style>
