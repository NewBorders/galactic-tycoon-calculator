import { describe, it, expect } from 'vitest'
import { normalizeIconId, ALL_ICON_OVERRIDES } from '../iconOverrides'
import { resolveIconId } from '../spriteIndex'

describe('iconOverrides', () => {
  it('removes spaces by default (preserve casing/other chars)', () => {
    expect(normalizeIconId('Advanced Research Data')).toBe('AdvancedResearchData')
    expect(normalizeIconId('steel plate')).toBe('steelplate')
    expect(normalizeIconId('Food-Rations')).toBe('Food-Rations')
    expect(normalizeIconId('  multi   space  name ')).toBe('multispacename')
  })

  it('has manual overrides for known materials', () => {
    expect(ALL_ICON_OVERRIDES['Iron']).toBe('IronBar')
    expect(ALL_ICON_OVERRIDES['Tools']).toBe('BasicTools')
  })

  it('resolveIconId applies overrides and normalization', () => {
    // Manual overrides take priority
    expect(resolveIconId('Iron')).toBe('IronBar')
    expect(resolveIconId('Tools')).toBe('BasicTools')
    
    // Falls back to space removal for unknown materials
    expect(resolveIconId('Advanced Research Data')).toBe('AdvancedResearchData')
    expect(resolveIconId('Some New Material')).toBe('SomeNewMaterial')
  })
})
