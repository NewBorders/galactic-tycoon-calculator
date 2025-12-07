<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWorldData } from '@/v2/services/worldData'
import type { World } from '@/v2/services/api/types'
import { translate } from '@/v2/localisation'

const { activeWorld, switchWorld, hasApiKey } = useWorldData()

const emit = defineEmits<{
  worldChanged: [world: World]
}>()

const selected = ref<World>(activeWorld.value)

const showConfirmDialog = ref(false)
let pendingWorld: World | null = null

watch(selected, (newWorld) => {
  if (newWorld === activeWorld.value) return
  
  if (hasApiKey.value) {
    pendingWorld = newWorld
    showConfirmDialog.value = true
  } else {
    performSwitch(newWorld)
  }
})

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
  showConfirmDialog.value = false
  selected.value = activeWorld.value // Reset to current world if cancelled
  pendingWorld = null
}
</script>

<template>
  <label class="flex items-center gap-2 text-sm">
    <span>{{ translate('worldLabel') }}</span>
    <select v-model="selected" class="border rounded px-2 py-1 bg-gray-600">
      <option value="g1">Galaxy 1</option>
      <option value="g2">Galaxy 2</option>
    </select>
  </label>

  <!-- Confirmation Modal -->
  <dialog v-if="showConfirmDialog" open class="world-switch-dialog">
    <div class="dialog-content">
      <h3 class="dialog-title">Switch Galaxy?</h3>
      <p class="dialog-message">
        You are about to switch from <strong>Galaxy {{ activeWorld === 'g1' ? '1' : '2' }}</strong> to 
        <strong>Galaxy {{ pendingWorld === 'g1' ? '1' : '2' }}</strong>.
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
</template>

<style scoped>
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
