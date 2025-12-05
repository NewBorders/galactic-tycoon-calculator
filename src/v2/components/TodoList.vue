<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePlanningMode } from '@/v2/services/planningMode'
import { usePlanningHistory } from '@/v2/services/planningMode/history'

const { 
  isPlanningActive, 
  history, 
  changeCount,
  plannedBases
} = usePlanningMode()

const { 
  undo, 
  redo, 
  canUndo, 
  canRedo,
  historyIndex 
} = usePlanningHistory()

const isCollapsed = ref(false)
const isClosed = ref(!isPlanningActive.value)

// Group history entries by base
const groupedHistory = computed(() => {
  const groups: Record<string, { baseName: string; entries: Array<{ index: number; description: string; isActive: boolean }> }> = {}
  
  history.value.forEach((entry, index) => {
    const baseId = entry.baseId
    const base = plannedBases.value.find(b => b.id === baseId)
    const baseName = base?.name || 'Unknown Base'
    
    if (!groups[baseId]) {
      groups[baseId] = {
        baseName,
        entries: []
      }
    }
    
    groups[baseId].entries.push({
      index,
      description: entry.description,
      isActive: index <= historyIndex.value
    })
  })
  
  return groups
})

function handleUndo() {
  if (canUndo.value) {
    undo()
  }
}

function handleRedo() {
  if (canRedo.value) {
    redo()
  }
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

function closeTodoList() {
  isClosed.value = true
}

function openTodoList() {
  isClosed.value = false
  isCollapsed.value = false
}

// Watch planning mode and auto-open
import { watch } from 'vue'
watch(isPlanningActive, (isActive) => {
  if (isActive && isClosed.value) {
    isClosed.value = false
  }
})
</script>

<template>
  <!-- Reopen button when closed -->
  <button 
    v-if="isClosed && isPlanningActive" 
    @click="openTodoList"
    class="todo-reopen-button"
    title="Open TODO List"
  >
    <span class="todo-reopen-icon">📋</span>
    <span v-if="changeCount > 0" class="todo-reopen-badge">{{ changeCount }}</span>
  </button>

  <!-- Main TODO List -->
  <div 
    v-if="!isClosed && isPlanningActive" 
    class="todo-list"
    :class="{ 'todo-list--collapsed': isCollapsed }"
  >
    <!-- Header -->
    <div class="todo-list__header">
      <div class="todo-list__title">
        <span class="todo-list__icon">📋</span>
        <span>TODO List</span>
        <span class="todo-list__count">{{ changeCount }}</span>
      </div>
      <div class="todo-list__actions">
        <button 
          @click="toggleCollapse" 
          class="todo-list__action-btn"
          :title="isCollapsed ? 'Expand' : 'Collapse'"
        >
          {{ isCollapsed ? '▲' : '▼' }}
        </button>
        <button 
          @click="closeTodoList" 
          class="todo-list__action-btn"
          title="Close"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Content (only visible when not collapsed) -->
    <div v-if="!isCollapsed" class="todo-list__content">
      <!-- Undo/Redo Controls -->
      <div class="todo-list__controls">
        <button 
          @click="handleUndo" 
          :disabled="!canUndo"
          class="todo-list__control-btn"
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button 
          @click="handleRedo" 
          :disabled="!canRedo"
          class="todo-list__control-btn"
          title="Redo (Ctrl+Shift+Z)"
        >
          ↷ Redo
        </button>
      </div>

      <!-- History grouped by base -->
      <div v-if="changeCount > 0" class="todo-list__groups">
        <div 
          v-for="(group, baseId) in groupedHistory" 
          :key="baseId"
          class="todo-group"
        >
          <div class="todo-group__header">
            {{ group.baseName }}
          </div>
          <ul class="todo-group__items">
            <li 
              v-for="entry in group.entries" 
              :key="entry.index"
              class="todo-item"
              :class="{ 
                'todo-item--inactive': !entry.isActive,
                'todo-item--current': entry.index === historyIndex 
              }"
            >
              <span class="todo-item__bullet">
                {{ entry.isActive ? '✓' : '○' }}
              </span>
              <span class="todo-item__text">
                {{ entry.description }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="todo-list__empty">
        <p>No changes yet.</p>
        <p class="todo-list__empty-hint">
          Make changes to your bases to see them here.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.todo-reopen-button {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 40;
  width: 3.5rem;
  height: 3.5rem;
  border: none;
  border-radius: 50%;
  background-color: var(--color-primary);
  color: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.todo-reopen-button:hover {
  transform: scale(1.1);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.todo-reopen-icon {
  font-size: 1.5rem;
}

.todo-reopen-badge {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  background-color: var(--color-danger, #ef4444);
  color: white;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.todo-list {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 50;
  width: 24rem;
  max-height: calc(100vh - 8rem);
  display: flex;
  flex-direction: column;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.todo-list--collapsed {
  max-height: auto;
}

.todo-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
}

.todo-list__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--color-heading);
}

.todo-list__icon {
  font-size: 1.125rem;
}

.todo-list__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.375rem;
  background-color: var(--color-primary);
  color: white;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.todo-list__actions {
  display: flex;
  gap: 0.25rem;
}

.todo-list__action-btn {
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: var(--color-text-soft);
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

.todo-list__action-btn:hover {
  background-color: var(--color-background-mute);
  color: var(--color-text);
}

.todo-list__content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.todo-list__controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.todo-list__control-btn {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.todo-list__control-btn:hover:not(:disabled) {
  background-color: var(--color-background-mute);
  border-color: var(--color-border-hover);
}

.todo-list__control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.todo-list__groups {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.todo-group {
  background-color: var(--color-background-soft);
  border-radius: 0.375rem;
  overflow: hidden;
}

.todo-group__header {
  padding: 0.625rem 0.75rem;
  background-color: var(--color-background-mute);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-heading);
}

.todo-group__items {
  list-style: none;
  margin: 0;
  padding: 0;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.2s;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item--inactive {
  opacity: 0.5;
}

.todo-item--current {
  background-color: var(--color-primary-soft, #e0f2fe);
}

.todo-item__bullet {
  flex-shrink: 0;
  color: var(--color-success, #10b981);
  font-size: 0.875rem;
}

.todo-item--inactive .todo-item__bullet {
  color: var(--color-text-soft);
}

.todo-item__text {
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text);
}

.todo-list__empty {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-text-soft);
}

.todo-list__empty p {
  margin: 0 0 0.5rem;
}

.todo-list__empty-hint {
  font-size: 0.875rem;
  opacity: 0.75;
}

@media (max-width: 640px) {
  .todo-list {
    width: calc(100vw - 2rem);
    right: 1rem;
    bottom: 1rem;
    max-height: calc(100vh - 6rem);
  }

  .todo-reopen-button {
    right: 1rem;
    bottom: 1rem;
  }
}
</style>
