/**
 * Mapping from game display names to internal material keys
 * Used for importing stock and prices from game clipboard
 */
export const MATERIAL_NAME_TO_KEY: Record<string, string> = {
  // Tier 1 - Raw Materials
  'iron ore': 'iron_ore',
  'silica': 'silica',
  'limestone': 'limestone',
  'grain': 'grain',
  'oxygen': 'oxygen',
  'water': 'water',
  'hydrogen': 'hydrogen',
  'carbon': 'carbon',
  'nitrogen': 'nitrogen',
  'aluminium ore': 'aluminium_ore',

  // Tier 1 - Processed Materials
  'iron': 'iron',
  'concrete': 'concrete',
  'polyethylene': 'polyethylene',
  'glass': 'glass',
  'steel': 'steel',
  'flux': 'flux',
  'aluminium': 'aluminium',
  'rubber': 'rubber',
  'ethanol': 'ethanol',
  'lubricant': 'lubricant',
  'color compound': 'color_compound',
  'fabric': 'fabric',

  // Tier 1 - Food & Organic
  'fruits': 'fruits',
  'vegetables': 'vegetables',
  'cows': 'cows',
  'meat': 'meat',
  'cotton': 'cotton',
  'wood': 'wood',
  'leather': 'leather',

  // Tier 1 - Manufactured
  'construction kit': 'construction_kit',
  'construction tools': 'construction_tools',
  'prefab kit': 'prefab_kit',
  'amenities': 'amenities',
  'pipes': 'pipes',
  'office supplies': 'office_supplies',
  'furniture': 'furniture',
  'truss': 'truss',
  'welding kit': 'welding_kit',
  'hull plate': 'hull_plate',

  // Tier 1 - Consumables
  'rations': 'rations',
  'drinking water': 'drinking_water',
  'tools': 'tools',
  'ale': 'ale',
  'workwear': 'workwear',
  'hydrogen fuel': 'hydrogen_fuel',

  // Tier 1 - Special
  'research data': 'research_data',

  // Tier 2 - Raw Materials
  'copper ore': 'copper_ore',
  'titanium ore': 'titanium_ore',
  'platinum ore': 'platinum_ore',
  'argon': 'argon',

  // Tier 2 - Processed Materials
  'copper': 'copper',
  'titanium': 'titanium',
  'neoplast': 'neoplast',
  'fertilizer': 'fertilizer',
  'sulfuric acid': 'sulfuric_acid',
  'lithium': 'lithium',
  'copper wire': 'copper_wire',
  'coolant': 'coolant',
  'epoxy': 'epoxy',
  'kevlar': 'kevlar',
  'aerogel': 'aerogel',
  'durablend': 'durablend',
  'neoplast sheet': 'neoplast_sheet',

  // Tier 2 - Food & Organic
  'milk': 'milk',
  'fine rations': 'fine_rations',
  'coffee beans': 'coffee_beans',
  'coffee': 'coffee',
  'chickens': 'chickens',
  'honeycaps': 'honeycaps',
  'sugar': 'sugar',
  'pie': 'pie',
  'eggs': 'eggs',
  'herbs': 'herbs',
  'vitaqua': 'vitaqua',

  // Tier 2 - Manufactured & Components
  'combustion engine': 'combustion_engine',
  'electric motor': 'electric_motor',
  'battery': 'battery',
  'electronic circuit': 'electronic_circuit',
  'consumer electronics': 'consumer_electronics',
  'transistor': 'transistor',
  'chip': 'chip',
  'silicon wafer': 'silicon_wafer',
  'advanced circuit board': 'advanced_circuit_board',
  'pump': 'pump',
  'cooling system': 'cooling_system',
  'control console': 'control_console',
  'reinforced glass': 'reinforced_glass',
  'insulation panels': 'insulation_panels',
  'pressure sealant kit': 'pressure_sealant_kit',
  'modern prefab kit': 'modern_prefab_kit',
  'composite truss': 'composite_truss',

  // Tier 2 - Spaceship Components
  'life support system': 'life_support_system',
  'ship interior kit': 'ship_interior_kit',
  'cargo bay segment': 'cargo_bay_segment',
  'fuel tank segment': 'fuel_tank_segment',
  'heat shielding': 'heat_shielding',
  'shuttle bridge': 'shuttle_bridge',
  'hydrogen generator': 'hydrogen_generator',
  'linear ftl emitter': 'linear_ftl_emitter',
  'mining vehicle': 'mining_vehicle',
  'drone': 'drone',

  // Tier 2 - Consumables
  'advanced tools': 'advanced_tools',
  'exosuit': 'exosuit',
  'ship repair kit': 'ship_repair_kit',

  // Tier 2 - Special
  'structural elements': 'structural_elements',
  'construction vehicle': 'construction_vehicle',
  'drill': 'drill',
  'advanced research data': 'advanced_research_data',
}
