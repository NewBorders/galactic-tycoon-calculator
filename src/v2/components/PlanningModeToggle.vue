<script setup lang="ts">
import { computed } from 'vue'
import { usePlanningMode } from '@/v2/services/planningMode'

const { 
  isPlanningActive, 
  enterPlanningMode, 
  exitPlanningMode, 
  changeCount
} = usePlanningMode()

const emit = defineEmits<{
  planningToggled: [isActive: boolean]
}>()

function togglePlanning() {
  if (isPlanningActive.value) {
    // Show confirmation if there are unsaved changes
    if (changeCount.value > 0) {
      const dialog = document.getElementById('exit-planning-dialog') as HTMLDialogElement
      dialog?.showModal()
    } else {
      exitPlanningMode(false)
      emit('planningToggled', false)
    }
  } else {
    enterPlanningMode()
    emit('planningToggled', true)
  }
}

function discardAndExit() {
  exitPlanningMode(false)
  emit('planningToggled', false)
  closeDialog()
}

function applyAndExit() {
  exitPlanningMode(true)
  emit('planningToggled', false)
  closeDialog()
}

function closeDialog() {
  const dialog = document.getElementById('exit-planning-dialog') as HTMLDialogElement
  dialog?.close()
}

const statusText = computed(() => {
  if (!isPlanningActive.value) return 'Enter Planning Mode'
  return changeCount.value > 0 
    ? `Planning Mode (${changeCount.value} change${changeCount.value !== 1 ? 's' : ''})`
    : 'Planning Mode (No changes)'
})

const statusIcon = computed(() => {
  return isPlanningActive.value ? '📋' : '✏️'
})
</script>

<template>
  <div class="planning-toggle">
    <button 
      @click="togglePlanning" 
      class="planning-toggle__button"
      :class="{ 'planning-toggle__button--active': isPlanningActive }"
    >
      <span class="planning-toggle__icon">{{ statusIcon }}</span>
      <span class="planning-toggle__text">{{ statusText }}</span>
    </button>

    <!-- Badge for active planning mode -->
    <div v-if="isPlanningActive" class="planning-badge">
      <span class="planning-badge__dot"></span>
      <span class="planning-badge__text">Planning Active</span>
    </div>

    <!-- Exit Confirmation Modal -->
    <dialog id="exit-planning-dialog" class="exit-planning-dialog">
      <div class="dialog-content">
        <h3 class="dialog-title">Exit Planning Mode?</h3>
        <p class="dialog-message">
          You have <strong>{{ changeCount }} unsaved change{{ changeCount !== 1 ? 's' : '' }}</strong> in your planning.
        </p>
        <p class="dialog-message">
          What would you like to do?
        </p>
        <div class="dialog-actions">
          <button @click="closeDialog" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="discardAndExit" class="btn btn-danger">
            Discard Changes
          </button>
          <button @click="applyAndExit" class="btn btn-primary">
            Apply Changes
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.planning-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}

.planning-toggle__button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.planning-toggle__button:hover {
  background-color: var(--color-background-mute);
  border-color: var(--color-border-hover);
}

.planning-toggle__button--active {
  background-color: var(--color-primary-soft, #e0f2fe);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.planning-toggle__icon {
  font-size: 1.125rem;
}

.planning-toggle__text {
  white-space: nowrap;
}

.planning-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  background-color: var(--color-success-bg, #d1fae5);
  border: 1px solid var(--color-success-border, #86efac);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-success-text, #065f46);
}

.planning-badge__dot {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  background-color: var(--color-success, #10b981);
  border-radius: 50%;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.planning-badge__text {
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.exit-planning-dialog {
  padding: 0;
  border: none;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  background-color: var(--color-background);
  max-width: 28rem;
}

.exit-planning-dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}

.dialog-content {
  padding: 1.5rem;
}

.dialog-title {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-heading);
}

.dialog-message {
  margin: 0 0 0.75rem;
  color: var(--color-text);
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background-color: var(--color-background-soft);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background-color: var(--color-background-mute);
}

.btn-danger {
  background-color: var(--color-danger, #ef4444);
  color: white;
}

.btn-danger:hover {
  opacity: 0.9;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}
</style>
