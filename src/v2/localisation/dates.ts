// Locale-aware date/time formatting
// Omits seconds; uses user's selected locale if available

import { getLocale } from './locale'

export function formatDateTime(ts: number | Date | null): string {
  if (!ts) return ''
  const date = typeof ts === 'number' ? new Date(ts) : ts
  const locale = getLocale() || (typeof navigator !== 'undefined' ? navigator.language : 'en-US')
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
