import type { Material } from '@/v2/services/gamedata/types'
import { parseStockData } from '@/v1/utils/parsing'

export type StockImportResult =
  | {
      success: true
      stock: Record<number, number>
      processed: number
      missing: string[]
    }
  | {
      success: false
      error: 'empty' | 'invalid'
      processed: number
      missing: string[]
    }

export function importStockText(text: string, materials: Material[]): StockImportResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { success: false, error: 'empty', processed: 0, missing: [] }
  }

  const nameToKey: Record<string, string> = {}
  materials.forEach((material) => {
    const id = String(material.id)
    const names = [material.name, material.shortName]
    names
      .filter((name): name is string => typeof name === 'string' && name.length > 0)
      .forEach((name) => {
        nameToKey[name.toLowerCase()] = id
      })
  })

  try {
    const result = parseStockData(trimmed, nameToKey)
    const processed = result.itemsProcessed ?? 0
    const missing = result.itemsNotFound ?? []

    if (!result.success || !result.data) {
      return { success: false, error: 'invalid', processed, missing }
    }

    const stock: Record<number, number> = {}
    Object.entries(result.data).forEach(([key, value]) => {
      const id = Number(key)
      const amount = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(id) || Number.isNaN(amount) || amount < 0) return
      stock[id] = amount
    })

    return { success: true, stock, processed: processed || Object.keys(stock).length, missing }
  } catch {
    return { success: false, error: 'invalid', processed: 0, missing: [] }
  }
}
