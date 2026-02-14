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
  technologies?: Array<{
    id: number
    level: number
  }>
  startingBonus?: number
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
 * RAW Warehouse stock response from API (before transformation)
 * Actual format from /public/company/warehouse/{warehouseId} endpoint
 */
export type WarehouseStockRawResponse = {
  cap: number // Warehouse capacity
  id: number // Warehouse ID
  mats: Array<{
    id: number // Material ID
    am: number // Amount (Bestand)
  }>
}

/**
 * Warehouse stock response (transformed to internal format)
 * Internal representation after ETL
 */
export type WarehouseStockResponse = {
  warehouseId: number // gameWarehouseId
  items: WarehouseItem[]
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

/** Raw response for a single game base from /public/company/base/{id} */
export type GameBaseRaw = {
  id: number
  name: string
  planetId: number
  warehouseId?: number
  buildingSlots?: Array<{
    status: number // 0=Undefined, 1=Empty, 2=Building, 3=Debris, 4=Premium
    building?: {
      type: number // buildingId
      level?: number
    }
  }>
  productionOrders?: Array<{
    rId: number // recipeId
    amt: number // quantity/amount
  }>
}

/** Normalized/Transformed representation used by the app */
export type GameBaseTransformed = {
  id: number
  name: string
  planetId: number
  warehouseId?: number
  buildingSlots: Array<{
    buildingId: number
    slot: number
    level?: number
  }>
  productionOrders: Array<{
    recipeId: number
    quantity: number
  }>
}
