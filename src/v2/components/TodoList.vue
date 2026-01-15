<template>
  <div class="fixed right-0 top-0 h-screen z-40 flex flex-col items-end pointer-events-none">
    <!-- Toggle Button (always visible) -->
    <button
      @click="togglePanel"
      class="mt-4 mr-4 p-2 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition pointer-events-auto flex items-center gap-2"
      :title="isOpen ? 'Close todo list' : 'Open todo list'"
    >
      <span class="text-xl">{{ isOpen ? '→' : '←' }}</span>
      <span class="text-sm font-semibold text-gray-300">{{ allSteps.length }}</span>
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
          📋 Production Plan
        </h2>
        <div class="flex items-center gap-1">
          <!-- Undo Button -->
          <button
            @click="undo"
            :disabled="!canUndo"
            class="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Undo last change (Ctrl+Z)"
          >
            <span class="text-lg">↶</span>
          </button>

          <!-- Redo Button -->
          <button
            @click="redo"
            :disabled="!canRedo"
            class="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Redo last change (Ctrl+Shift+Z)"
          >
            <span class="text-lg">↷</span>
          </button>

          <!-- Clear Button -->
          <button
            @click="handleClear"
            :disabled="allSteps.length === 0"
            class="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Clear all steps"
          >
            <span class="text-lg">🗑️</span>
          </button>
        </div>
      </div>

      <!-- Todo Groups (scrollable) -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="allSteps.length === 0" class="p-4 text-center text-gray-400 text-sm">
          <p class="text-lg">📭</p>
          <p>No changes planned yet</p>
          <p class="text-xs mt-2 text-gray-500">Start planning your production</p>
        </div>

        <div v-else class="space-y-3 p-4">
          <!-- Global Group -->
          <div v-for="group in displayGroups" :key="group.baseName || 'global'" class="space-y-2">
            <!-- Group Header -->
            <div v-if="group.steps.length > 0" class="text-xs font-semibold uppercase text-purple-400 px-1">
              <span v-if="group.scope === 'global'">🌍 Global Changes</span>
              <span v-else>🏗️ {{ group.baseName }}</span>
            </div>

            <!-- Steps in Group -->
            <div v-for="(step, stepIndex) in group.steps" :key="step.id" class="bg-gray-800 rounded p-3 border border-gray-700 hover:border-gray-600 transition cursor-default">
              <!-- Step Header -->
              <div class="flex items-start gap-3">
                <div class="text-xs font-semibold text-green-400 bg-gray-700 rounded px-2 py-1 mt-0.5 flex-shrink-0 min-w-max">
                  {{ getStepNumber(group, stepIndex) }}
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
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Footer -->
      <div v-if="allSteps.length > 0" class="border-t border-gray-700 p-3 text-xs text-gray-400 flex-shrink-0">
        <div class="flex justify-between">
          <span>{{ allSteps.length }} change(s)</span>
          <span v-if="displayGroups.length > 0">{{ displayGroups.length }} scope(s)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTodoList, type TodoGroup, type TodoStep } from '@/v2/services/todoListService'

const { displayGroups, allSteps, isOpen, canUndo, canRedo, undo, redo, clear, togglePanel } = useTodoList()

// Get global step number
function getStepNumber(group: TodoGroup, stepIndex: number): string {
  const globalIndex = allSteps.value.findIndex((step: TodoStep) => step === group.steps[stepIndex])
  return `${globalIndex + 1}`
}

// Handle clear
function handleClear(): void {
  if (confirm('Are you sure you want to clear all planned changes?')) {
    clear()
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
