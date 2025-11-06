<script setup lang="ts">
import { computed, ref } from 'vue'
import Draggable from 'vuedraggable'
import type { GameData, Worker } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import type { Recipe } from '@/v2/services/gamedata/service'
import { computeBaseReport, productionUnitsFromLevel } from '@/v2/services/production/engine'
import type { RecipeProductionRow } from '@/v2/services/production/types'
import { translate } from '@/v2/localisation/localisation'
import RecipeTile from './RecipeTile.vue'

const TIER_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'T1',
  2: 'T2',
  3: 'T3',
  4: 'T4',
}

const props = defineProps<{
  base: PlayerBase
  gameData: GameData
}>()

const emit = defineEmits<{
  addRecipe: [{ recipeId: number }]
  removeRecipe: [{ id: string }]
  reorderRecipes: [{ ids: string[] }]
}>()

const query = ref('')
const optionalActive = ref<Set<number>>(new Set())

const buildingById = computed(() => new Map(props.gameData.buildings.map((b) => [b.id, b])))
const materialById = computed(() => new Map(props.gameData.materials.map((m) => [m.id, m])))
const recipeById = computed(() => new Map(props.gameData.recipes.map((r) => [r.id, r])))
const workerByTier = computed(() => new Map(props.gameData.workers.map((w) => [w.type, w])))

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
    options: { activeOptionalConsumables: optionalActive.value },
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
    { recipe: Recipe; reportRow?: RecipeProductionRow; buildingName: string; units: number }
  >()
  props.base.recipes.forEach((selection) => {
    const recipe = recipeById.value.get(selection.recipeId)
    if (!recipe) return
    const building = buildingById.value.get(recipe.producedInId)
    map.set(selection.id, {
      recipe,
      reportRow: reportByRecipeId.value.get(recipe.id),
      buildingName: building?.name ?? `#${recipe.producedInId}`,
      units: buildingUnits.value.get(recipe.producedInId) ?? 0,
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
  const building = buildingById.value.get(recipe.producedInId)
  if (building?.name?.toLowerCase().includes(target)) return true
  return recipe.inputs.some((input) =>
    materialById.value.get(input.id)?.name?.toLowerCase().includes(target),
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
      const building = buildingById.value.get(recipe.producedInId)
      const units = buildingUnits.value.get(recipe.producedInId) ?? 0
      const workerNeeds = building?.workersNeeded
      return {
        recipe,
        buildingName: building?.name ?? `#${recipe.producedInId}`,
        hasBuilding: units > 0,
        alreadySelected: selectedRecipeIds.value.has(recipe.id),
        units,
        inputs: recipe.inputs.map((i) => ({
          name: materialById.value.get(i.id)?.name ?? `#${i.id}`,
          amount: i.amount,
        })),
        output: {
          name: materialById.value.get(recipe.output.id)?.name ?? recipe.output.name,
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

const summary = computed(() => report.value.summary)
const materials = computed(() => report.value.materials)
const workers = computed(() => report.value.workers)
const workforceSummary = computed(() => report.value.workforceSummary)

const optionalConsumables = computed(() => {
  return [1, 2, 3, 4]
    .map((tier) => {
      const worker = workerByTier.value.get(tier as Worker['type'])
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
  return materialById.value.get(id)?.name ?? `#${id}`
}

function tierLabel(tier: number) {
  return TIER_LABELS[tier as 1 | 2 | 3 | 4] ?? `T${tier}`
}

function toggleOptional(materialId: number) {
  const next = new Set(optionalActive.value)
  if (next.has(materialId)) {
    next.delete(materialId)
  } else {
    next.add(materialId)
  }
  optionalActive.value = next
}

function isOptionalActive(materialId: number) {
  return optionalActive.value.has(materialId)
}

function coverageClass(value: number) {
  if (value >= 0.99) return 'text-emerald-300'
  if (value >= 0.75) return 'text-amber-300'
  return 'text-rose-300'
}
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
                'opacity-50 cursor-not-allowed': !item.hasBuilding || item.alreadySelected,
              }"
              :disabled="!item.hasBuilding || item.alreadySelected"
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
                {{ translate('activeUnits') }}: {{ formatNumber(item.units, 0) }}
              </div>
              <div v-if="!item.hasBuilding" class="text-xs text-red-400">
                {{ translate('requiresBuilding') }} {{ item.buildingName }}
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
              :material-lookup="materialById"
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
        <div class="font-semibold">{{ translate('dailySummary') }}</div>
        <div class="text-sm text-slate-300 flex flex-col gap-1">
          <div>
            {{ translate('totalRevenue') }}:
            <span class="text-green-300">{{ formatNumber(summary.revenue) }}</span>
          </div>
          <div>
            {{ translate('totalCosts') }}:
            <span class="text-red-300">{{ formatNumber(summary.costs) }}</span>
          </div>
          <div>
            {{ translate('netResult') }}:
            <span :class="summary.net >= 0 ? 'text-emerald-300' : 'text-rose-300'">
              {{ formatNumber(summary.net) }}
            </span>
          </div>
          <div class="text-xs text-slate-500">
            {{ translate('adminCost') }}: {{ formatNumber(report.adminCostPerDay) }}
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
        <template v-if="workers.length">
          <table class="w-full text-sm">
            <thead class="text-slate-400 text-xs uppercase">
              <tr>
                <th class="text-left pb-1">Tier</th>
                <th class="text-left pb-1">{{ translate('material') }}</th>
                <th class="text-right pb-1">{{ translate('perDay') }}</th>
                <th class="text-right pb-1">{{ translate('totalCosts') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in workers"
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
                <td class="py-1 text-right">{{ formatNumber(row.costPerDay) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
        <div v-else class="text-sm text-slate-400">—</div>
      </div>

      <div class="rounded border border-slate-700 bg-slate-900 p-4 space-y-3">
        <div class="font-semibold">{{ translate('materialBalance') }}</div>
        <template v-if="materials.length">
          <table class="w-full text-sm">
            <thead class="text-slate-400 text-xs uppercase">
              <tr>
                <th class="text-left pb-1">{{ translate('material') }}</th>
                <th class="text-right pb-1">{{ translate('perDay') }}</th>
                <th class="text-right pb-1">{{ translate('netResult') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in materials" :key="row.materialId" class="border-t border-slate-800/60">
                <td class="py-1">{{ materialName(row.materialId) }}</td>
                <td
                  class="py-1 text-right"
                  :class="row.balancePerDay >= 0 ? 'text-emerald-300' : 'text-rose-300'"
                >
                  {{ formatNumber(row.balancePerDay) }}
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
