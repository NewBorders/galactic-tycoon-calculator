import type { Building } from '../../types'

/**
 * Tier 3 Buildings - High-tech facilities
 */
export const TIER3_BUILDINGS: Record<string, Building> = {
  comfort_quarters: {
    id: 22,
    name: 'Comfort Quarters',
    description: 'Advanced housing for skilled workers',
    workers: 0,
    workersByTier: [0, 0, 0, 0],
    industryType: 'Residential',
    tier: 3,
    recipes: {},
  },

  science_institute: {
    id: 28,
    name: 'Science Institute',
    description: '',
    workers: 70,
    workersByTier: [0, 0, 70, 0],
    industryType: 'Science',
    tier: 3,
    recipes: {
      apex_research_data: {
        id: 105,
        name: 'Apex Research Data',
        time: 240,
        inputs: {
          bioxene: 2,
          nanopolyne: 6,
          titanium_carbide_drill: 1,
          vr_headset: 1,
        },
        outputs: {
          apex_research_data: 1,
        },
      },
      operating_system: {
        id: 166,
        name: 'Operating System',
        time: 90,
        inputs: {
          consumer_electronics: 1,
        },
        outputs: {
          operating_system: 1,
        },
      },
      ai_training_data: {
        id: 168,
        name: 'AI Training Data',
        time: 365,
        inputs: {
          vr_headset: 1,
          mainframe: 1,
          advanced_research_data: 1,
        },
        outputs: {
          ai_training_data: 5,
        },
      },
      apex_research_data_alt: {
        id: 135,
        name: 'Apex Research Data',
        time: 615,
        inputs: {
          mainframe: 1,
          sensor_array: 1,
          artificial_intelligence: 1,
        },
        outputs: {
          apex_research_data: 4,
        },
      },
      artificial_intelligence: {
        id: 167,
        name: 'Artificial Intelligence',
        time: 120,
        inputs: {
          consumer_electronics: 1,
          ai_training_data: 1,
        },
        outputs: {
          artificial_intelligence: 1,
        },
      },
    },
  },

  micronics_factory: {
    id: 31,
    name: 'Micronics Factory',
    description: '',
    workers: 75,
    workersByTier: [0, 0, 75, 0],
    industryType: 'Electronics',
    tier: 3,
    recipes: {
      vr_headset: {
        id: 120,
        name: 'VR Headset',
        time: 105,
        inputs: {
          reinforced_glass: 2,
          nanopolyne: 5,
          epoxy: 4,
          advanced_processing_unit: 1,
        },
        outputs: {
          vr_headset: 3,
        },
      },
      mainframe: {
        id: 156,
        name: 'Mainframe',
        time: 150,
        inputs: {
          aluminium: 2,
          cooling_system: 1,
          advanced_circuit_board: 1,
          advanced_processing_unit: 2,
          operating_system: 1,
        },
        outputs: {
          mainframe: 1,
        },
      },
      ftl_field_controller: {
        id: 117,
        name: 'FTL Field Controller',
        time: 300,
        inputs: {
          aerogel: 10,
          control_console: 1,
          copper_wire: 20,
          advanced_processing_unit: 1,
        },
        outputs: {
          ftl_field_controller: 1,
        },
      },
      spectra_modulator: {
        id: 98,
        name: 'Spectra Modulator',
        time: 105,
        inputs: {
          platinum: 1,
          reinforced_glass: 4,
          carbon_nanotubes: 1,
          advanced_processing_unit: 1,
        },
        outputs: {
          spectra_modulator: 8,
        },
      },
      quantum_ftl_ermitter: {
        id: 147,
        name: 'Quantum FTL Emitter',
        time: 360,
        inputs: {
          tiridium_alloy: 1,
          cooling_system: 1,
          ftl_field_controller: 1,
          radiation_shielding: 1,
        },
        outputs: {
          quantum_ftl_emitter: 1,
        },
      },
      superconducting_coil: {
        id: 145,
        name: 'Superconducting Coil',
        time: 150,
        inputs: {
          tiridium_alloy: 1,
          graphenium_wire: 6,
        },
        outputs: {
          superconducting_coil: 6,
        },
      },
    },
  },

  advanced_materials_lab: {
    id: 32,
    name: 'Advanced Materials Lab',
    description: '',
    workers: 80,
    workersByTier: [0, 40, 40, 0],
    industryType: 'Metallurgy',
    tier: 3,
    recipes: {
      aeridium: {
        id: 152,
        name: 'Aeridium',
        time: 90,
        inputs: { aeridium_ore: 2, argon: 2, sulfuric_acid: 5 },
        outputs: { aeridium: 2 },
      },
      tiridium_alloy: {
        id: 153,
        name: 'Tiridium Alloy',
        time: 75,
        inputs: { titanium: 1, aeridium: 1, argon: 2, graphene: 1 },
        outputs: { tiridium_alloy: 1 },
      },
      graphenium: {
        id: 188,
        name: 'Graphenium',
        time: 360,
        inputs: {
          lithium: 2,
          bioxene: 2,
          graphene: 3,
          quadranium: 1,
        },
        outputs: {
          graphenium: 2,
        },
      },
      graphenium_wire: {
        id: 100,
        name: 'Graphenium Wire',
        time: 150,
        inputs: {
          kryon: 5,
          graphenium: 1,
        },
        outputs: {
          graphenium_wire: 8,
        },
      },
    },
  },

  aquaponics_farm: {
    id: 34,
    name: 'Aquaponics Farm',
    description: '',
    workers: 75,
    workersByTier: [0, 0, 75, 0],
    industryType: 'Agriculture',
    tier: 3,
    recipes: {
      lobster: {
        id: 170,
        name: 'Lobster',
        time: 75,
        inputs: {
          herbs: 5,
          water: 15,
          bio_nutrient_blend: 5,
        },
        outputs: {
          lobster: 5,
        },
      },
      exotic_spices: {
        id: 172,
        name: 'Exotic Spices',
        time: 75,
        inputs: {
          water: 16,
          bio_nutrient_blend: 5,
        },
        outputs: {
          exotic_spices: 5,
        },
      },
    },
  },

  robotics_facility: {
    id: 35,
    name: 'Robotics Facility',
    description: '',
    workers: 75,
    workersByTier: [0, 0, 75, 0],
    industryType: 'Manufacturing',
    tier: 3,
    recipes: {
      molecular_fusion_kit: {
        id: 101,
        name: 'Molecular Fusion Kit',
        time: 210,
        inputs: {
          bioxene: 3,
          consumer_electronics: 2,
          battery: 2,
          copper_wire: 10,
          heat_shielding: 1,
        },
        outputs: {
          molecular_fusion_kit: 8,
        },
      },
      filtration_system: {
        id: 181,
        name: 'Filtration System',
        time: 135,
        inputs: {
          aeridium: 1,
          carbon_nanotubes: 1,
          pump: 1,
        },
        outputs: {
          filtration_system: 2,
        },
      },
      robot: {
        id: 102,
        name: 'Robot',
        time: 150,
        inputs: {
          aluminium: 3,
          graphene: 2,
          electric_motor: 1,
          advanced_circuit_board: 1,
        },
        outputs: {
          robot: 3,
        },
      },
      fission_reactor: {
        id: 146,
        name: 'Fission Reactor',
        time: 720,
        inputs: {
          tiridium_alloy: 5,
          cooling_system: 5,
          control_console: 1,
          sensor_array: 1,
          radiation_shielding: 5,
        },
        outputs: {
          fission_reactor: 1,
        },
      },
      hauler_bridge: {
        id: 159,
        name: 'Hauler Bridge',
        time: 700,
        inputs: {
          reinforced_glass: 5,
          life_support_system: 2,
          vr_headset: 4,
          mainframe: 2,
          sensor_array: 2,
          artificial_intelligence: 1,
        },
        outputs: {
          hauler_bridge: 1,
        },
      },
      field_cooling_system: {
        id: 191,
        name: 'Field Cooling System',
        time: 270,
        inputs: {
          platinum: 1,
          tiridium_alloy: 1,
          advanced_processing_unit: 2,
          superconducting_coil: 3,
        },
        outputs: {
          field_cooling_system: 2,
        },
      },
      antimatter_containment: {
        id: 41,
        name: 'Antimatter Containment',
        time: 150,
        inputs: {
          argon: 2,
          starglass: 1,
          battery: 1,
          superconducting_coil: 1,
        },
        outputs: {
          antimatter_containment: 2,
        },
      },
    },
  },

  apex_prefab_plant: {
    id: 37,
    name: 'Apex Prefab Plant',
    description: '',
    workers: 80,
    workersByTier: [0, 0, 80, 0],
    industryType: 'Construction',
    tier: 3,
    recipes: {
      cohesilite: {
        id: 165,
        name: 'Cohesilite',
        time: 150,
        inputs: {
          tiridium_alloy: 1,
          concrete: 20,
          nanopolyne: 5,
        },
        outputs: {
          cohesilite: 20,
        },
      },
      ship_repair_kit_tier3: {
        id: 195,
        name: 'Ship Repair Kit',
        time: 1440,
        inputs: {
          ship_interior_kit: 3,
          fission_reactor: 1,
          hauler_bridge: 1,
          quantum_ftl_emitter: 1,
        },
        outputs: {
          ship_repair_kit: 185,
        },
      },
      apex_structural_elements: {
        id: 123,
        name: 'Apex Structural Elements',
        time: 150,
        inputs: {
          tiridium_alloy: 1,
          composite_truss: 2,
          molecular_fusion_kit: 1,
        },
        outputs: {
          apex_structural_elements: 1,
        },
      },
      apex_prefab_kit: {
        id: 164,
        name: 'Apex Prefab Kit',
        time: 150,
        inputs: {
          tiridium_alloy: 1,
          cohesilite: 10,
          epoxy: 10,
        },
        outputs: {
          apex_prefab_kit: 1,
        },
      },
      starglass_hull_plate: {
        id: 154,
        name: 'Starglass Hull Plate',
        time: 255,
        inputs: {
          starglass: 2,
          nanoweave: 10,
          molecular_fusion_kit: 2,
        },
        outputs: {
          starglass_hull_plate: 1,
        },
      },
    },
  },

  advanced_gas_collector: {
    id: 39,
    name: 'Advanced Gas Collector',
    description: '',
    workers: 40,
    workersByTier: [0, 0, 40, 0],
    industryType: 'Resource Extraction',
    tier: 3,
    recipes: {
      bioxene: {
        id: 13,
        name: 'Bioxene',
        time: 210,
        inputs: {
          filtration_system: 1,
        },
        outputs: {
          bioxene: 35,
        },
      },
      kryon: {
        id: 77,
        name: 'Kryon',
        time: 210,
        inputs: {
          filtration_system: 1,
        },
        outputs: {
          kryon: 35,
        },
      },
    },
  },

  nanomaterial_lab: {
    id: 41,
    name: 'Nanomaterial Lab',
    description: '',
    workers: 75,
    workersByTier: [0, 0, 75, 0],
    industryType: 'Chemistry',
    tier: 3,
    recipes: {
      graphene: {
        id: 85,
        name: 'Graphene',
        time: 75,
        inputs: {
          carbon: 1,
          argon: 3,
          coolant: 5,
          epoxy: 5,
        },
        outputs: {
          graphene: 7,
        },
      },
      composite_shielding: {
        id: 158,
        name: 'Composite Shielding',
        time: 210,
        inputs: {
          titanium: 1,
          graphene: 3,
          kevlar: 2,
          aerogel: 5,
        },
        outputs: {
          composite_shielding: 2,
        },
      },
      carbon_nanotubes: {
        id: 86,
        name: 'Carbon Nanotubes',
        time: 120,
        inputs: {
          titanium: 1,
          carbon: 3,
          hydrogen: 2,
          argon: 3,
        },
        outputs: {
          carbon_nanotubes: 6,
        },
      },
      nanopolyne: {
        id: 160,
        name: 'Nanopolyne',
        time: 150,
        inputs: {
          aeridium: 1,
          argon: 4,
          graphene: 4,
        },
        outputs: {
          nanopolyne: 20,
        },
      },
      nanoweave: {
        id: 161,
        name: 'Nanoweave',
        time: 105,
        inputs: {
          carbon_nanotubes: 1,
          nanopolyne: 5,
          epoxy: 5,
        },
        outputs: {
          nanoweave: 8,
        },
      },
    },
  },
}
