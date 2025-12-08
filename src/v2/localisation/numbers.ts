import { getCurrentLocale } from './locale'

export const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string => {
  const locale = getCurrentLocale()
  return new Intl.NumberFormat(locale, options).format(value)
}

export const formatInteger = (value: number): string =>
  formatNumber(value, { maximumFractionDigits: 0 })

export const formatDecimal = (value: number, fractionDigits = 2): string =>
  formatNumber(value, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })

export const formatPercent = (value: number, fractionDigits = 1): string =>
  formatNumber(value, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })

/**
 * Format currency as USD with dollar sign always in front
 * Always uses 'en-US' locale to ensure consistent $ prefix and comma/period format
 * regardless of user's locale preference (game currency is always USD)
 */
export const formatCurrency = (value: number, fractionDigits = 0): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}
