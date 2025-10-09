import type { GameData } from '../types'

export const GAME_DATA: GameData = {
  buildings: {
    mine: {
      name: 'Mine',
      workers: 70,
      industryType: 'Resource Extraction',
      recipes: {
        iron_ore: { name: 'Iron Ore', time: 75, inputs: {}, outputs: { iron_ore: 10 } },
        silica: { name: 'Silica', time: 75, inputs: {}, outputs: { silica: 10 } },
        limestone: { name: 'Limestone', time: 75, inputs: {}, outputs: { limestone: 10 } },
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
  },
  materials: {
    // Tier 1 - Raw Materials
    iron_ore: { name: 'Iron Ore', category: 'raw', weight: 1 },
    silica: { name: 'Silica', category: 'raw', weight: 0.8 },
    limestone: { name: 'Limestone', category: 'raw', weight: 1 },
    grain: { name: 'Grain', category: 'raw', weight: 0.05 },
    oxygen: { name: 'Oxygen', category: 'raw', weight: 0.5 },
    water: { name: 'Water', category: 'raw', weight: 0.65 },
    hydrogen: { name: 'Hydrogen', category: 'raw', weight: 0.3 },
    carbon: { name: 'Carbon', category: 'raw', weight: 0.75 },
    nitrogen: { name: 'Nitrogen', category: 'raw', weight: 0.5 },
    aluminium_ore: { name: 'Aluminium Ore', category: 'raw', weight: 1.25 },
    
    // Tier 1 - Processed Materials
    iron: { name: 'Iron', category: 'processed', weight: 1.5 },
    concrete: { name: 'Concrete', category: 'processed', weight: 0.35 },
    polyethylene: { name: 'Polyethylene', category: 'processed', weight: 0.035 },
    glass: { name: 'Glass', category: 'processed', weight: 0.25 },
    steel: { name: 'Steel', category: 'processed', weight: 2.5 },
    flux: { name: 'Flux', category: 'processed', weight: 0.4 },
    aluminium: { name: 'Aluminium', category: 'processed', weight: 1.25 },
    rubber: { name: 'Rubber', category: 'processed', weight: 0.075 },
    ethanol: { name: 'Ethanol', category: 'processed', weight: 0.2 },
    lubricant: { name: 'Lubricant', category: 'processed', weight: 0.15 },
    color_compound: { name: 'Color Compound', category: 'processed', weight: 0.25 },
    
    // Tier 1 - Food & Organic
    fruits: { name: 'Fruits', category: 'food', weight: 0.2 },
    vegetables: { name: 'Vegetables', category: 'food', weight: 0.2 },
    cows: { name: 'Cows', category: 'food', weight: 3 },
    meat: { name: 'Meat', category: 'food', weight: 0.25 },
    cotton: { name: 'Cotton', category: 'food', weight: 0.2 },
    wood: { name: 'Wood', category: 'food', weight: 0.65 },
    leather: { name: 'Leather', category: 'food', weight: 0.3 },
    fabric: { name: 'Fabric', category: 'processed', weight: 0.1 },
    
    // Tier 1 - Manufactured
    construction_kit: { name: 'Construction Kit', category: 'manufactured', weight: 2 },
    construction_tools: { name: 'Construction Tools', category: 'manufactured', weight: 0.25 },
    prefab_kit: { name: 'Prefab Kit', category: 'manufactured', weight: 2 },
    amenities: { name: 'Amenities', category: 'manufactured', weight: 1.5 },
    pipes: { name: 'Pipes', category: 'manufactured', weight: 0.35 },
    office_supplies: { name: 'Office Supplies', category: 'manufactured', weight: 0.3 },
    furniture: { name: 'Furniture', category: 'manufactured', weight: 0.4 },
    truss: { name: 'Truss', category: 'manufactured', weight: 2 },
    welding_kit: { name: 'Welding Kit', category: 'manufactured', weight: 0.6 },
    hull_plate: { name: 'Hull Plate', category: 'manufactured', weight: 2 },
    
    // Tier 1 - Consumables
    rations: { name: 'Rations', category: 'consumable', weight: 0.1 },
    drinking_water: { name: 'Drinking Water', category: 'consumable', weight: 0.1 },
    tools: { name: 'Tools', category: 'consumable', weight: 0.1 },
    ale: { name: 'Ale', category: 'consumable', weight: 0.15 },
    workwear: { name: 'Workwear', category: 'consumable', weight: 0.1 },
    hydrogen_fuel: { name: 'Hydrogen Fuel', category: 'consumable', weight: 0.25 },
    
    // Tier 1 - Special
    research_data: { name: 'Research Data', category: 'special', weight: 0.1 },
    
    // Tier 2 - Raw Materials
    copper_ore: { name: 'Copper Ore', category: 'raw', weight: 2 },
    titanium_ore: { name: 'Titanium Ore', category: 'raw', weight: 2 },
    platinum_ore: { name: 'Platinum Ore', category: 'raw', weight: 2 },
    argon: { name: 'Argon', category: 'raw', weight: 0.6 },
    
    // Tier 2 - Processed Materials
    copper: { name: 'Copper', category: 'processed', weight: 2 },
    titanium: { name: 'Titanium', category: 'processed', weight: 2 },
    neoplast: { name: 'Neoplast', category: 'processed', weight: 0.1 },
    fertilizer: { name: 'Fertilizer', category: 'processed', weight: 0.25 },
    sulfuric_acid: { name: 'Sulfuric Acid', category: 'processed', weight: 0.3 },
    lithium: { name: 'Lithium', category: 'processed', weight: 1.5 },
    copper_wire: { name: 'Copper Wire', category: 'processed', weight: 0.1 },
    coolant: { name: 'Coolant', category: 'processed', weight: 0.15 },
    epoxy: { name: 'Epoxy', category: 'processed', weight: 0.15 },
    kevlar: { name: 'Kevlar', category: 'processed', weight: 0.25 },
    aerogel: { name: 'Aerogel', category: 'processed', weight: 0.4 },
    durablend: { name: 'Durablend', category: 'processed', weight: 0.4 },
    neoplast_sheet: { name: 'Neoplast Sheet', category: 'processed', weight: 0.6 },
    
    // Tier 2 - Food & Organic
    milk: { name: 'Milk', category: 'food', weight: 0.2 },
    fine_rations: { name: 'Fine Rations', category: 'food', weight: 0.15 },
    coffee_beans: { name: 'Coffee Beans', category: 'food', weight: 0.25 },
    coffee: { name: 'Coffee', category: 'food', weight: 0.2 },
    chickens: { name: 'Chickens', category: 'food', weight: 0.25 },
    honeycaps: { name: 'Honeycaps', category: 'food', weight: 0.25 },
    sugar: { name: 'Sugar', category: 'food', weight: 0.25 },
    pie: { name: 'Pie', category: 'food', weight: 0.4 },
    eggs: { name: 'Eggs', category: 'food', weight: 0.2 },
    herbs: { name: 'Herbs', category: 'food', weight: 0.15 },
    vitaqua: { name: 'Vitaqua', category: 'food', weight: 0.15 },
    
    // Tier 2 - Manufactured & Components
    combustion_engine: { name: 'Combustion Engine', category: 'manufactured', weight: 2 },
    electric_motor: { name: 'Electric Motor', category: 'manufactured', weight: 0.65 },
    battery: { name: 'Battery', category: 'manufactured', weight: 0.3 },
    electronic_circuit: { name: 'Electronic Circuit', category: 'manufactured', weight: 0.1 },
    consumer_electronics: { name: 'Consumer Electronics', category: 'manufactured', weight: 0.4 },
    transistor: { name: 'Transistor', category: 'manufactured', weight: 0.1 },
    chip: { name: 'Chip', category: 'manufactured', weight: 0.15 },
    silicon_wafer: { name: 'Silicon Wafer', category: 'manufactured', weight: 0.1 },
    advanced_circuit_board: { name: 'Advanced Circuit Board', category: 'manufactured', weight: 0.2 },
    pump: { name: 'Pump', category: 'manufactured', weight: 0.6 },
    cooling_system: { name: 'Cooling System', category: 'manufactured', weight: 1.25 },
    control_console: { name: 'Control Console', category: 'manufactured', weight: 0.75 },
    reinforced_glass: { name: 'Reinforced Glass', category: 'manufactured', weight: 0.4 },
    insulation_panels: { name: 'Insulation Panels', category: 'manufactured', weight: 0.4 },
    pressure_sealant_kit: { name: 'Pressure Sealant Kit', category: 'manufactured', weight: 0.5 },
    modern_prefab_kit: { name: 'Modern Prefab Kit', category: 'manufactured', weight: 2 },
    composite_truss: { name: 'Composite Truss', category: 'manufactured', weight: 2.5 },
    
    // Tier 2 - Spaceship Components
    life_support_system: { name: 'Life Support System', category: 'spaceship', weight: 1.5 },
    ship_interior_kit: { name: 'Ship Interior Kit', category: 'spaceship', weight: 6 },
    cargo_bay_segment: { name: 'Cargo Bay Segment', category: 'spaceship', weight: 4 },
    fuel_tank_segment: { name: 'Fuel Tank Segment', category: 'spaceship', weight: 4 },
    heat_shielding: { name: 'Heat Shielding', category: 'spaceship', weight: 2 },
    shuttle_bridge: { name: 'Shuttle Bridge', category: 'spaceship', weight: 15 },
    hydrogen_generator: { name: 'Hydrogen Generator', category: 'spaceship', weight: 7.5 },
    linear_ftl_emitter: { name: 'Linear FTL Emitter', category: 'spaceship', weight: 7.5 },
    mining_vehicle: { name: 'Mining Vehicle', category: 'spaceship', weight: 5 },
    drone: { name: 'Drone', category: 'spaceship', weight: 1 },
    
    // Tier 2 - Consumables
    advanced_tools: { name: 'Advanced Tools', category: 'consumable', weight: 0.35 },
    exosuit: { name: 'Exosuit', category: 'consumable', weight: 1 },
    ship_repair_kit: { name: 'Ship Repair Kit', category: 'consumable', weight: 0.75 },
    
    // Tier 2 - Special
    structural_elements: { name: 'Structural Elements', category: 'special', weight: 2 },
    construction_vehicle: { name: 'Construction Vehicle', category: 'special', weight: 5 },
    drill: { name: 'Drill', category: 'special', weight: 1 },
    advanced_research_data: { name: 'Advanced Research Data', category: 'special', weight: 0.1 },
  },
  workerConsumption: {
    rations: 24,
    drinking_water: 32,
    tools: 12,
    workwear: 8,
    ale: 7,
    pie: 2,
  },
}
