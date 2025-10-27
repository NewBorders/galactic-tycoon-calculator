<script setup lang="ts">
import { ref, watch } from 'vue';
import { availableLanguages, getCurrentLanguage, setLanguage, translate } from '../localisation/localisation';
const selected = ref(getCurrentLanguage());
watch(selected, (v) => setLanguage(v));
</script>

<template>
  <label class="flex items-center gap-2 text-sm">
    <span>{{ translate('language') }}</span>
    <select v-model="selected" class="border rounded px-2 py-1">
      <option v-for="l in availableLanguages" :key="l.code" :value="l.code">{{ l.label }}</option>
    </select>
  </label>
</template>
