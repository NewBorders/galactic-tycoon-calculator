/**
 * API Response types for Galactic Tycoons API
 * Based on: https://api.g1.galactictycoons.com/swagger/index.html
 */

export type World = 'g1' | 'g2'

/**
 * Company information with bases
 */
export type CompanyResponse = {
  id: number
  name: string
  money: number
  bases: CompanyBase[]
}

/**
 * Base information from /public/company endpoint
 */
export type CompanyBase = {
  id: number // gameBaseId
  name: string
  planetId: number
  warehouseId: number // gameWarehouseId
  x: number
  y: number
}

/**
 * Warehouse stock response from /public/company/warehouse/{warehouseId} endpoint
 */
export type WarehouseStockResponse = {
  baseId: number // gameBaseId
  warehouseId: number // gameWarehouseId
  items: WarehouseItem[]
  lastUpdated: string
}

/**
 * Individual warehouse stock item
 */
export type WarehouseItem = {
  materialId: number
  quantity: number
}

/**
 * All warehouse stocks for a company
 */
export type AllWarehousesResponse = {
  warehouses: WarehouseStockResponse[]
  lastUpdated: string
}

/**
 * Enriched player base with API information
 */
export type PlayerBaseWithApiInfo = {
  gameBaseId?: number
  gameWarehouseId?: number
  lastStockRefresh?: number
}
