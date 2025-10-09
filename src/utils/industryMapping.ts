import type { IndustryType } from '../types'

/**
 * Mapeo de specialization (del JSON) a IndustryType
 * specialization 0 = edificios sin industria (HQ, Warehouse, Housing)
 * specialization 9 = no existe en el juego
 */
export const SPECIALIZATION_TO_INDUSTRY: Record<number, IndustryType | null> = {
  0: null, // Edificios especiales sin industria
  1: 'Construction',
  2: 'Manufacturing',
  3: 'Agriculture',
  4: 'Resource Extraction',
  5: 'Metallurgy',
  6: 'Chemistry',
  7: 'Electronics',
  8: 'Food Production',
  10: 'Science',
}

/**
 * Convierte un código de specialization a IndustryType
 * @param specialization - Código numérico del JSON
 * @returns IndustryType correspondiente o null si no aplica
 */
export function getIndustryType(specialization: number): IndustryType | null {
  return SPECIALIZATION_TO_INDUSTRY[specialization] ?? null
}
