<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    label?: string
    width?: 'sm' | 'md' | 'lg'
  }>(),
  {
    min: 0,
    max: 999999,
    width: 'md',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const inputWidthClass = computed(() => {
  switch (props.width) {
    case 'sm':
      return 'w-6'
    case 'md':
      return 'w-12'
    case 'lg':
      return 'w-16'
    default:
      return 'w-12'
  }
})

function decrement() {
  if (props.modelValue > props.min) {
    emit('update:modelValue', Math.max(props.min, props.modelValue - 1))
  }
}

function increment() {
  if (props.modelValue < props.max) {
    emit('update:modelValue', Math.min(props.max, props.modelValue + 1))
  }
}

function handleInput(e: Event) {
  const value = Math.floor(Number((e.target as HTMLInputElement).value) || props.min)
  emit('update:modelValue', Math.max(props.min, Math.min(props.max, value)))
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center border border-slate-700 rounded px-1 py-0.5 bg-slate-800 gap-0.5">
      <button
        :class="modelValue <= min ? 'px-2 text-slate-400 opacity-50 cursor-not-allowed text-xs' : 'px-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition text-xs'"
        title="Decrease"
        :disabled="modelValue <= min"
        @click.prevent="decrement"
      >
        −
      </button>
      <input
        type="number"
        :class="[inputWidthClass, 'bg-transparent text-center border-0 focus:outline-none focus:ring-0 text-slate-300 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none']"
        :value="modelValue"
        :min="min"
        :max="max"
        @input="handleInput"
      />
      <button
        :class="modelValue >= max ? 'px-2 text-slate-400 opacity-50 cursor-not-allowed text-xs' : 'px-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition text-xs'"
        title="Increase"
        :disabled="modelValue >= max"
        @click.prevent="increment"
      >
        +
      </button>
    </div>
    <div v-if="label" class="text-xs text-slate-400 text-center leading-tight">{{ label }}</div>
  </div>
</template>
