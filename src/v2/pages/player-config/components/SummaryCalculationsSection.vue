<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { formatNumber, formatPrice } from '@/v2/utils/formatNumber'
import type { GameData, GdIndex, Worker } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import { computeBaseReport } from '@/v2/services/production/engine'
import { translate } from '@/v2/localisation'

const props = defineProps<{
  base: PlayerBase
  gameData: GameData
  index: GdIndex
  priceResolver: (materialId: number) => number
  technologyLevels: Partial<Record<number, number>>
  startingBonus: number
  timeframeHours: number
}>()

const emit = defineEmits<{
  updateOptional: [number[]]
  updateStock: [Record<number, number>]
}>()

const optionalActive = ref<Set<number>>(new Set())

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
  Object.entries(props.base.stock ?? {}).forEach(([key, value]) => {
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
    count: typeof r.count === 'number' && Number.isFinite(r.count) ? Math.max(1, Math.floor(r.count)) : 1,
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
    },
  }),
)

const materialRows = computed(() =>
  report.value.materials.map((row) => {
    const stock = stockByMaterialId.value.get(row.materialId) ?? 0
    const daysCoverage = row.balancePerDay < 0 ? (stock > 0 ? stock / -row.balancePerDay : 0) : null
    const balancePerPeriod = row.balancePerDay * periodFactor.value
    const valuePerPeriod = row.valuePerDay * periodFactor.value
    const toBuy = row.balancePerDay < 0 ? Math.max(0, -balancePerPeriod - stock) : 0
    return { ...row, stock, daysCoverage, balancePerPeriod, valuePerPeriod, toBuy }
  }),
)

const workerRows = computed(() => {
  const rows = report.value.workers.slice()
  rows.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    if (a.optional !== b.optional) return a.optional ? 1 : -1
    return a.materialId - b.materialId
  })
  return rows
})

const workforceSummary = computed(() => report.value.workforceSummary)

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

function materialName(id: number) {
  return props.index.materialById.get(id)?.name ?? `#${id}`
}

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

function coverageClass(value: number) {
  if (value >= 0.99) return 'text-emerald-300'
  if (value >= 0.75) return 'text-amber-300'
  return 'text-rose-300'
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

onBeforeUnmount(() => {
  // Cleanup if needed
})
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-2">
    <!-- Materials Balance (left column, full height) -->
    <div class="rounded border border-slate-700 bg-slate-900 p-4 space-y-3 lg:row-span-2">
      <div class="font-semibold">{{ translate('materialBalance') }}</div>
      <template v-if="materialRows.length">
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
            <tr v-for="row in materialRows" :key="row.materialId" class="border-t border-slate-800/60">
              <td class="py-1">
                <a v-bind:href="'https://g2.galactictycoons.com/exchange/'+ row.materialId" target="_blank" class="underline">
                {{ materialName(row.materialId) }}
              </a>
              </td>
              <td
                class="py-1 text-right"
                :class="row.balancePerDay >= 0 ? 'text-emerald-300' : 'text-rose-300'"
              >
                {{ formatNumber(row.balancePerPeriod) }}
              </td>
              <td class="py-1 text-right">{{ formatPrice(row.unitPrice,2) }}</td>
              <td class="py-1 text-right">
                {{ row.toBuy > 0 ? formatNumber(row.toBuy,0,true) : '—' }}
              </td>
              <td
                class="py-1 text-right"
                :class="row.toBuy > 0 ? 'text-rose-300' : 'text-emerald-300'"
              >
                {{ row.balancePerDay < 0 ? formatCoverage(row.daysCoverage ?? null) : '—' }}
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
      </template>
      <div v-else class="text-sm text-slate-400">—</div>
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
              <span class="text-slate-300">
                {{ materialName(opt.materialId) }} ({{ formatNumber(opt.amount) }})
              </span>
            </label>
          </div>
        </div>
      </div>
      <template v-if="workerDisplayRows.length">
        <table class="w-full text-sm">
          <thead class="text-slate-400 text-xs uppercase">
            <tr>
              <th class="text-left pb-1">Tier</th>
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
              <td class="py-1 text-slate-400">{{ tierLabel(row.tier) }}</td>
              <td class="py-1">
                {{ materialName(row.materialId) }}
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

    <!-- Workforce Coverage (right column, bottom) -->
    <div class="rounded border border-slate-700 bg-slate-900 p-4 space-y-2">
      <div class="font-semibold">{{ translate('workforceOverview') }}</div>
      <template v-if="workforceSummary.some((row) => row.required > 0)">
        <table class="w-full text-sm">
          <thead class="text-slate-400 text-xs uppercase">
            <tr>
              <th class="text-left pb-1">Tier</th>
              <th class="text-right pb-1">{{ translate('requiredWorkers') }}</th>
              <th class="text-right pb-1">{{ translate('housingCapacity') }}</th>
              <th class="text-right pb-1">{{ translate('coverage') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in workforceSummary" :key="row.tier" class="border-t border-slate-800/60">
              <td class="py-1 text-slate-400">{{ tierLabel(row.tier) }}</td>
              <td class="py-1 text-right">{{ formatNumber(row.required, 0) }}</td>
              <td class="py-1 text-right">{{ formatNumber(row.housing, 0) }}</td>
              <td class="py-1 text-right" :class="coverageClass(row.coverage)">
                {{ formatShare(row.coverage * 100) }}
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <div v-else class="text-sm text-slate-400">—</div>
    </div>
  </div>
</template>
