<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Draggable from 'vuedraggable'
import type { GameData, GdIndex, Worker } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import type { Recipe } from '@/v2/services/gamedata/service'
import { computeBaseReport, productionUnitsFromLevel } from '@/v2/services/production/engine'
import { evaluateRecipeAvailability } from '@/v2/services/production/availability'
import type { RecipeProductionRow } from '@/v2/services/production/types'
import { translate } from '@/v2/localisation/localisation'
import RecipeTile from './RecipeTile.vue'
import { importStockText } from '@/v2/services/stock/import'

const TIER_LABEL_KEYS: Record<1 | 2 | 3 | 4, string> = {
  1: 'workerTier1',
  2: 'workerTier2',
  3: 'workerTier3',
  4: 'workerTier4',
}

const props = defineProps<{
  base: PlayerBase
  gameData: GameData
  index: GdIndex
  priceResolver: (materialId: number) => number
  technologyLevels: Partial<Record<number, number>>
  startingBonus: number
}>()

const emit = defineEmits<{
  addRecipe: [{ recipeId: number }]
  removeRecipe: [{ id: string }]
  reorderRecipes: [{ ids: string[] }]
  updateOptional: [number[]]
  updateStock: [Record<number, number>]
}>()

const query = ref('')
const optionalActive = ref<Set<number>>(new Set())
const stockImportText = ref('')
const stockImportStatus = ref<{ kind: 'success' | 'error'; message: string } | null>(null)
let stockImportTimeout: ReturnType<typeof setTimeout> | null = null

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

const planet = computed(() => props.index.planetById.get(props.base.planetId))
const buildingUnits = computed(() => {
  const acc = new Map<number, number>()
  props.base.buildings.forEach((b) => {
    const level = Math.max(1, Math.floor(b.level ?? 1))
    const units = productionUnitsFromLevel(level)
    acc.set(b.buildingId, (acc.get(b.buildingId) ?? 0) + units)
  })
  return acc
})

const assignment = computed(() => ({
  planetId: props.base.planetId,
  buildings: props.base.buildings.map((b) => ({
    buildingId: b.buildingId,
    level: b.level,
  })),
  recipes: props.base.recipes.map((r) => ({
    recipeId: r.recipeId,
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

const reportByRecipeId = computed(() =>
  new Map<number, RecipeProductionRow>(report.value.recipes.map((row) => [row.recipeId, row])),
)

const list = computed({
  get: () => props.base.recipes,
  set: (val) => emit('reorderRecipes', { ids: val.map((v) => v.id) }),
})

const hasRecipes = computed(() => props.base.recipes.length > 0)

const cardsById = computed(() => {
  const map = new Map<
    string,
    {
      recipe: Recipe
      reportRow?: RecipeProductionRow
      buildingName: string
      units: number
      technologyLevel: number
      requiredTech: number
    }
  >()
  props.base.recipes.forEach((selection) => {
    const recipe = props.index.recipeById.get(selection.recipeId)
    if (!recipe) return
    const building = props.index.buildingById.get(recipe.producedInId)
    const technologyLevel = building ? technologyLevelMap.value.get(building.specialization) ?? 0 : 0
    const requiredTech = recipe.reqTech ?? 0
    map.set(selection.id, {
      recipe,
      reportRow: reportByRecipeId.value.get(recipe.id),
      buildingName: building?.name ?? `#${recipe.producedInId}`,
      units: buildingUnits.value.get(recipe.producedInId) ?? 0,
      technologyLevel,
      requiredTech,
    })
  })
  return map
})

const selectedRecipeIds = computed(() => new Set(props.base.recipes.map((r) => r.recipeId)))

const openSuggestions = computed(() => query.value.trim().length >= 2)

function recipeMatches(recipe: Recipe, needle: string) {
  const target = needle.toLowerCase()
  if (!target) return false
  if (recipe.output.name.toLowerCase().includes(target)) return true
  const building = props.index.buildingById.get(recipe.producedInId)
  if (building?.name?.toLowerCase().includes(target)) return true
  return recipe.inputs.some((input) =>
    props.index.materialById.get(input.id)?.name?.toLowerCase().includes(target),
  )
}

const suggestions = computed(() => {
  if (!openSuggestions.value) return []
  const text = query.value.trim().toLowerCase()
  if (!text) return []
  return props.gameData.recipes
    .filter((recipe) => recipeMatches(recipe, text))
    .slice(0, 30)
    .map((recipe) => {
      const building = props.index.buildingById.get(recipe.producedInId)
      const units = buildingUnits.value.get(recipe.producedInId) ?? 0
      const workerNeeds = building?.workersNeeded
      const alreadySelected = selectedRecipeIds.value.has(recipe.id)
      const material = props.index.materialById.get(recipe.output.id)
      const availability = evaluateRecipeAvailability({
        planet: planet.value,
        building,
        material,
      })
      const hasBuilding = units > 0
      const technologyLevel = building ? technologyLevelMap.value.get(building.specialization) ?? 0 : 0
      const requiredTech = recipe.reqTech ?? 0
      const technologySatisfied = technologyLevel >= requiredTech
      const availabilityBlocked = availability.blocked
      const blockedReason = !technologySatisfied
        ? 'technology'
        : availabilityBlocked
          ? availability.reason
          : null
      return {
        recipe,
        buildingName: building?.name ?? `#${recipe.producedInId}`,
        hasBuilding,
        abundanceRating: availability.abundanceRating,
        blockedReason,
        alreadySelected,
        disabled: alreadySelected || !hasBuilding || !technologySatisfied || availabilityBlocked,
        units,
        technologyLevel,
        requiredTech,
        technologySatisfied,
        inputs: recipe.inputs.map((i) => ({
          name: props.index.materialById.get(i.id)?.name ?? `#${i.id}`,
          amount: i.amount,
        })),
        output: {
          name: props.index.materialById.get(recipe.output.id)?.name ?? recipe.output.name,
          amount: recipe.output.amount,
        },
        timeMinutes: recipe.timeMinutes,
        workers: workerNeeds
          ? `${workerNeeds.worker}/${workerNeeds.technician}/${workerNeeds.engineer}/${workerNeeds.scientist}`
          : '0/0/0/0',
      }
    })
})

function addRecipe(recipe: Recipe) {
  const buildingId = recipe.producedInId
  const units = buildingUnits.value.get(buildingId) ?? 0
  if (units <= 0) return
  const building = props.index.buildingById.get(buildingId)
  const material = props.index.materialById.get(recipe.output.id)
  const availability = evaluateRecipeAvailability({
    planet: planet.value,
    building,
    material,
  })
  if (availability.blocked) return
  const technologyLevel = building ? technologyLevelMap.value.get(building.specialization) ?? 0 : 0
  if (technologyLevel < (recipe.reqTech ?? 0)) return
  if (selectedRecipeIds.value.has(recipe.id)) return

  emit('addRecipe', { recipeId: recipe.id })
  query.value = ''
}

function removeRecipe(id: string) {
  emit('removeRecipe', { id })
}

function formatNumber(value: number, fractionDigits = 2) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })
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

const summary = computed(() => report.value.summary)
const materialRows = computed(() =>
  report.value.materials.map((row) => {
    const stock = stockByMaterialId.value.get(row.materialId) ?? 0
    const daysCoverage = row.balancePerDay < 0 ? (stock > 0 ? stock / -row.balancePerDay : 0) : null
    return { ...row, stock, daysCoverage }
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
const totalWorkerCosts = computed(() => workerRows.value.reduce((acc, row) => acc + row.costPerDay, 0))

const optionalConsumables = computed(() => {
  return [1, 2, 3, 4]
    .map((tier) => {
      const worker = props.index.workerByType.get(tier as Worker['type'])
      if (!worker) return null
      const options = worker.consumables
        .filter((c) => !c.essential)
        .map((c) => ({ materialId: c.matId, amount: c.amount }))
      if (!options.length) return null
      return { tier: tier as 1 | 2 | 3 | 4, options }
    })
    .filter((entry): entry is { tier: 1 | 2 | 3 | 4; options: Array<{ materialId: number; amount: number }> } =>
      Boolean(entry),
    )
})

function materialName(id: number) {
  return props.index.materialById.get(id)?.name ?? `#${id}`
}

function tierLabel(tier: number) {
  const key = TIER_LABEL_KEYS[tier as 1 | 2 | 3 | 4]
  return key ? translate(key) : `T${tier}`
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

function coverageClass(value: number) {
  if (value >= 0.99) return 'text-emerald-300'
  if (value >= 0.75) return 'text-amber-300'
  return 'text-rose-300'
}

function handleStockImport() {
  const text = stockImportText.value.trim()
  if (!text) {
    stockImportStatus.value = null
    return
  }

  const result = importStockText(text, props.gameData.materials)
  if (result.success) {
    const merged: Record<number, number> = {}
    Object.entries(props.base.stock ?? {}).forEach(([key, value]) => {
      const id = Number(key)
      const amount = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(id) || Number.isNaN(amount) || amount < 0) return
      merged[id] = amount
    })
    Object.entries(result.stock).forEach(([key, value]) => {
      const id = Number(key)
      if (!Number.isFinite(id)) return
      merged[id] = value
    })
    emit('updateStock', merged)
    const parts = [`${translate('stockImportImported')}: ${result.processed}`]
    if (result.missing.length) {
      parts.push(`${translate('stockImportMissing')}: ${result.missing.length}`)
    }
    stockImportStatus.value = { kind: 'success', message: parts.join(' · ') }
  } else {
    stockImportStatus.value = {
      kind: 'error',
      message: result.error === 'empty' ? translate('stockImportNoValid') : translate('stockImportError'),
    }
  }
}

function stockStatusClass(kind: 'success' | 'error') {
  return kind === 'success' ? 'text-emerald-300' : 'text-rose-300'
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
    stockImportStatus.value = null
    stockImportText.value = ''
    if (stockImportTimeout !== null) {
      clearTimeout(stockImportTimeout)
      stockImportTimeout = null
    }
  },
)

watch(stockImportText, (value) => {
  if (stockImportTimeout !== null) {
    clearTimeout(stockImportTimeout)
    stockImportTimeout = null
  }

  if (!value.trim()) {
    stockImportStatus.value = null
    return
  }

  stockImportTimeout = setTimeout(() => {
    handleStockImport()
  }, 300)
})

onBeforeUnmount(() => {
  if (stockImportTimeout !== null) {
    clearTimeout(stockImportTimeout)
  }
})
</script>

<template>
  <div class="grid gap-5 lg:grid-cols-[2fr_1fr]">
    <div class="space-y-4">
      <div class="relative">
        <input
          v-model="query"
          :placeholder="translate('recipeSearch')"
          class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
        />
        <div
          v-if="openSuggestions"
          class="absolute left-0 right-0 mt-1 z-30 rounded border border-slate-700 bg-slate-800 shadow-xl max-h-96 overflow-auto"
        >
          <template v-if="suggestions.length">
            <button
              v-for="item in suggestions"
              :key="item.recipe.id"
              class="w-full text-left p-3 hover:bg-slate-700 flex flex-col gap-1"
              :class="{
                'opacity-50 cursor-not-allowed': item.disabled,
              }"
              :disabled="item.disabled"
              @click="addRecipe(item.recipe)"
            >
              <div class="flex items-center gap-2">
                <div class="font-medium truncate">
                  {{ item.output.amount }} × {{ item.output.name }}
                </div>
                <span class="text-xs text-slate-400">→ {{ item.buildingName }}</span>
                <span v-if="item.alreadySelected" class="text-xs text-amber-300">
                  {{ translate('alreadyAdded') }}
                </span>
              </div>
              <div class="text-xs text-slate-400 flex flex-wrap gap-1">
                <span>{{ translate('inputsPerDay') }}:</span>
                <span class="text-slate-300">
                  {{
                    item.inputs.length
                      ? item.inputs.map((i) => `${i.amount} × ${i.name}`).join(', ')
                      : '—'
                  }}
                </span>
              </div>
              <div class="text-xs text-slate-500">
                {{ translate('cycleTime') }}: {{ item.timeMinutes }} {{ translate('minutes') }} •
                {{ translate('workers') }}: {{ item.workers }}
              </div>
              <div class="text-xs text-slate-500">
                {{ translate('activeModules') }}: {{ formatNumber(item.units, 0) }} •
                {{ translate('planetaryAbundance') }}:
                <span class="text-slate-300">
                  {{
                    item.abundanceRating != null
                      ? `${formatNumber(item.abundanceRating, 0)}%`
                      : '—'
                  }}
                </span>
              </div>
              <div class="text-xs text-slate-500">
                {{ translate('technologyLevel') }}: {{ item.technologyLevel }} / {{ item.requiredTech }}
              </div>
              <div v-if="!item.technologySatisfied" class="text-xs text-amber-300">
                {{ translate('technologyRequirement') }} {{ item.requiredTech }}
              </div>
              <div v-if="!item.hasBuilding" class="text-xs text-red-400">
                {{ translate('requiresBuilding') }} {{ item.buildingName }}
              </div>
              <div v-else-if="item.blockedReason === 'technology'" class="text-xs text-amber-300">
                {{ translate('technologyRequirement') }} {{ item.requiredTech }}
              </div>
              <div v-else-if="item.blockedReason === 'abundance'" class="text-xs text-amber-300">
                {{ translate('requiresAbundance') }}
              </div>
              <div v-else-if="item.blockedReason === 'fertility'" class="text-xs text-amber-300">
                {{ translate('requiresFertility') }}
              </div>
            </button>
          </template>
          <div v-else class="px-3 py-2 text-sm text-slate-400">{{ translate('noResults') }}</div>
        </div>
      </div>

      <div v-if="hasRecipes" class="space-y-3">
        <Draggable
          v-model="list"
          item-key="id"
          handle=".recipe-dnd-handle"
          class="space-y-3"
        >
          <template #item="{ element }">
              <RecipeTile
                v-if="cardsById.get(element.id)"
                :recipe="cardsById.get(element.id)!.recipe"
                :report-row="cardsById.get(element.id)!.reportRow"
                :building-name="cardsById.get(element.id)!.buildingName"
                :units="cardsById.get(element.id)!.units"
                :technology-level="cardsById.get(element.id)!.technologyLevel"
                :required-tech="cardsById.get(element.id)!.requiredTech"
                :material-lookup="props.index.materialById"
                @remove="removeRecipe(element.id)"
              />
          </template>
        </Draggable>
      </div>
      <div v-else class="text-sm text-slate-400">
        {{ translate('noRecipesConfigured') }}
      </div>
    </div>

    <div class="space-y-4">
      <div class="rounded border border-slate-700 bg-slate-900 p-4 space-y-2">
        <div class="font-semibold">{{ translate('stockImportTitle') }}</div>
        <p class="text-xs text-slate-400">{{ translate('stockImportDescription') }}</p>
        <textarea
          v-model="stockImportText"
          class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
          rows="3"
          :placeholder="translate('stockImportPlaceholder')"
        />
        <span
          v-if="stockImportStatus"
          class="block text-xs"
          :class="stockStatusClass(stockImportStatus.kind)"
        >
          {{ stockImportStatus.message }}
        </span>
      </div>

      <div class="rounded border border-slate-700 bg-slate-900 p-4 space-y-2">
        <div class="font-semibold">{{ translate('dailySummary') }}</div>
        <div class="text-sm text-slate-300 flex flex-col gap-1">
          <div>
            {{ translate('productionRevenue') }}:
            <span class="text-green-300">{{ formatNumber(summary.productionRevenue) }}</span>
          </div>
          <div>
            {{ translate('materialPurchaseCosts') }}:
            <span class="text-red-300">{{ formatNumber(summary.materialPurchaseCosts) }}</span>
          </div>
          <div>
            {{ translate('workerPurchaseCosts') }}:
            <span class="text-red-300">{{ formatNumber(summary.workerPurchaseCosts) }}</span>
          </div>
          <div>
            {{ translate('netResult') }}:
            <span :class="summary.net >= 0 ? 'text-emerald-300' : 'text-rose-300'">
              {{ formatNumber(summary.net) }}
            </span>
          </div>
        </div>
      </div>

      <div class="rounded border border-slate-700 bg-slate-900 p-4 space-y-3">
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
                <td class="py-1 text-right">{{ formatNumber(row.required, 1) }}</td>
                <td class="py-1 text-right">{{ formatNumber(row.housing, 1) }}</td>
                <td class="py-1 text-right" :class="coverageClass(row.coverage)">
                  {{ formatShare(row.coverage * 100) }}
                </td>
              </tr>
            </tbody>
          </table>
        </template>
        <div v-else class="text-sm text-slate-400">—</div>
      </div>

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
        <template v-if="workerRows.length">
          <table class="w-full text-sm">
            <thead class="text-slate-400 text-xs uppercase">
              <tr>
                <th class="text-left pb-1">Tier</th>
                <th class="text-left pb-1">{{ translate('material') }}</th>
                <th class="text-right pb-1">{{ translate('perDay') }}</th>
                <th class="text-right pb-1">{{ translate('unitPrice') }}</th>
                <th class="text-right pb-1">{{ translate('totalCosts') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in workerRows"
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
                <td class="py-1 text-right">{{ formatNumber(row.consumptionPerDay) }}</td>
                <td class="py-1 text-right">{{ formatNumber(row.unitPrice, 2) }}</td>
                <td class="py-1 text-right">{{ formatNumber(row.costPerDay) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="text-right text-xs text-slate-400">
            {{ translate('totalWorkerCosts') }}:
            <span class="text-slate-200">{{ formatNumber(totalWorkerCosts) }}</span>
          </div>
        </template>
        <div v-else class="text-sm text-slate-400">—</div>
      </div>

      <div class="rounded border border-slate-700 bg-slate-900 p-4 space-y-3">
        <div class="font-semibold">{{ translate('materialBalance') }}</div>
        <template v-if="materialRows.length">
          <table class="w-full text-sm">
            <thead class="text-slate-400 text-xs uppercase">
              <tr>
                <th class="text-left pb-1">{{ translate('material') }}</th>
                <th class="text-right pb-1">{{ translate('perDay') }}</th>
                <th class="text-right pb-1">{{ translate('unitPrice') }}</th>
                <th class="text-right pb-1">{{ translate('stockCoverage') }}</th>
                <th class="text-right pb-1">{{ translate('netResult') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in materialRows" :key="row.materialId" class="border-t border-slate-800/60">
                <td class="py-1">{{ materialName(row.materialId) }}</td>
                <td
                  class="py-1 text-right"
                  :class="row.balancePerDay >= 0 ? 'text-emerald-300' : 'text-rose-300'"
                >
                  {{ formatNumber(row.balancePerDay) }}
                </td>
                <td class="py-1 text-right">{{ formatNumber(row.unitPrice, 2) }}</td>
                <td class="py-1 text-right">
                  {{ row.balancePerDay < 0 ? formatCoverage(row.daysCoverage ?? null) : '—' }}
                </td>
                <td class="py-1 text-right">{{ formatNumber(row.valuePerDay) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
        <div v-else class="text-sm text-slate-400">—</div>
      </div>
    </div>
  </div>
</template>
