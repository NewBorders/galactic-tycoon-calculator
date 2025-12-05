<script setup lang="ts">
import { computed } from 'vue'
import { useWorldData } from '@/v2/services/worldData'
import type { World } from '@/v2/services/api/types'

const { activeWorld, switchWorld, hasApiKey } = useWorldData()

const emit = defineEmits<{
  worldChanged: [world: World]
}>()

type WorldOption = { value: World; label: string; icon: string }

const worlds = [
  { value: 'g1' as World, label: 'Galaxy 1', icon: '🌌' },
  { value: 'g2' as World, label: 'Galaxy 2', icon: '🌠' },
] as const

const currentWorld = computed<WorldOption>(() => {
  const found = worlds.find(w => w.value === activeWorld.value)
  return found || worlds[0]
})

const showConfirmDialog = computed(() => {
  return hasApiKey.value && activeWorld.value
})

let pendingWorld: World | null = null

function requestWorldSwitch(world: World) {
  if (world === activeWorld.value) return
  
  if (showConfirmDialog.value) {
    pendingWorld = world
    const dialog = document.getElementById('world-switch-dialog') as HTMLDialogElement
    dialog?.showModal()
  } else {
    performSwitch(world)
  }
}

function performSwitch(world: World) {
  switchWorld(world)
  emit('worldChanged', world)
  pendingWorld = null
}

function confirmSwitch() {
  if (pendingWorld) {
    performSwitch(pendingWorld)
  }
  closeDialog()
}

function closeDialog() {
  const dialog = document.getElementById('world-switch-dialog') as HTMLDialogElement
  dialog?.close()
  pendingWorld = null
}
</script>

<template>
  <div class="world-switcher">
    <label class="world-switcher__label">
      <span class="world-switcher__icon">{{ currentWorld.icon }}</span>
      <select 
        :value="activeWorld" 
        @change="(e) => requestWorldSwitch((e.target as HTMLSelectElement).value as World)"
        class="world-switcher__select"
      >
        <option 
          v-for="world in worlds" 
          :key="world.value" 
          :value="world.value"
        >
          {{ world.label }}
        </option>
      </select>
    </label>

    <!-- Confirmation Modal -->
    <dialog id="world-switch-dialog" class="world-switch-dialog">
      <div class="dialog-content">
        <h3 class="dialog-title">Switch Galaxy?</h3>
        <p class="dialog-message">
          You are about to switch from <strong>{{ currentWorld.label }}</strong> to 
          <strong>{{ worlds.find(w => w.value === pendingWorld)?.label }}</strong>.
        </p>
        <p class="dialog-warning">
          ⚠️ All data context (bases, API key, alerts) will be switched to the selected galaxy.
        </p>
        <div class="dialog-actions">
          <button @click="closeDialog" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="confirmSwitch" class="btn btn-primary">
            Switch Galaxy
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.world-switcher {
  display: inline-flex;
  align-items: center;
}

.world-switcher__label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.world-switcher__icon {
  font-size: 1.25rem;
}

.world-switcher__select {
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
}

.world-switcher__select:hover {
  background-color: var(--color-background-mute);
  border-color: var(--color-border-hover);
}

.world-switcher__select:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.world-switch-dialog {
  padding: 0;
  border: none;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  background-color: var(--color-background);
  max-width: 28rem;
}

.world-switch-dialog::backdrop {
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

.dialog-warning {
  margin: 0 0 1.5rem;
  padding: 0.75rem;
  background-color: var(--color-warning-bg, #fff3cd);
  border: 1px solid var(--color-warning-border, #ffeaa7);
  border-radius: 0.375rem;
  color: var(--color-warning-text, #856404);
  font-size: 0.875rem;
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
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

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}
</style>
