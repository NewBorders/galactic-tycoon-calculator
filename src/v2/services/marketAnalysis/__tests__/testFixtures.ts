/**
 * Test Fixtures for Market Analysis
 * Helper functions to create test data matching the actual API format
 */

import type { MaterialDetailsRaw } from '../types'

/**
 * Create a test material with realistic API format
 */
export function createTestMaterial(overrides: Partial<MaterialDetailsRaw> = {}): MaterialDetailsRaw {
  return {
    matId: 1,
    matName: 'Iron Ore',
    currentPrice: 6400,
    avgPrice: 5753,
    totalQtyAvailable: 3456,
    orders: [
      {
        cId: 1,
        cName: 'Test Corp',
        unitPrice: 6400,
        qty: 1000,
      },
    ],
    avgQtySoldDaily: 20708,
    priceHistory: [
      {
        date: '2025-11-27',
        avgPrice: 6341,
        qtySold: 9737,
        qtyRemaining: 3456,
      },
      {
        date: '2025-11-26',
        avgPrice: 5999,
        qtySold: 28414,
        qtyRemaining: 284,
      },
      {
        date: '2025-11-25',
        avgPrice: 5865,
        qtySold: 20891,
        qtyRemaining: 5226,
      },
      {
        date: '2025-11-24',
        avgPrice: 6146,
        qtySold: 27522,
        qtyRemaining: 4589,
      },
      {
        date: '2025-11-23',
        avgPrice: 6048,
        qtySold: 29485,
        qtyRemaining: 2033,
      },
      {
        date: '2025-11-22',
        avgPrice: 6307,
        qtySold: 23163,
        qtyRemaining: 661,
      },
      {
        date: '2025-11-21',
        avgPrice: 5106,
        qtySold: 20241,
        qtyRemaining: 1777,
      },
    ],
    ...overrides,
  }
}

/**
 * Create a rising price trend material
 */
export function createRisingTrendMaterial(matId = 1): MaterialDetailsRaw {
  return createTestMaterial({
    matId,
    currentPrice: 120,
    avgPrice: 100,
    avgQtySoldDaily: 500,
    priceHistory: [
      { date: '2025-11-27', avgPrice: 110, qtySold: 500, qtyRemaining: 100 },
      { date: '2025-11-26', avgPrice: 105, qtySold: 500, qtyRemaining: 100 },
      { date: '2025-11-25', avgPrice: 100, qtySold: 500, qtyRemaining: 100 },
      { date: '2025-11-24', avgPrice: 95, qtySold: 500, qtyRemaining: 100 },
      { date: '2025-11-23', avgPrice: 90, qtySold: 500, qtyRemaining: 100 },
      { date: '2025-11-22', avgPrice: 85, qtySold: 500, qtyRemaining: 100 },
      { date: '2025-11-21', avgPrice: 80, qtySold: 500, qtyRemaining: 100 },
    ],
  })
}

/**
 * Create a falling price trend material
 */
export function createFallingTrendMaterial(matId = 2): MaterialDetailsRaw {
  return createTestMaterial({
    matId,
    currentPrice: 80,
    avgPrice: 100,
    avgQtySoldDaily: 300,
    priceHistory: [
      { date: '2025-11-27', avgPrice: 90, qtySold: 300, qtyRemaining: 200 },
      { date: '2025-11-26', avgPrice: 95, qtySold: 300, qtyRemaining: 200 },
      { date: '2025-11-25', avgPrice: 100, qtySold: 300, qtyRemaining: 200 },
      { date: '2025-11-24', avgPrice: 105, qtySold: 300, qtyRemaining: 200 },
      { date: '2025-11-23', avgPrice: 110, qtySold: 300, qtyRemaining: 200 },
      { date: '2025-11-22', avgPrice: 115, qtySold: 300, qtyRemaining: 200 },
      { date: '2025-11-21', avgPrice: 120, qtySold: 300, qtyRemaining: 200 },
    ],
  })
}

/**
 * Create a stable price trend material
 */
export function createStableTrendMaterial(matId = 3): MaterialDetailsRaw {
  return createTestMaterial({
    matId,
    currentPrice: 102,
    avgPrice: 100,
    avgQtySoldDaily: 400,
    priceHistory: [
      { date: '2025-11-27', avgPrice: 101, qtySold: 400, qtyRemaining: 150 },
      { date: '2025-11-26', avgPrice: 100, qtySold: 400, qtyRemaining: 150 },
      { date: '2025-11-25', avgPrice: 99, qtySold: 400, qtyRemaining: 150 },
      { date: '2025-11-24', avgPrice: 100, qtySold: 400, qtyRemaining: 150 },
      { date: '2025-11-23', avgPrice: 101, qtySold: 400, qtyRemaining: 150 },
      { date: '2025-11-22', avgPrice: 100, qtySold: 400, qtyRemaining: 150 },
      { date: '2025-11-21', avgPrice: 99, qtySold: 400, qtyRemaining: 150 },
    ],
  })
}

/**
 * Create high demand material
 */
export function createHighDemandMaterial(matId = 4): MaterialDetailsRaw {
  return createTestMaterial({
    matId,
    avgQtySoldDaily: 5000, // High revenue: 5000 * 150 = 750k cents/day (>$5k/day threshold)
    avgPrice: 150,
    priceHistory: [
      { date: '2025-11-27', avgPrice: 150, qtySold: 5000, qtyRemaining: 1000 },
      { date: '2025-11-26', avgPrice: 150, qtySold: 5000, qtyRemaining: 1000 },
      { date: '2025-11-25', avgPrice: 150, qtySold: 5000, qtyRemaining: 1000 },
      { date: '2025-11-24', avgPrice: 150, qtySold: 5000, qtyRemaining: 1000 },
      { date: '2025-11-23', avgPrice: 150, qtySold: 5000, qtyRemaining: 1000 },
      { date: '2025-11-22', avgPrice: 150, qtySold: 5000, qtyRemaining: 1000 },
      { date: '2025-11-21', avgPrice: 150, qtySold: 5000, qtyRemaining: 1000 },
    ],
  })
}

/**
 * Create medium demand material
 */
export function createMediumDemandMaterial(matId = 5): MaterialDetailsRaw {
  return createTestMaterial({
    matId,
    avgQtySoldDaily: 500, // 100-1000 = medium
    priceHistory: [
      { date: '2025-11-27', avgPrice: 100, qtySold: 500, qtyRemaining: 500 },
      { date: '2025-11-26', avgPrice: 100, qtySold: 500, qtyRemaining: 500 },
      { date: '2025-11-25', avgPrice: 100, qtySold: 500, qtyRemaining: 500 },
      { date: '2025-11-24', avgPrice: 100, qtySold: 500, qtyRemaining: 500 },
      { date: '2025-11-23', avgPrice: 100, qtySold: 500, qtyRemaining: 500 },
      { date: '2025-11-22', avgPrice: 100, qtySold: 500, qtyRemaining: 500 },
      { date: '2025-11-21', avgPrice: 100, qtySold: 500, qtyRemaining: 500 },
    ],
  })
}

/**
 * Create low demand material
 */
export function createLowDemandMaterial(matId = 6): MaterialDetailsRaw {
  return createTestMaterial({
    matId,
    avgQtySoldDaily: 50, // < 100 = low
    priceHistory: [
      { date: '2025-11-27', avgPrice: 100, qtySold: 50, qtyRemaining: 2000 },
      { date: '2025-11-26', avgPrice: 100, qtySold: 50, qtyRemaining: 2000 },
      { date: '2025-11-25', avgPrice: 100, qtySold: 50, qtyRemaining: 2000 },
      { date: '2025-11-24', avgPrice: 100, qtySold: 50, qtyRemaining: 2000 },
      { date: '2025-11-23', avgPrice: 100, qtySold: 50, qtyRemaining: 2000 },
      { date: '2025-11-22', avgPrice: 100, qtySold: 50, qtyRemaining: 2000 },
      { date: '2025-11-21', avgPrice: 100, qtySold: 50, qtyRemaining: 2000 },
    ],
  })
}

/**
 * Create material with no history (should return null for trend/demand)
 */
export function createNoHistoryMaterial(matId = 7): MaterialDetailsRaw {
  return createTestMaterial({
    matId,
    priceHistory: [],
  })
}

/**
 * Create oversupplied material (high supply vs demand)
 */
export function createOversuppliedMaterial(matId = 8): MaterialDetailsRaw {
  return createTestMaterial({
    matId,
    totalQtyAvailable: 10000,
    avgQtySoldDaily: 1000, // 10 days of supply
  })
}

/**
 * Create undersupplied material (low supply vs demand)
 */
export function createUndersuppliedMaterial(matId = 9): MaterialDetailsRaw {
  return createTestMaterial({
    matId,
    totalQtyAvailable: 500,
    avgQtySoldDaily: 1000, // 0.5 days of supply
  })
}

/**
 * Create balanced material
 */
export function createBalancedMaterial(matId = 10): MaterialDetailsRaw {
  return createTestMaterial({
    matId,
    totalQtyAvailable: 2000,
    avgQtySoldDaily: 1000, // 2 days of supply
  })
}
