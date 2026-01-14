<template>
  <div class="fixed right-0 top-0 h-screen z-40 flex flex-col items-end pointer-events-none">
    <!-- Toggle Button (always visible) -->
    <button
      @click="togglePanel"
      class="mt-4 mr-4 p-2 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition pointer-events-auto flex items-center gap-2"
      :title="isOpen ? 'Close todo list' : 'Open todo list'"
    >
      <span class="text-xl">{{ isOpen ? '→' : '←' }}</span>
      <span class="text-sm font-semibold text-gray-300">{{ todoSteps.length }}</span>
    </button>

    <!-- Todo Panel (semi-transparent overlay) -->
    <div
      class="mt-4 mr-4 w-96 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg flex flex-col transition-all duration-300 pointer-events-auto overflow-hidden"
      :class="isOpen ? 'opacity-100 translate-x-0 shadow-2xl' : 'opacity-0 translate-x-full pointer-events-none'"
      style="height: calc(100vh - 80px); max-height: calc(100vh - 80px);"
    >
      <!-- Header -->
      <div class="border-b border-gray-700 p-4 flex items-center justify-between flex-shrink-0">
        <h2 class="text-lg font-semibold text-white">
          📋 Production Steps
        </h2>
        <div class="flex items-center gap-1">
          <!-- Undo Button -->
          <button
            @click="undo"
            :disabled="!canUndo"
            class="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Undo last step (Ctrl+Z)"
          >
            <span class="text-lg">↶</span>
          </button>

          <!-- Redo Button -->
          <button
            @click="redo"
            :disabled="!canRedo"
            class="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Redo last step (Ctrl+Shift+Z)"
          >
            <span class="text-lg">↷</span>
          </button>

          <!-- Clear Button -->
          <button
            @click="handleClear"
            :disabled="todoSteps.length === 0"
            class="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Clear all steps"
          >
            <span class="text-lg">🗑️</span>
          </button>
        </div>
      </div>

      <!-- Steps List (scrollable) -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="todoSteps.length === 0" class="p-4 text-center text-gray-400 text-sm">
          <p class="text-lg">📭</p>
          <p>No production steps yet</p>
          <p class="text-xs mt-2 text-gray-500">Your changes will appear here</p>
        </div>

        <div v-else class="space-y-2 p-4">
          <div
            v-for="(step, index) in todoSteps"
            :key="step.id"
            class="bg-gray-800 rounded p-3 border border-gray-700 hover:border-gray-600 transition cursor-default"
          >
            <!-- Step Header -->
            <div class="flex items-start gap-3">
              <div class="text-xs font-semibold text-purple-400 bg-gray-700 rounded px-2 py-1 mt-0.5 flex-shrink-0 min-w-max">
                Step {{ index + 1 }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-300 font-medium break-words">
                  {{ step.description }}
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  {{ formatTime(step.createdAt) }}
                </p>
              </div>
            </div>

            <!-- Changes Detail (collapsible) -->
            <div v-if="step.changes.length > 0" class="mt-2 ml-10">
              <button
                @click="toggleStepDetail(step.id)"
                class="text-xs text-purple-400 hover:text-purple-300 transition font-medium"
              >
                {{ expandedSteps.has(step.id) ? '▼' : '▶' }} Details ({{ step.changes.length }})
              </button>

              <div v-if="expandedSteps.has(step.id)" class="mt-2 space-y-1 text-xs text-gray-400">
                <div v-for="(change, idx) in step.changes" :key="idx" class="pl-3 border-l border-gray-600 pb-1">
                  <p class="font-mono text-gray-500">{{ change.description }}</p>
                  <p v-if="change.details?.from !== undefined && change.details?.to !== undefined" class="text-gray-600 text-xs">
                    <span class="text-yellow-600">{{ change.details.from }}</span> →
                    <span class="text-green-600">{{ change.details.to }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Footer -->
      <div v-if="todoSteps.length > 0" class="border-t border-gray-700 p-3 text-xs text-gray-400 flex-shrink-0">
        <div class="flex justify-between">
          <span>{{ todoSteps.length }} step(s)</span>
          <span v-if="totalChanges > 0">{{ totalChanges }} change(s)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTodoList } from '@/v2/composables/useTodoList'

const { todoSteps, isOpen, canUndo, canRedo, undo, redo, clear, togglePanel } = useTodoList()

const expandedSteps = ref<Set<string>>(new Set())

// Total number of changes
const totalChanges = computed(() => {
  return todoSteps.value.reduce((sum, step) => sum + step.changes.length, 0)
})

// Toggle step detail
function toggleStepDetail(stepId: string): void {
  if (expandedSteps.value.has(stepId)) {
    expandedSteps.value.delete(stepId)
  } else {
    expandedSteps.value.add(stepId)
  }
  expandedSteps.value = new Set(expandedSteps.value)
}

// Handle clear
function handleClear(): void {
  if (confirm('Are you sure you want to clear all production steps?')) {
    clear()
    expandedSteps.value.clear()
  }
}

// Format time
function formatTime(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`

  const date = new Date(timestamp)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const mins = date.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${hours}:${mins}`
}
</script>

<style scoped>
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgb(55, 65, 81);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgb(75, 85, 99);
}
</style>
