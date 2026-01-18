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
          <!-- Clear All Button -->
          <button
            @click="handleClearAll"
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
          <!-- Groups by scope -->
          <div v-for="group in displayGroups" :key="group.planetId || 'global'" class="space-y-2">
            <!-- Group Header with Undo/Redo buttons -->
            <div v-if="group.steps.length > 0" class="flex items-center justify-between gap-2 px-1">
              <div class="text-xs font-semibold uppercase text-purple-400">
                <span v-if="group.scope === 'global'">🌍 Global Changes</span>
                <span v-else>🏗️ {{ getBaseOrPlanetNameByPlanetId(group.planetId || 0) }}</span>
              </div>
              
              <!-- Per-scope Undo/Redo/Clear buttons -->
              <div class="flex items-center gap-1">
                <!-- Undo -->
                <button
                  @click="handleUndo(group)"
                  :disabled="!canUndoForGroup(group)"
                  class="p-1 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs"
                  :title="`Undo in ${group.scope === 'global' ? 'Global' : 'Planet ' + group.planetId}`"
                >
                  <span class="text-base">↶</span>
                </button>

                <!-- Redo -->
                <button
                  @click="handleRedo(group)"
                  :disabled="!canRedoForGroup(group)"
                  class="p-1 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs"
                  :title="`Redo in ${group.scope === 'global' ? 'Global' : 'Planet ' + group.planetId}`"
                >
                  <span class="text-base">↷</span>
                </button>

                <!-- Clear scope -->
                <button
                  @click="handleClearScope(group)"
                  class="p-1 rounded hover:bg-gray-700 transition text-xs"
                  :title="`Clear ${group.scope === 'global' ? 'Global' : 'Planet ' + group.planetId}`"
                >
                  <span class="text-base">✕</span>
                </button>
              </div>
            </div>

            <!-- Steps in Group -->
            <div v-for="(step, stepIndex) in group.steps" :key="step.id" class="bg-gray-800 rounded p-3 border border-gray-700 hover:border-gray-600 transition cursor-default">
              <!-- Step Header -->
              <div class="flex items-start gap-3">
                <div class="text-xs font-semibold text-green-400 bg-gray-700 rounded px-2 py-1 mt-0.5 flex-shrink-0 min-w-max">
                  {{ getStepNumber(group, stepIndex) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-300 font-medium break-words flex items-center gap-2">
                    <span v-if="getBuildingIndexLabel(step)" class="text-[10px] font-semibold text-blue-300 bg-gray-700/80 rounded px-1.5 py-0.5">
                      {{ getBuildingIndexLabel(step) }}
                    </span>
                    <span>{{ step.description }}</span>
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ formatTime(step.createdAt) }}
                  </p>
                  <div v-if="parseMaterialsCost(step).length > 0" class="mt-1 flex flex-wrap items-center gap-1">
                    <span class="text-[10px] text-slate-400">Cost:</span>
                    <template v-for="(mat, idx) in parseMaterialsCost(step)" :key="idx">
                      <div class="inline-flex items-center gap-0.5 text-[11px] text-slate-300">
                        <MaterialIcon :name="mat.name" variant="xs" />
                        <span>{{ mat.amount }}</span>
                      </div>
                    </template>
                  </div>
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
import { useTodoList, getRegisteredPlayerBases, getBaseOrPlanetNameByPlanetId, type TodoGroup, type TodoStep } from '@/v2/services/todoListService'
import type { PlayerBuilding } from '@/v2/services/playerBases'
import MaterialIcon from '@/v2/components/MaterialIcon.vue'

const { 
  displayGroups, 
  allSteps, 
  isOpen, 
  canUndoForScope, 
  canRedoForScope, 
  undoForScope, 
  redoForScope, 
  clear, 
  clearForScope,
  togglePanel 
} = useTodoList()

// Compute dynamic building index label for a step (based on current base order)
function getBuildingIndexLabel(step: TodoStep): string | null {
  if (!step || !Array.isArray(step.changes) || step.changes.length === 0) return null
  const change = step.changes[0]
  if (!change || change.type !== 'building') return null

  const playerBases = getRegisteredPlayerBases()
  if (!playerBases) return null

  const planetId = change.planetId
  if (planetId == null) return null

  const base = playerBases.state.value.bases.find((b) => b.planetId === planetId)
  if (!base) return null

  const instanceId = (change.details?.buildingInstanceId as string | undefined) || null
  if (!instanceId) return null

  const building = base.buildings.find((bb) => bb.id === instanceId)
  if (!building) return null

  // Display slotId (1-indexed) if available and positive (from game)
  // Negative slotIds are temporary for planned buildings
  const slotId = (building as PlayerBuilding).slotId
  if (slotId != null && slotId >= 0) {
    return `#${slotId + 1}`
  }
  
  // For negative/planned slotIds or undefined, use array index as fallback
  const idx = base.buildings.findIndex((bb) => bb.id === instanceId)
  return idx >= 0 ? `#${idx + 1}` : null
}

// Get global step number
function getStepNumber(group: TodoGroup, stepIndex: number): string {
  const globalIndex = allSteps.value.findIndex((step: TodoStep) => step === group.steps[stepIndex])
  return `${globalIndex + 1}`
}

// Check if can undo for a group
function canUndoForGroup(group: TodoGroup): boolean {
  return canUndoForScope(group.scope, group.planetId)
}

// Check if can redo for a group
function canRedoForGroup(group: TodoGroup): boolean {
  return canRedoForScope(group.scope, group.planetId)
}

// Handle undo for a group
function handleUndo(group: TodoGroup): void {
  undoForScope(group.scope, group.planetId)
}

// Handle redo for a group
function handleRedo(group: TodoGroup): void {
  redoForScope(group.scope, group.planetId)
}

// Handle clear all
function handleClearAll(): void {
  if (confirm('Are you sure you want to clear all planned changes?')) {
    clear()
  }
}

// Handle clear scope
function handleClearScope(group: TodoGroup): void {
  const scopeName = group.scope === 'global' ? 'Global changes' : `Planet ${group.planetId}`
  if (confirm(`Clear all changes in ${scopeName}?`)) {
    clearForScope(group.scope, group.planetId)
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

// Parse materials cost into array for icon rendering
function parseMaterialsCost(step: TodoStep): Array<{ name: string; amount: number }> {
  const change = step?.changes?.[0]
  const raw = typeof change?.details?.['materialsCost'] === 'string' ? String(change.details!['materialsCost']) : ''
  if (!raw) return []
  const result: Array<{ name: string; amount: number }> = []
  const parts = raw.split(',')
  for (const part of parts) {
    const m = /^(\d+)×\s*(.+)$/.exec(part.trim())
    if (!m) continue
    const amt = Number.parseInt(m[1]!, 10)
    if (!Number.isFinite(amt)) continue
    const nm = String(m[2] ?? '').trim()
    if (!nm) continue
    result.push({ amount: amt, name: nm })
  }
  return result
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
