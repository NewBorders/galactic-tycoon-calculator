import { ref, watch } from 'vue'

const TIMEFRAME_STORAGE_KEY = 'gt:v2:timeframeHours'
const DEFAULT_TIMEFRAME_HOURS = 24

function sanitizeTimeframe(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return DEFAULT_TIMEFRAME_HOURS
  const clamped = Math.min(336, Math.max(1, Math.round(numeric)))
  return clamped
}

function loadTimeframe(): number {
  try {
    const raw = localStorage.getItem(TIMEFRAME_STORAGE_KEY)
    if (raw == null) return DEFAULT_TIMEFRAME_HOURS
    return sanitizeTimeframe(Number(raw))
  } catch {
    return DEFAULT_TIMEFRAME_HOURS
  }
}

// Shared reactive timeframe across all pages
const timeframeHours = ref(loadTimeframe())

// Watch and sync to localStorage
watch(
  timeframeHours,
  (value) => {
    const sanitized = sanitizeTimeframe(value)
    if (sanitized !== value) {
      timeframeHours.value = sanitized
      return
    }
    try {
      localStorage.setItem(TIMEFRAME_STORAGE_KEY, String(sanitized))
    } catch {
      // Ignore localStorage errors
    }
  },
)

export function useTimeframe() {
  return {
    timeframeHours,
    sanitizeTimeframe,
  }
}
