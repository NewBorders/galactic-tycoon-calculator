<script setup lang="ts">
import { usePlanningMode } from '@/v2/services/planningMode'
import { usePlanningHistory } from '@/v2/services/planningMode/history'

const { canUndo, canRedo, changeCount } = usePlanningMode()
const { undo, redo } = usePlanningHistory()
</script>

<template>
  <div class="planning-controls">
    <div class="planning-controls__info">
      <span class="planning-controls__badge">
        {{ changeCount }} {{ changeCount === 1 ? 'change' : 'changes' }}
      </span>
    </div>
    
    <div class="planning-controls__buttons">
      <button
        @click="undo"
        :disabled="!canUndo"
        class="planning-controls__button"
        title="Undo last change"
      >
        ↶ Undo
      </button>
      
      <button
        @click="redo"
        :disabled="!canRedo"
        class="planning-controls__button"
        title="Redo change"
      >
        ↷ Redo
      </button>
    </div>
  </div>
</template>

<style scoped>
.planning-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.planning-controls__info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.planning-controls__badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background-color: rgba(139, 92, 246, 0.2);
  color: rgb(196, 181, 253);
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
}

.planning-controls__buttons {
  display: flex;
  gap: 0.5rem;
}

.planning-controls__button {
  padding: 0.5rem 1rem;
  border: 1px solid rgb(71, 85, 105);
  border-radius: 0.375rem;
  background-color: rgb(30, 41, 59);
  color: rgb(226, 232, 240);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.planning-controls__button:hover:not(:disabled) {
  background-color: rgb(51, 65, 85);
  border-color: rgb(100, 116, 139);
}

.planning-controls__button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .planning-controls {
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }
}
</style>
