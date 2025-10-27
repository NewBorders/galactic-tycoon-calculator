import type { ParseResult } from './parseStockData'

/**
 * Parse prices data from game clipboard
 * Handles tab-separated format with Material, Selling, Price columns
 * 
 * Format: "Material\tSelling\t65,00$"
 * Handles various currency symbols and comma/dot decimal separators
 */
export function parsePricesData(
  text: string,
  nameToKeyMap: Record<string, string>
): ParseResult {
  if (!text.trim()) {
    return {
      success: false,
      message: 'No data provided',
    }
  }

  try {
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    const parsedData: Record<string, number> = {}
    let itemsProcessed = 0
    const itemsNotFound: string[] = []

    for (const line of lines) {
      // Skip header line
      if (line.toLowerCase().includes('material') && line.toLowerCase().includes('price')) {
        continue
      }

      // Split by tab
      const parts = line
        .split('\t')
        .map(p => p.trim())
        .filter(p => p.length > 0)

      if (parts.length >= 2) {
        const namePart = parts[0]
        if (!namePart) continue
        
        const name = namePart.toLowerCase().trim()

        // The price could be in the last column (skip "Selling" column if present)
        const priceStr = parts[parts.length - 1]
        if (!priceStr) continue

        // Remove currency symbols: "65,00$" → "65,00"
        let cleanPrice = priceStr.replace(/[$€£¥₹]/g, '')
        // Replace comma with dot for decimal separator: "65,00" → "65.00"
        cleanPrice = cleanPrice.replace(',', '.')
        const price = parseFloat(cleanPrice)

        if (!isNaN(price)) {
          const key = nameToKeyMap[name]

          if (key) {
            parsedData[key] = price
            itemsProcessed++
          } else {
            itemsNotFound.push(name)
          }
        }
      }
    }

    if (itemsProcessed > 0) {
      let message = `✓ Successfully imported ${itemsProcessed} prices`
      if (itemsNotFound.length > 0) {
        message += ` (${itemsNotFound.length} items not found: ${itemsNotFound.slice(0, 3).join(', ')}${itemsNotFound.length > 3 ? '...' : ''})`
      }
      
      return {
        success: true,
        message,
        data: parsedData,
        itemsProcessed,
        itemsNotFound,
      }
    } else {
      return {
        success: false,
        message: '✗ No valid prices found. Check the format.',
      }
    }
  } catch (error) {
    return {
      success: false,
      message: '✗ Error parsing data. Please check the format.',
    }
  }
}
