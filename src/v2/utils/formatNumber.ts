/**
 * Determine numeric locale to use based on document language.
 */
function numericLocaleFromDocument(): string {
  try {
    const docLang = (document?.documentElement?.lang || '').slice(0, 2).toLowerCase()
    if (docLang === 'en') {
      return 'en-US'
    } else if (docLang === 'de') {
      return 'de-DE'
    }
    return docLang || 'en-US'
  } catch {
    return 'en-US'
  }
}

/**
 * Formats a number with thousands separator and decimals depending on current language.
 * Uses dot as thousand separator and comma as decimal separator for 'en'/'de'.
 * @param value - The number to format
 * @param decimals - Number of decimals (default 2)
 * @param roundUp - decide to always round up the number instead of normal rounding (default false)
 */
export function formatNumber(
  value: number,
  decimals: number = 2,
  roundUp: boolean = false,
): string {
  if (!Number.isFinite(value)) return '—'
  const locale = numericLocaleFromDocument()

  if (roundUp) {
    const factor = Math.pow(10, decimals)
    value = Math.ceil(value * factor) / factor
  }

  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Formats a number as integer without decimals
 * @param value - The number to format
 */
export function formatInteger(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const locale = numericLocaleFromDocument()
  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/**
 * Formats a price in game dollars. Prices are always shown in Dollars.
 * Example: $1.104,5
 * @param value - numeric price
 * @param decimals - number of decimals (default 1)
 */
export function formatPrice(value: number, decimals: number = 1): string {
  if (!Number.isFinite(value)) return '—'
  const formatted = formatNumber(value, decimals)
  return `$${formatted}`
}
