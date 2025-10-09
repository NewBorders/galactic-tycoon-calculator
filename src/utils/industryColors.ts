import type { IndustryType } from '../types'

/**
 * Color mapping for each industry type
 * Using Tailwind-compatible color classes
 */
export const INDUSTRY_COLORS: Record<IndustryType, { bg: string; text: string; border: string }> = {
  'Agriculture': {
    bg: 'bg-green-900/40',
    text: 'text-green-300',
    border: 'border-green-700'
  },
  'Chemistry': {
    bg: 'bg-cyan-900/40',
    text: 'text-cyan-300',
    border: 'border-cyan-700'
  },
  'Construction': {
    bg: 'bg-orange-900/40',
    text: 'text-orange-300',
    border: 'border-orange-700'
  },
  'Electronics': {
    bg: 'bg-blue-900/40',
    text: 'text-blue-300',
    border: 'border-blue-700'
  },
  'Food Production': {
    bg: 'bg-lime-900/40',
    text: 'text-lime-300',
    border: 'border-lime-700'
  },
  'Manufacturing': {
    bg: 'bg-slate-900/40',
    text: 'text-slate-300',
    border: 'border-slate-700'
  },
  'Metallurgy': {
    bg: 'bg-gray-700/40',
    text: 'text-gray-300',
    border: 'border-gray-600'
  },
  'Resource Extraction': {
    bg: 'bg-amber-900/40',
    text: 'text-amber-300',
    border: 'border-amber-700'
  },
  'Residential': {
    bg: 'bg-purple-900/40',
    text: 'text-purple-300',
    border: 'border-purple-700'
  },
  'Science': {
    bg: 'bg-indigo-900/40',
    text: 'text-indigo-300',
    border: 'border-indigo-700'
  }
}

/**
 * Get the color classes for an industry type
 */
export function getIndustryColors(industryType: IndustryType) {
  return INDUSTRY_COLORS[industryType]
}

/**
 * Get background color class for an industry
 */
export function getIndustryBgColor(industryType: IndustryType): string {
  return INDUSTRY_COLORS[industryType].bg
}

/**
 * Get text color class for an industry
 */
export function getIndustryTextColor(industryType: IndustryType): string {
  return INDUSTRY_COLORS[industryType].text
}

/**
 * Get border color class for an industry
 */
export function getIndustryBorderColor(industryType: IndustryType): string {
  return INDUSTRY_COLORS[industryType].border
}
