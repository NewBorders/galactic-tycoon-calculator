<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { Planet } from '@/v2/services/gamedata/types.ts'
import { translate } from '@/v2/localisation/localisation.ts'

type PlayerBuilding = { buildingId: number; level: number; count: number }
type PlayerBase = { id: string; planetId: number; name?: string; buildings: PlayerBuilding[] }

const props = defineProps<{
  base: PlayerBase
  planet?: Planet
}>()
const emit = defineEmits<{
  rename:[name: string],
  remove:[],
}>()

const editing = ref(false)
const buf = ref(props.base.name || 'Base')
const inputRef = ref<HTMLInputElement | null>(null)

function startEdit() {
  editing.value = true
  buf.value = props.base.name || 'Base'
  nextTick(() => inputRef.value?.focus())
}
function saveEdit() {
  const val = (buf.value || 'Base').slice(0, 20)
  emit('rename', val)
  editing.value = false
}
function cancelEdit() {
  editing.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); saveEdit() }
  else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
}
</script>

<template>
  <details class="border border-slate-700 rounded bg-slate-800">
    <summary class="flex flex-col gap-1 px-3 py-2 cursor-pointer">
      <div class="flex items-center gap-2">
        <!-- Drag Handle -->
        <span class="dnd-handle cursor-move px-2 py-1 border border-slate-700 rounded select-none"
          >↕</span
        >

        <!-- Name + Edit-Controls -->
        <div class="flex items-center gap-2 min-w-0">
          <!-- Name -->
          <template v-if="editing">
            <input
              ref="inputRef"
              class="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-56"
              v-model="buf"
              maxlength="20"
              @click.stop
              @keydown="onKey"
            />
            <!-- Save -->
            <button
              class="px-2 py-1 border border-green-700 text-green-300 rounded hover:bg-green-900/30"
              @click.stop="saveEdit"
              :title="translate('save')"
            >
              <!-- Check Icon -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M20 6L9 17l-5-5"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            <!-- Cancel -->
            <button
              class="px-2 py-1 border border-red-700 text-red-300 rounded hover:bg-red-900/30"
              @click.stop="cancelEdit"
              :title="translate('cancel')"
            >
              <!-- X Icon -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </template>
          <template v-else>
            <span class="px-2 py-1 bg-slate-900 border border-slate-700 rounded max-w-56 truncate">
              {{ props.base.name || 'Base' }}
            </span>
            <button
              class="px-2 py-1 border border-slate-700 rounded hover:bg-slate-700"
              @click.stop="startEdit"
              :title="translate('editName')"
            >
              <!-- Pencil Icon -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path d="M12 20h9" stroke-width="2" stroke-linecap="round" />
                <path
                  d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </template>
        </div>

        <!-- Delete Base -->
        <button
          class="ml-auto px-2 py-1 border border-slate-700 rounded hover:bg-slate-700"
          @click.stop="emit('remove')"
        >
          {{ translate('delete') }}
        </button>
      </div>

      <!-- planet / base infos -->
      <div class="text-sm text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
        <span class="whitespace-nowrap font-bold">
          {{ planet?.name ?? base.planetId }}
        </span>
        <span class="whitespace-nowrap"
          >• Tier {{ planet?.tier ?? '-' }}</span
        >
        <span class="whitespace-nowrap">
          <span class="font-bold">• Mats:&nbsp;</span>
          <span
            v-for="(material, i) in (planet?.materials ?? [])"
            :key="material.id"
            class="text-slate-500"
          >
            {{ material.name }} ({{ material.abundanceRating }}%)
            <span v-if="i < ((planet?.materials.length ?? 0) - 1)">, </span>
          </span>
        </span>
        <span class="whitespace-nowrap"
          >• Fertility: {{ planet?.fertility ?? '0' }}</span
        >
      </div>
    </summary>

    <!-- buildings - upcoming -->
    <div class="px-3 pb-3">
      <div class="mt-2 p-3 border border-slate-700 rounded bg-slate-900 text-slate-400 text-sm">
        {{ translate('recipesConfigPlaceholder') }}
      </div>
    </div>
  </details>
</template>
