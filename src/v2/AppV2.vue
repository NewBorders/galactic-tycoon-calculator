<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { loadGameData } from './services/gamedata/service'
import { translate } from './localisation/localisation'
import LanguageSwitcher from './components/LanguageSwitcher.vue'
import RecipeTranslatorPanel from './pages/recipe-translator/RecipeTranslatorPanel.vue'
import PlayerConfigPanel from './pages/player-config/PlayerConfigPanel.vue'

type Tab = 'recipes' | 'bases'
const LS_KEY = 'gt:v2:activeTab'

const active = ref<Tab>('recipes')
const gd = ref(null as any)
const loading = ref(false)
const err = ref<string | null>(null)

onMounted(async () => {
  const saved = localStorage.getItem(LS_KEY) as Tab | null
  if (saved === 'recipes' || saved === 'bases') active.value = saved

  loading.value = true
  try {
    const { data } = await loadGameData()
    gd.value = data
  } catch (e: any) {
    err.value = e?.message ?? 'error'
  } finally {
    loading.value = false
  }
})

watch(active, (t) => {
  try { localStorage.setItem(LS_KEY, t) } catch {}
})
</script>


<template>
  <div class="min-h-screen bg-slate-900 text-slate-100">
    <div class="p-4 space-y-4">
      <div class="flex items-center gap-3">
        <nav class="flex gap-2">
          <button
            class="px-3 py-2 border rounded"
            :class="active === 'recipes' ? 'bg-gray-600' : ''"
            @click="active = 'recipes'"
          >
            {{ translate('tabRecipes') }}
          </button>
          <button
            class="px-3 py-2 border rounded"
            :class="active === 'bases' ? 'bg-gray-600' : ''"
            @click="active = 'bases'"
          >
            {{ translate('tabPlayerConfig') }}
          </button>
        </nav>
        <div class="ml-auto">
          <LanguageSwitcher />
        </div>
      </div>

      <p v-if="err" class="text-red-600 text-sm">{{ err }}</p>
      <p v-else-if="loading">…</p>

      <PlayerConfigPanel v-if="gd && active === 'bases'" :gameData="gd" />
      <RecipeTranslatorPanel v-if="gd && active === 'recipes'" :gameData="gd" />
    </div>
  </div>
</template>
