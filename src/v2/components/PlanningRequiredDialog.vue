<script setup lang="ts">
import { usePlanningMode } from '@/v2/services/planningMode'

const { enterPlanningMode } = usePlanningMode()

function closeDialog() {
  const dialog = document.getElementById('planning-required-dialog') as HTMLDialogElement
  dialog?.close()
}

function enterPlanningAndClose() {
  enterPlanningMode()
  closeDialog()
}
</script>

<template>
  <dialog id="planning-required-dialog" class="planning-required-dialog">
    <div class="dialog-content">
      <div class="dialog-icon">🔒</div>
      <h3 class="dialog-title">Planning Mode Required</h3>
      <p class="planning-required-message dialog-message">
        Enter planning mode to make changes to your bases.
      </p>
      <p class="dialog-hint">
        Planning mode allows you to experiment with changes before applying them.
      </p>
      <div class="dialog-actions">
        <button @click="closeDialog" class="btn btn-secondary">
          Cancel
        </button>
        <button @click="enterPlanningAndClose" class="btn btn-primary">
          Enter Planning Mode
        </button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.planning-required-dialog {
  border: none;
  border-radius: 0.5rem;
  padding: 0;
  max-width: 28rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.planning-required-dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}

.dialog-content {
  padding: 1.5rem;
  background-color: var(--color-background);
  color: var(--color-text);
}

.dialog-icon {
  font-size: 3rem;
  text-align: center;
  margin-bottom: 1rem;
}

.dialog-title {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-heading);
  text-align: center;
}

.dialog-message {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--color-text);
  text-align: center;
}

.dialog-hint {
  margin: 0 0 1.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text-soft);
  text-align: center;
}

.dialog-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.btn {
  padding: 0.625rem 1.25rem;
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
  border-color: var(--color-border-hover);
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}
</style>
