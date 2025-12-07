/**
 * API Key Validation Service
 * Validates API keys by testing all required endpoints
 */

import { loadGameData } from '../gamedata/service'
import { fetchCompanyBases, fetchGameBaseDetails, fetchWarehouseStockForBase } from './warehouseService'
import { extractMarketDetails } from '../marketAnalysis/extractor'
import type { World } from './types'

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  details: {
    gamedata: boolean
    company: boolean
    bases: number // number of bases validated
    warehouses: number // number of warehouses validated
    marketDetails: boolean
  }
}

export interface SimpleValidationResult {
  valid: boolean
  error?: string
  status?: number
}

export interface ValidationError {
  endpoint: string
  error: string
  status?: number
}

/**
 * Simple API key validation - only tests Company Data endpoint
 * Use this for quick validation in landing page and initial setup
 */
export async function validateApiKeySimple(apiKey: string, world: World): Promise<SimpleValidationResult> {
  try {
    await fetchCompanyBases(apiKey, world, true)
    return { valid: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const status = extractHttpStatus(errorMsg)
    return {
      valid: false,
      error: errorMsg,
      status,
    }
  }
}

/**
 * Validates an API key by calling all required endpoints
 * Returns detailed information about which endpoints succeeded/failed
 * Use this for comprehensive validation when debugging or in admin panels
 */
export async function validateApiKey(apiKey: string, world: World): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const details = {
    gamedata: false,
    company: false,
    bases: 0,
    warehouses: 0,
    marketDetails: false,
  }

  // 1. Validate Gamedata (public endpoint, no API key needed)
  try {
    await loadGameData(true)
    details.gamedata = true
  } catch (error) {
    errors.push({
      endpoint: '/gamedata.json',
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // 2. Validate Company endpoint (requires API key)
  let companyBases: Array<{ id: number; warehouseId?: number }> = []
  try {
    const result = await fetchCompanyBases(apiKey, world, true)
    details.company = true
    companyBases = result.data.bases || []
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const status = extractHttpStatus(errorMsg)
    errors.push({
      endpoint: '/public/company',
      error: errorMsg,
      status,
    })
  }

  // 3. Validate Base Details for each base (requires API key)
  for (const base of companyBases) {
    try {
      await fetchGameBaseDetails(apiKey, base.id, world)
      details.bases++
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      const status = extractHttpStatus(errorMsg)
      errors.push({
        endpoint: `/public/company/base/${base.id}`,
        error: errorMsg,
        status,
      })
    }
  }

  // 4. Validate Warehouse for each base (requires API key)
  for (const base of companyBases) {
    if (!base.warehouseId) continue
    try {
      await fetchWarehouseStockForBase(apiKey, base.warehouseId, world, true)
      details.warehouses++
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      const status = extractHttpStatus(errorMsg)
      errors.push({
        endpoint: `/public/company/warehouse/${base.warehouseId}`,
        error: errorMsg,
        status,
      })
    }
  }

  // 5. Validate Market Details (requires API key)
  try {
    await extractMarketDetails(apiKey, world, true)
    details.marketDetails = true
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const status = extractHttpStatus(errorMsg)
    errors.push({
      endpoint: '/public/exchange/mat-details',
      error: errorMsg,
      status,
    })
  }

  // API key is valid if all critical endpoints succeeded
  const valid =
    details.gamedata &&
    details.company &&
    details.marketDetails &&
    details.bases === companyBases.length &&
    details.warehouses === companyBases.filter((b) => b.warehouseId).length

  return {
    valid,
    errors,
    details,
  }
}

/**
 * Extract HTTP status code from error message
 */
function extractHttpStatus(errorMsg: string): number | undefined {
  const match = errorMsg.match(/\b(401|403|404|429|500|502|503)\b/)
  return match ? parseInt(match[1]!, 10) : undefined
}
