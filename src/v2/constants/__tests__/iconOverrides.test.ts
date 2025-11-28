import { describe, it, expect } from 'vitest'
import { resolveIconIdFromName, normalizeIconId } from '../iconOverrides'

describe('iconOverrides', () => {
  it('removes spaces by default (preserve casing/other chars)', () => {
    expect(normalizeIconId('Advanced Research Data')).toBe('AdvancedResearchData')
    expect(normalizeIconId('steel plate')).toBe('steelplate')
    expect(normalizeIconId('Food-Rations')).toBe('Food-Rations')
    expect(normalizeIconId('  multi   space  name ')).toBe('multispacename')
  })

  it('applies manual overrides when present', () => {
    expect(resolveIconIdFromName('Iron')).toBe('IronBar')
    expect(resolveIconIdFromName('Tools')).toBe('BasicTools')
  })

  it('falls back to removing spaces when no override exists', () => {
    expect(resolveIconIdFromName('Advanced Research Data')).toBe('AdvancedResearchData')
    expect(resolveIconIdFromName('Some New Material')).toBe('SomeNewMaterial')
  })
})
