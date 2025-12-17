// Locale-aware date/time formatting
// Omits seconds; uses user's selected locale if available

import { getCurrentLocale } from './locale'

export function formatDateTime(ts: number | Date | null): string {
  if (!ts) return ''
  const date = typeof ts === 'number' ? new Date(ts) : ts
  const locale = getCurrentLocale() || (typeof navigator !== 'undefined' ? navigator.language : 'en-US')
  try {
    const fmt = new Intl.DateTimeFormat(locale, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
    return fmt.format(date)
  } catch {
    return date.toLocaleString()
  }
}

/**
 * Formats a duration in days to a human-readable format
 * @param days - Number of days (can be fractional)
 * @returns Formatted string like "2d 3h" or "3h" or "∞"
 */
export function formatDays(days: number): string {
  if (days === Infinity || days > 9999) {
    return '∞'
  }
  
  if (days < 0) {
    return '-'
  }

  const totalHours = days * 24
  
  if (totalHours < 1) {
    // Less than 1 hour, show minutes
    const minutes = Math.floor(totalHours * 60)
    return `${minutes}m`
  }
  
  if (totalHours < 24) {
    // Less than 1 day, show only hours
    const hours = Math.floor(totalHours)
    return `${hours}h`
  }
  
  // 1 day or more, show days and hours
  const wholeDays = Math.floor(days)
  const remainingHours = Math.floor((days - wholeDays) * 24)
  
  if (remainingHours === 0) {
    return `${wholeDays}d`
  }
  
  return `${wholeDays}d ${remainingHours}h`
}
