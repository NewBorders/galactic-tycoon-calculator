<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GameData } from '../../services/gamedata/service.ts'
import { searchRecipes } from './recipeTranslator.ts'

const props = defineProps<{ gameData: GameData | null }>()
const searchText = ref('')

const results = computed(() => {
  if (!props.gameData || !searchText.value.trim()) return []
  return searchRecipes(props.gameData, searchText.value)
})
</script>

<template>
  <div class="space-y-2">
    <input
      v-model="searchText"
      type="text"
      placeholder="Iron"
      class="border rounded px-3 py-2 w-full bg-slate-800"
    />

    <div v-if="!results.length && searchText" class="text-sm text-slate-500">materials: 0</div>

    <div v-for="r in results" :key="r.uniqueKey" class="rounded border p-3">
      <div class="font-semibold text-sm mb-2">{{ r.v2.output.name }}</div>

      <!-- Two-column layout -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div class="text-xs font-semibold mb-1">v2 Recipe</div>
          <pre class="text-xs bg-slate-900 text-slate-100 p-3 rounded overflow-auto max-h-96"
            >{{ JSON.stringify(r.v2, null, 2) }}
          </pre>
        </div>
        <div>
          <div class="text-xs font-semibold mb-1">translated for v1</div>
          <pre class="text-xs bg-slate-900 text-slate-100 p-3 rounded overflow-auto max-h-96"
            >{{ JSON.stringify(r.v1, null, 2) }}
          </pre>
        </div>
      </div>
    </div>
  </div>
</template>
