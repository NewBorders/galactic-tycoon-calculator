/**
 * Formats a number with thousands separator and decimals
 * @param value - The number to format
 * @param decimals - Number of decimals (default 2)
 * @returns Formatted string (e.g., 1,234.56)
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Formats a number as integer without decimals
 * @param value - The number to format
 * @returns Formatted string (e.g., 1,234)
 */
export function formatInteger(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}
