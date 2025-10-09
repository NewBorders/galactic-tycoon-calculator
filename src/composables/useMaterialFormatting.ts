import type { Material } from '../types'

/**
 * Composable for material formatting utilities
 * Provides consistent formatting for material names and keys
 */
export function useMaterialFormatting() {
  /**
   * Convert material key to display name
   * Example: "iron_ore" → "Iron Ore"
   */
  const formatMaterialKey = (key: string): string => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Get material display name, with fallback to formatted key
   */
  const getMaterialName = (
    materialKey: string,
    materials?: Record<string, Material>
  ): string => {
    if (materials && materials[materialKey]) {
      return materials[materialKey].name
    }
    return formatMaterialKey(materialKey)
  }

  /**
   * Get material category display name
   */
  const formatCategory = (category: string): string => {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  /**
   * Convert display name to key format
   * Example: "Iron Ore" → "iron_ore"
   */
  const nameToKey = (name: string): string => {
    return name.toLowerCase().replace(/\s+/g, '_')
  }

  /**
   * Sort materials by name alphabetically
   */
  const sortMaterialsByName = (
    materials: Record<string, Material>
  ): [string, Material][] => {
    return Object.entries(materials).sort(([, a], [, b]) =>
      a.name.localeCompare(b.name)
    )
  }

  /**
   * Group materials by category
   */
  const groupMaterialsByCategory = (
    materials: Record<string, Material>
  ): Record<string, [string, Material][]> => {
    const grouped: Record<string, [string, Material][]> = {}

    Object.entries(materials).forEach(([key, material]) => {
      const category = material.category
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push([key, material])
    })

    // Sort each category
    Object.keys(grouped).forEach(category => {
      grouped[category].sort(([, a], [, b]) => a.name.localeCompare(b.name))
    })

    return grouped
  }

  return {
    formatMaterialKey,
    getMaterialName,
    formatCategory,
    nameToKey,
    sortMaterialsByName,
    groupMaterialsByCategory,
  }
}
