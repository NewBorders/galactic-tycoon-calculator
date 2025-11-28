import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { resolveIconId } from '../spriteIndex'

type FallbackGameData = {
  materials: Array<{ id: number; name: string }>
}

describe('icon coverage snapshot (non-failing)', () => {
  it('parses sprite symbols and reports unmapped materials (informational)', () => {
    const spritePath = path.resolve(__dirname, '../../../../public/galactic_tycoon_sprites.svg')
    const dataPath = path.resolve(__dirname, '../../../../public/gamedata.fallback.json')

    const sprite = fs.readFileSync(spritePath, 'utf8')
    const svgIds = new Set<string>()
    for (const m of sprite.matchAll(/<symbol\s+[^>]*id="([^"]+)"/g)) {
      svgIds.add(m[1])
    }

    const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as FallbackGameData
    const materials = raw.materials ?? []

    expect(svgIds.size).toBeGreaterThan(0)
    expect(materials.length).toBeGreaterThan(0)

    const missing: Array<{ id: number; name: string; resolved: string }> = []
    materials.forEach((m) => {
      const resolved = resolveIconId(m.name)
      if (!svgIds.has(resolved)) {
        missing.push({ id: m.id, name: m.name, resolved })
      }
    })

    // Log small sample for manual override curation; keep test non-failing
    const sample = missing.slice(0, 20)
    if (sample.length) {

      console.warn('[IconCoverage] Missing icons (sample):', sample)
    }

    // Non-failing assertion to keep this informational
    expect(typeof missing.length).toBe('number')
  })
})
