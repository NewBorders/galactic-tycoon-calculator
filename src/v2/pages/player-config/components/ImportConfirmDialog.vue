<script setup lang="ts">
// defineProps/defineEmits are Vue compiler macros (no import needed)
const props = defineProps<{
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onConfirm() {
  emit('confirm')
}

function onCancel() {
  emit('cancel')
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/50" @click="onCancel"></div>
    <div class="relative bg-slate-800 border border-slate-700 rounded p-4 w-96 text-slate-100">
      <h3 class="font-semibold text-lg mb-2">{{ title ?? 'Confirm' }}</h3>
      <p class="text-sm text-slate-300 mb-4">{{ message ?? '' }}</p>
      <div class="flex justify-end gap-2">
        <button class="px-3 py-1 border border-slate-700 rounded hover:bg-slate-700" @click="onCancel" :disabled="props.loading">
          {{ cancelLabel ?? 'Cancel' }}
        </button>
        <button
          class="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-sm disabled:opacity-50"
          @click="onConfirm"
          :disabled="props.loading"
        >
          <span v-if="props.loading">…</span>
          <span v-else>{{ confirmLabel ?? 'Confirm' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* lightweight modal styles handled by Tailwind classes in template */
</style>
