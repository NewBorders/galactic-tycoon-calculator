/**
 * Export Threshold Configuration
 * Manages the threshold for determining which materials are considered exports
 * vs materials consumed by own production
 */

import { ref, watch } from 'vue'
import { createLogger } from '../debug/logger'

const logger = createLogger('ExportThreshold')

const STORAGE_KEY = 'exportThreshold'
const DEFAULT_THRESHOLD = 50 // 50% by default

// Reactive ref that can be imported by other modules
const exportThreshold = ref<number>(loadThreshold())

function loadThreshold(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      const value = parseInt(stored, 10)
      if (!isNaN(value) && value >= 0 && value <= 100) {
        return value
      }
    }
  } catch (e) {
    logger.warn('Failed to load export threshold from localStorage:', e)
  }
  return DEFAULT_THRESHOLD
}

function saveThreshold(value: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, value.toString())
  } catch (e) {
    logger.warn('Failed to save export threshold to localStorage:', e)
  }
}

// Watch for changes and persist
watch(exportThreshold, (newValue) => {
  saveThreshold(newValue)
})

export function getExportThreshold(): number {
  return exportThreshold.value
}

export function getExportThresholdRef() {
  return exportThreshold
}

export function setExportThreshold(value: number): void {
  if (value >= 0 && value <= 100) {
    exportThreshold.value = value
  } else {
    throw new Error('Export threshold must be between 0 and 100')
  }
}

/**
 * Convert threshold to ratio for calculations
 * e.g., 50% threshold = 0.5 ratio
 */
export function getExportThresholdRatio(): number {
  return exportThreshold.value / 100
}
