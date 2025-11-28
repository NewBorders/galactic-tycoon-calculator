// Icon ID resolution for material names → sprite symbol IDs
// 1) Manual overrides for known mismatches
// 2) Fallback normalization: PascalCase tokens, remove non-alphanumerics

export const MATERIAL_ICON_OVERRIDES: Record<string, string> = {
  Amenities: 'BasicAmenities',
  Chickens: 'Chicken',
  'Consumer Electronics': 'Electronics',
  Copper: 'CopperBar',
  'Copper Wire': 'CopperWiring',
  Cows: 'Cow',
  Exosuit: 'BasicExosuit',
  'Electric Motor': 'Motor',
  Ethanol: 'Gasoline',
  'Graphenium Wire': 'Superconductors',
  'Hauler Bridge': 'AdvancedShipBridge',
  'Hull Plate': 'BasicHullPlate',
  'Hydrogen Fuel': 'HydrogenFuelCell',
  Iron: 'IronBar',
  'Linear FTL Emitter': 'BasicFTLEmitter',
  'Molecular Fusion Kit': 'WeldingKit2',
  'Prefab Kit': 'BasicPrefabKit',
  'Quantum FTL Emitter': 'AdvancedFTLEmitter',
  Rations: 'BasicRations',
  'Shuttle Bridge': 'BasicShipBridge',
  'Starglass Hull Plate': 'QuadraniumHullPlate',
  'Titanium Carbide Drill':'AdvancedDrill',
  Tools: 'BasicTools',
  Truss: 'ReinforcedTruss',
}

// Default normalization: remove whitespace only (preserve original casing/characters)
export function normalizeIconId(name: string): string {
  return name.replace(/\s+/g, '')
}

export function resolveIconIdFromName(materialName: string): string {
  if (!materialName) return '_fallback'
  // 1) Manual override wins
  const override = MATERIAL_ICON_OVERRIDES[materialName]
  if (override) return override
  // 2) Default normalization: remove spaces only
  return normalizeIconId(materialName)
}
