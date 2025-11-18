<script setup lang="ts">
import { computed } from 'vue'
import { translate } from '@/v2/localisation'
import {
  TECHNOLOGIES,
  technologyBonusFromLevel,
  type TechnologySpecialisation,
  usePlayerTechnology,
} from '@/v2/services/playerTechnology'

const { state, setLevel, setStartingBonus, reset } = usePlayerTechnology()

const startingBonus = computed({
  get: () => state.value.startingBonus,
  set: (value) => {
    const numeric = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(numeric)) setStartingBonus(numeric)
  },
})

function currentLevel(id: TechnologySpecialisation): number {
  return state.value.levels?.[id] ?? 0
}

function onLevelInput(id: TechnologySpecialisation, event: Event) {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  const value = target.valueAsNumber
  if (Number.isNaN(value)) {
    setLevel(id, 0)
  } else {
    setLevel(id, value)
  }
}

function onReset() {
  reset()
}

function formatBonus(level: number) {
  const multiplier = technologyBonusFromLevel(level)
  const percent = (multiplier - 1) * 100
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(0)}% · ${multiplier.toFixed(2)}×`
}

const startingBonusDisplay = computed(() => {
  const bonus = state.value.startingBonus
  const percent = (bonus - 1) * 100
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(0)}% · ${bonus.toFixed(2)}×`
})
</script>

<template>
  <div class="space-y-6 text-slate-100">
    <div class="rounded border border-slate-700 bg-slate-900 p-4 space-y-3">
      <div class="flex items-start gap-3">
        <div class="flex-1">
          <div class="font-semibold">{{ translate('technologyStartingBonusTitle') }}</div>
          <p class="text-sm text-slate-400">{{ translate('technologyStartingBonusHint') }}</p>
        </div>
        <button
          type="button"
          class="px-3 py-1 border border-slate-600 rounded hover:bg-slate-800 text-sm"
          @click="onReset"
        >
          {{ translate('reset') }}
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-4 text-sm">
        <label class="flex items-center gap-2">
          <span class="text-slate-300">{{ translate('startingBonus') }}</span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            class="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-24"
            v-model.number="startingBonus"
          />
        </label>
        <span class="text-xs text-slate-400">{{ translate('technologyBonusDisplay') }}: {{ startingBonusDisplay }}</span>
      </div>
    </div>

    <div class="space-y-3">
      <h2 class="text-lg font-semibold">{{ translate('technologyHeading') }}</h2>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="tech in TECHNOLOGIES"
          :key="tech.id"
          class="rounded border border-slate-700 bg-slate-900 p-4 space-y-3"
        >
          <div>
            <div class="font-medium">{{ translate(tech.nameKey) }}</div>
            <p class="text-xs text-slate-400 leading-relaxed">{{ translate(tech.descriptionKey) }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-sm">
            <label class="flex items-center gap-2">
              <span class="text-slate-300">{{ translate('technologyLevel') }}</span>
              <input
                :value="currentLevel(tech.id)"
                type="number"
                min="0"
                step="1"
                class="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-20"
                @input="onLevelInput(tech.id, $event)"
              />
            </label>
            <span class="text-xs text-slate-400">
              {{ translate('technologyBonusLabel') }}: {{ formatBonus(currentLevel(tech.id)) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
