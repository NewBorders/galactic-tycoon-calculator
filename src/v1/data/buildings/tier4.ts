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
      extradimensional_ftl_emitter: {
        id: 169,
        name: 'Extra-dimensional FTL Emitter',
        time: 900,
        inputs: { quadranium: 2, field_cooling_system: 3, ftl_field_controller: 1 },
        outputs: { extradimensional_ftl_emitter: 1 },
      },
      antimatter_reactor: {
        id: 182,
        name: 'Antimatter Reactor',
        time: 3600,
        inputs: { starglass: 10, antimatter_containment: 5, antimatter: 15, quantum_mainframe: 1 },
        outputs: { antimatter_reactor: 1 },
      },
      freighter_bridge: {
        id: 185,
        name: 'Freighter Bridge',
        time: 2400,
        inputs: { starglass: 40, nanoweave_shielding: 10, life_support_system: 5, aicore: 1, ftl_field_controller: 2 },
        outputs: { freighter_bridge: 1 },
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
      antimatter_containment: {
        id: 17,
        name: 'Antimatter Containment',
        time: 240,
        inputs: { graphenium: 1, superconducting_coil: 3 },
        outputs: { antimatter_containment: 1 },
      },
      quadranium: {
        id: 93,
        name: 'Quadranium',
        time: 285,
        inputs: { tesserite: 5, kryon: 2 },
        outputs: { quadranium: 3 },
      },
      antimatter: {
        id: 162,
        name: 'Antimatter',
        time: 420,
        inputs: { hydrogen: 100, antimatter_containment: 1 },
        outputs: { antimatter: 1 },
      },
      starglass: {
        id: 178,
        name: 'Starglass',
        time: 225,
        inputs: { quadranium: 1, graphenium: 2, kryon: 2 },
        outputs: { starglass: 1 },
      },
      graphenium: {
        id: 187,
        name: 'Graphenium',
        time: 135,
        inputs: { graphene: 5, tesserite: 3, kryon: 1 },
        outputs: { graphenium: 1 },
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
        id: 180,
        name: 'Quantum Research Data',
        time: 900,
        inputs: { quadranium: 1, apex_research_data: 3, quantum_mainframe: 1 },
        outputs: { quantum_research_data: 1 },
      },
      aicore: {
        id: 189,
        name: 'AICore',
        time: 1680,
        inputs: { artificial_intelligence: 6, quantum_mainframe: 1 },
        outputs: { aicore: 1 },
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
      superconducting_coil: {
        id: 157,
        name: 'Superconducting Coil',
        time: 135,
        inputs: { graphenium: 1, copper_wire: 25 },
        outputs: { superconducting_coil: 4 },
      },
      graphenium_wire: {
        id: 176,
        name: 'Graphenium Wire',
        time: 120,
        inputs: { graphenium: 1 },
        outputs: { graphenium_wire: 5 },
      },
      starglass_hull_plate: {
        id: 179,
        name: 'Starglass Hull Plate',
        time: 900,
        inputs: { starglass: 2, starlifter_structural_elements: 1, molecular_fusion_kit: 2 },
        outputs: { starglass_hull_plate: 1 },
      },
      neural_interface: {
        id: 184,
        name: 'Neural Interface',
        time: 360,
        inputs: { biopolyne: 2, nanites: 3, quantum_mainframe: 1 },
        outputs: { neural_interface: 1 },
      },
      quantum_mainframe: {
        id: 190,
        name: 'Quantum Mainframe',
        time: 540,
        inputs: { quadranium: 2, field_cooling_system: 2, graphenium_wire: 15 },
        outputs: { quantum_mainframe: 1 },
      },
    },
  },
}
