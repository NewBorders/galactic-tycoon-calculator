import type { Building } from '../../types'

/**
 * Tier 4 Buildings - Cutting-edge facilities
 */
export const TIER4_BUILDINGS: Record<string, Building> = {
  stellar_suites: {
    id: 23,
    name: 'Stellar Suites',
    description: 'Luxury housing for elite specialists',
    workers: 0,
    workersByTier: [0, 0, 0, 0],
    industryType: 'Residential',
    tier: 4,
    recipes: {},
  },

  shipyard: {
    id: 30,
    name: 'Shipyard',
    description: '',
    workers: 80,
    workersByTier: [0, 0, 40, 40],
    industryType: 'Manufacturing',
    tier: 4,
    recipes: {
      starlifter_structural_elements: {
        id: 185,
        name: 'Starlifter Structural Elements',
        time: 550,
        inputs: {
          pipes: 5,
          starglass: 5,
          biopolyne: 2,
          molecular_fusion_kit: 1,
          graphenium_wire: 5,
        },
        outputs: {
          starlifter_structural_elements: 1,
        },
      },
      antimatter_reactor: {
        id: 169,
        name: 'Antimatter Reactor',
        time: 1800,
        inputs: {
          starglass: 20,
          antimatter_containment: 10,
          graphenium_wire: 5,
          quantum_mainframe: 1,
        },
        outputs: {
          antimatter_reactor: 1,
        },
      },
      freighter_bridge: {
        id: 182,
        name: 'Freighter Bridge',
        time: 1080,
        inputs: {
          biopolyne: 15,
          life_support_system: 4,
          sensor_array: 3,
          aicore: 1,
          neural_interface: 2,
        },
        outputs: {
          freighter_bridge: 1,
        },
      },
    },
  },

  exotic_matter_lab: {
    id: 33,
    name: 'Exotic Matter Lab',
    description: '',
    workers: 60,
    workersByTier: [0, 0, 0, 60],
    industryType: 'Chemistry',
    tier: 4,
    recipes: {
      nanoweave_shielding: {
        id: 162,
        name: 'Nanoweave Shielding',
        time: 150,
        inputs: {
          tiridium_alloy: 1,
          nanoweave: 5,
          aerogel: 8,
        },
        outputs: {
          nanoweave_shielding: 2,
        },
      },
      biopolyne: {
        id: 178,
        name: 'Biopolyne',
        time: 75,
        inputs: {
          bioxene: 2,
          kryon: 1,
          nanoweave: 3,
        },
        outputs: {
          biopolyne: 5,
        },
      },
      quadranium: {
        id: 93,
        name: 'Quadranium',
        time: 45,
        inputs: {
          tesserite: 1,
          kryon: 1,
          sulfuric_acid: 4,
        },
        outputs: {
          quadranium: 1,
        },
      },
      starglass: {
        id: 187,
        name: 'Starglass',
        time: 150,
        inputs: {
          kryon: 2,
          carbon_nanotubes: 2,
          quadranium: 1,
          aerogel: 3,
        },
        outputs: {
          starglass: 2,
        },
      },
      antimatter: {
        id: 17,
        name: 'Antimatter',
        time: 180,
        inputs: {
          hydrogen: 5,
          kryon: 5,
          quadranium: 1,
          antimatter_containment: 1,
          superconducting_coil: 3,
        },
        outputs: {
          antimatter: 1,
        },
      },
    },
  },

  quantum_nexus: {
    id: 38,
    name: 'Quantum Nexus',
    description: '',
    workers: 80,
    workersByTier: [0, 0, 0, 80],
    industryType: 'Science',
    tier: 4,
    recipes: {
      quantum_research_data: {
        id: 189,
        name: 'Quantum Research Data',
        time: 720,
        inputs: {
          bioxene: 10,
          biopolyne: 5,
          quantum_mainframe: 1,
        },
        outputs: {
          quantum_research_data: 2,
        },
      },
      quantum_research_data_alt: {
        id: 180,
        name: 'Quantum Research Data (Alternative)',
        time: 1155,
        inputs: {
          quadranium: 5,
          superconducting_coil: 10,
          aicore: 1,
        },
        outputs: {
          quantum_research_data: 5,
        },
      },
    },
  },

  quantum_factory: {
    id: 42,
    name: 'Quantum Factory',
    description: '',
    workers: 80,
    workersByTier: [0, 0, 40, 40],
    industryType: 'Electronics',
    tier: 4,
    recipes: {
      quantum_mainframe: {
        id: 190,
        name: 'Quantum Mainframe',
        time: 450,
        inputs: {
          nanoweave_shielding: 1,
          field_cooling_system: 1,
          graphenium_wire: 5,
          operating_system: 1,
        },
        outputs: {
          quantum_mainframe: 1,
        },
      },
      aicore: {
        id: 157,
        name: 'AICore',
        time: 405,
        inputs: {
          field_cooling_system: 1,
          control_console: 1,
          quantum_mainframe: 1,
          artificial_intelligence: 1,
        },
        outputs: {
          aicore: 1,
        },
      },
      extra_dimensional_ftl_emitter: {
        id: 176,
        name: 'Extra-dimensional FTL Emitter',
        time: 630,
        inputs: {
          starglass: 5,
          field_cooling_system: 1,
          ftl_field_controller: 1,
          superconducting_coil: 3,
        },
        outputs: {
          extra_dimensional_ftl_emitter: 2,
        },
      },
      nanites: {
        id: 179,
        name: 'Nanites',
        time: 120,
        inputs: {
          starglass: 1,
          battery: 1,
          advanced_processing_unit: 1,
        },
        outputs: {
          nanites: 10,
        },
      },
      neural_interface: {
        id: 184,
        name: 'Neural Interface',
        time: 360,
        inputs: {
          biopolyne: 3,
          advanced_processing_unit: 2,
          graphenium_wire: 5,
        },
        outputs: {
          neural_interface: 2,
        },
      },
    },
  },
}
