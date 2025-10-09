import type { Building } from '../../types'

/**
 * Tier 1 Buildings - Basic production facilities
 */
export const TIER1_BUILDINGS: Record<string, Building> = {
  mine: {
    name: 'Mine',
    workers: 70,
    industryType: 'Resource Extraction',
    recipes: {
      iron_ore: { 
        name: 'Iron Ore', 
        time: 75, 
        inputs: {}, 
        outputs: { iron_ore: 10 } 
      },
      silica: { 
        name: 'Silica', 
        time: 75, 
        inputs: {}, 
        outputs: { silica: 10 } 
      },
      limestone: { 
        name: 'Limestone', 
        time: 75, 
        inputs: {}, 
        outputs: { limestone: 10 } 
      },
    },
  },
  prefab_plant: {
    name: 'Prefab Plant',
    workers: 75,
    industryType: 'Construction',
    recipes: {
      concrete: {
        name: 'Concrete',
        time: 45,
        inputs: { limestone: 4, silica: 4 },
        outputs: { concrete: 12 },
      },
      prefab_kit: {
        name: 'Prefab Kit',
        time: 105,
        inputs: { iron: 2, concrete: 10 },
        outputs: { prefab_kit: 1 },
      },
      amenities: {
        name: 'Amenities',
        time: 105,
        inputs: { wood: 3, glass: 4, pipes: 4 },
        outputs: { amenities: 1 },
      },
      construction_kit: {
        name: 'Construction Kit',
        time: 105,
        inputs: { polyethylene: 22, construction_tools: 3 },
        outputs: { construction_kit: 1 },
      },
    },
  },
}
