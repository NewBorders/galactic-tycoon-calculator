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
 * Format currency as USD
 * Uses current locale for number formatting (e.g., 1.234,56 $ in de-DE, $1,234.56 in en-US)
 * but always displays USD currency symbol
 */
export const formatCurrency = (value: number, fractionDigits = 0): string => {
  const locale = getCurrentLocale()
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}
