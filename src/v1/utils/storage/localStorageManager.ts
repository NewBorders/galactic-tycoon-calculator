import type { SavedData } from '../../types'

const STORAGE_KEY = 'productionCalculatorData'
const STORAGE_VERSION = 2

interface StorageData {
  version: number
  data: SavedData
}

/**
 * Load saved data from localStorage
 * Handles versioning and migration automatically
 */
export function loadData(): SavedData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored)
    
    // Check if data has version (new format)
    if (parsed.version !== undefined) {
      const { version, data } = parsed as StorageData
      
      // Migrate data if needed
      if (version < STORAGE_VERSION) {
        return migrateData(data, version)
      }
      
      return data
    } else {
      // Old format without version, migrate it
      console.log('Migrating old data format to versioned format')
      return migrateData(parsed, 0)
    }
  } catch (error) {
    console.error('Error loading data from localStorage:', error)
    return null
  }
}

/**
 * Save data to localStorage with version information
 */
export function saveData(data: SavedData): void {
  try {
    const storageData: StorageData = {
      version: STORAGE_VERSION,
      data,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData))
  } catch (error) {
    console.error('Error saving data to localStorage:', error)
  }
}

/**
 * Clear all saved data
 */
export function clearData(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Migrate data from older versions
 */
function migrateData(data: any, fromVersion: number): SavedData {
  let migrated = { ...data }

  // Migration from version 0 (no version) to version 1
  if (fromVersion === 0) {
    console.log('Applying migration from v0 to v1')
    
    // Migrate planetModifiers from building level to recipe level
    if (migrated.buildings && Array.isArray(migrated.buildings)) {
      migrated.buildings = migrated.buildings.map((building: any) => {
        // Si el edificio tiene planetModifiers antiguos, migrarlos a las recetas
        if (building.planetModifiers && building.recipes) {
          const newRecipes = building.recipes.map((recipe: any) => {
            // Si la receta coincide con algún recurso en planetModifiers, usar ese valor
            const modifier = building.planetModifiers[recipe.recipeKey]
            return {
              ...recipe,
              ...(modifier !== undefined && { planetModifier: modifier })
            }
          })
          
          // Eliminar planetModifiers del edificio
          const { planetModifiers, ...buildingWithoutModifiers } = building
          return {
            ...buildingWithoutModifiers,
            recipes: newRecipes
          }
        }
        return building
      })
    }
    
    // Version 0 didn't have any specific structure changes
    // Just ensure all expected fields exist with defaults
    migrated = {
      buildings: migrated.buildings || [],
      prices: migrated.prices || {},
      stock: migrated.stock || {},
      productivity: migrated.productivity || 70,
      gameSpeed: migrated.gameSpeed || 4,
      technologyLevels: migrated.technologyLevels || {
        'Agriculture': 0,
        'Chemistry': 0,
        'Construction': 0,
        'Electronics': 0,
        'Food Production': 0,
        'Manufacturing': 0,
        'Metallurgy': 0,
        'Resource Extraction': 0,
        'Residential': 0,
        'Science': 0,
      },
      optionalConsumables: migrated.optionalConsumables || {
        'ale': false,
        'pie': false,
        'workwear': false,
      },
      workerPlanDays: migrated.workerPlanDays || migrated.planDays || 7,
      materialPlanDays: migrated.materialPlanDays || migrated.planDays || 7,
    }
  }

  // Future migrations will go here
  if (fromVersion < 2) {
    console.log('Applying migration from v1 to v2')
    
    // Add new price-related fields with defaults
    migrated = {
      ...migrated,
      currentPrices: migrated.currentPrices || {},
      avgPrices: migrated.avgPrices || {},
      usePriceType: migrated.usePriceType || 'current',
    }
  }
  // if (fromVersion < 3) { ... }

  return migrated
}

/**
 * Export data as JSON string for backup
 */
export function exportDataAsJSON(): string {
  const data = loadData()
  if (!data) return '{}'
  
  return JSON.stringify(data, null, 2)
}

/**
 * Import data from JSON string
 */
export function importDataFromJSON(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString)
    saveData(data)
    return true
  } catch (error) {
    console.error('Error importing data:', error)
    return false
  }
}
