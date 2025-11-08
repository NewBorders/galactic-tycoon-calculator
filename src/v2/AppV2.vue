<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { loadGameData } from './services/gamedata/service'
import { translate } from './localisation/localisation'
import LanguageSwitcher from './components/LanguageSwitcher.vue'
import PlayerConfigPanel from './pages/player-config/PlayerConfigPanel.vue'
import TechnologyPanel from './pages/technology/TechnologyPanel.vue'

type Tab = 'bases' | 'technology'
const LS_KEY = 'gt:v2:activeTab'

const active = ref<Tab>('bases')
const gd = ref(null as any)
const gdIndex = ref(null as any)
const gdLoadedAt = ref<number | null>(null)
const loading = ref(false)
const err = ref<string | null>(null)

onMounted(async () => {
  const saved = localStorage.getItem(LS_KEY) as Tab | null
  if (saved === 'bases' || saved === 'technology') active.value = saved

  loading.value = true
  try {
    const { data, index, loadedAt } = await loadGameData()
    gd.value = data
    gdIndex.value = index
    gdLoadedAt.value = loadedAt
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
            :class="active === 'bases' ? 'bg-gray-600' : ''"
            @click="active = 'bases'"
          >
            {{ translate('tabPlayerConfig') }}
          </button>
          <button
            class="px-3 py-2 border rounded"
            :class="active === 'technology' ? 'bg-gray-600' : ''"
            @click="active = 'technology'"
          >
            {{ translate('tabTechnology') }}
          </button>
        </nav>
        <div class="ml-auto">
          <LanguageSwitcher />
        </div>
      </div>

      <p v-if="err" class="text-red-600 text-sm">{{ err }}</p>
      <p v-else-if="loading">…</p>

      <PlayerConfigPanel
        v-if="gd && gdIndex && active === 'bases'"
        :gameData="gd"
        :index="gdIndex"
        :game-data-loaded-at="gdLoadedAt"
      />
      <TechnologyPanel v-if="active === 'technology'" />
    </div>
  </div>
</template>
