export interface ParseResult {
  success: boolean
  message: string
  data?: Record<string, number>
  itemsProcessed?: number
  itemsNotFound?: string[]
}

/**
 * Parse stock data from game clipboard
 * Handles both single-line (tab-separated) and multi-line formats
 * 
 * Formats supported:
 * - Single line: "Ale\t45\t7t"
 * - Multi line: "Ale\n45  7t"
 */
export function parseStockData(
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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue

      // Check if this line contains tabs (single-line format)
      if (line.includes('\t')) {
        const parts = line.split('\t')
        if (parts.length >= 2) {
          const namePart = parts[0]
          const quantityPart = parts[1]
          if (!namePart || !quantityPart) continue
          
          const name = namePart.toLowerCase().trim()
          const quantityStr = quantityPart.trim()
          const quantity = parseInt(quantityStr, 10)

          if (!isNaN(quantity)) {
            const key = nameToKeyMap[name]
            if (key) {
              parsedData[key] = quantity
              itemsProcessed++
            } else {
              itemsNotFound.push(name)
            }
          }
        }
      } else {
        // Multi-line format: name on one line, quantity on next
        const name = line.toLowerCase().trim()

        // Check if next line exists and contains a number
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]
          if (!nextLine) continue
          
          // Try to extract number from next line (format: "45  7t" or "45\t7t")
          const match = nextLine.match(/^(\d+)/)

          if (match && match[1]) {
            const quantity = parseInt(match[1], 10)
            const key = nameToKeyMap[name]

            if (key) {
              parsedData[key] = quantity
              itemsProcessed++
              i++ // Skip the next line as we've already processed it
            } else {
              itemsNotFound.push(name)
              i++ // Skip the next line
            }
          }
        }
      }
    }

    if (itemsProcessed > 0) {
      let message = `✓ Successfully imported ${itemsProcessed} items`
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
        message: '✗ No valid items found. Check the format.',
      }
    }
  } catch (error) {
    return {
      success: false,
      message: '✗ Error parsing data. Please check the format.',
    }
  }
}
