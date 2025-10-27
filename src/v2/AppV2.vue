<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { type GameData, loadGameData } from './services/gameDataApi'
import { getCategoryByType } from './constants/materialCategories'
import { BuildingSpecialization } from './constants/buildingSpecialization'
import { translate } from './localisation/localisation'
import LanguageSwitcher from './components/LanguageSwitcher.vue'
import RecipeSearch from './components/RecipeSearch.vue'

const gameData = ref<GameData | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const source = ref<'api' | 'fallback' | 'cache' | null>(null)
const lastUpdate = ref<number | null>(null)

async function refresh(force = false) {
  loading.value = true
  error.value = null
  try {
    const res = await loadGameData({ force })
    gameData.value = res.data
    source.value = res.source
    lastUpdate.value = Date.now()
  } catch (e: any) {
    error.value = e?.message ?? 'Unknown error'
  } finally {
    loading.value = false
  }
}

const materialsEnriched = computed(() =>
  (gameData.value?.materials ?? []).map((m) => ({
    ...m,
    category: getCategoryByType(m.type ?? 0),
  })),
)
const buildingsEnriched = computed(() =>
  (gameData.value?.buildings ?? []).map((b) => ({
    ...b,
    specializationName: BuildingSpecialization[b.specialization as number] ?? 'Unknown',
  })),
)

onMounted(() => refresh(false))
</script>

<template>
  <div class="p-4 space-y-3">
    <div class="flex items-center gap-2">
      <button
        class="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        :disabled="loading"
        @click="refresh(true)"
      >
        {{ translate('fetchFromApi') }}
      </button>

      <LanguageSwitcher />

      <span v-if="lastUpdate" class="text-sm text-slate-500">
        {{ translate('lastUpdate') }}: {{ new Date(lastUpdate).toLocaleString() }}
      </span>
      <span v-if="source" class="text-sm text-slate-500"
        >· {{ translate('source') }}: {{ source }}</span
      >
    </div>

    <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>

    <!-- v1 translator tool -->
    <section class="mt-4">
      <h2 class="text-lg font-semibold">Recipe search</h2>
      <RecipeSearch :gameData="gameData" />
    </section>

    <section>
      <h2 class="text-lg font-semibold">{{ translate('materials') }}</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        <div v-for="m in materialsEnriched" :key="m.id" class="p-3 border rounded">
          <div class="flex items-center gap-2">
            <span>{{ m.category.symbol }}</span>
            <span class="font-medium">{{ m.name }}</span>
            <span :class="m.category.color" class="ml-auto text-sm">{{ m.category.name }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
