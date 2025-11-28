// Icon ID resolution for material names → sprite symbol IDs
// 1) Manual overrides for known mismatches
// 2) Fallback normalization: PascalCase tokens, remove non-alphanumerics

export const MATERIAL_ICON_OVERRIDES: Record<string, string> = {
  "Advanced Processing Unit": "APU",
  "Amenities": "BasicAmenities",
  "Artificial Intelligence": "AI",
  "Bio-Nutrient Blend": "NutrientBlend",
  "Chickens": "Chicken",
  "Construction Kit": "BasicConstructionKit",
  "Consumer Electronics": "Electronics",
  "Copper": "CopperBar",
  "Copper Wire": "CopperWiring",
  "Cows": "Cow",
  "Electric Motor": "Motor",
  "Ethanol": "Gasoline",
  "Exosuit": "BasicExosuit",
  "Extra-dimensional FTL Emitter": "SuperiorFTLEmitter",
  "Field Cooling System": "FieldCooling",
  "Freighter Bridge": "T4ShipBridge",
  "Graphenium Wire": "Superconductors",
  "Hauler Bridge": "AdvancedShipBridge",
  "Hull Plate": "BasicHullPlate",
  "Hydrogen Fuel": "HydrogenFuelCell",
  "Iron": "IronBar",
  "Linear FTL Emitter": "BasicFTLEmitter",
  "Molecular Fusion Kit": "WeldingKit2",
  "Nanites": "Nanobots",
  "Prefab Kit": "BasicPrefabKit",
  "Quantum FTL Emitter": "AdvancedFTLEmitter",
  "Rations": "BasicRations",
  "Shuttle Bridge": "BasicShipBridge",
  "Starglass Hull Plate": "QuadraniumHullPlate",
  "Starlifter Structural Elements": "T4ShipElements",
  "Superconducting Coil": "HyperCoil",
  "Titanium Carbide Drill": "AdvancedDrill",
  "Tools": "BasicTools",
  "Truss": "ReinforcedTruss",
  "Defense systems pack": "N_A",
  "Food Shipment": "N_A",
  "Habitats shipment": "N_A",
  "Medicine Shipment": "N_A",
  "Scientific Instruments Shipment": "N_A",
  "Ship Parts Shipment": "N_A",
    "TEMP": "N_A",
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
