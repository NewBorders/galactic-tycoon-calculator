<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Draggable from 'vuedraggable'
import type { GameData, GdIndex } from '@/v2/services/gamedata/types'
import type { PlayerBase } from '@/v2/services/playerBases'
import type { Recipe } from '@/v2/services/gamedata/service'
import { computeBaseReport, productionUnitsFromLevel } from '@/v2/services/production/engine'
import { evaluateRecipeAvailability } from '@/v2/services/production/availability'
import type { RecipeProductionRow } from '@/v2/services/production/types'
import { translate } from '@/v2/localisation/localisation'
import RecipeTile from './RecipeTile.vue'

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
}>()

const query = ref('')
const optionalActive = ref<Set<number>>(new Set())

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

watch(
  () => props.base.optionalConsumables,
  (list) => {
    optionalActive.value = new Set((list ?? []).filter((id): id is number => typeof id === 'number'))
  },
  { immediate: true },
)

</script>

<template>
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

    <div v-if="hasRecipes">
      <Draggable
        v-model="list"
        item-key="id"
        handle=".recipe-dnd-handle"
        class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        <template #item="{ element }">
          <div class="h-full">
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
          </div>
        </template>
      </Draggable>
    </div>
    <div v-else class="text-sm text-slate-400">
      {{ translate('noRecipesConfigured') }}
    </div>
  </div>
</template>
