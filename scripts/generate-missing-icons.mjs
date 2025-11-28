#!/usr/bin/env node
// Generate full missing-icons report and update MATERIAL_ICON_OVERRIDES with 'N/A' placeholders
// - Reads public/gamedata.fallback.json (materials)
// - Reads public/galactic_tycoon_sprites.svg (symbol ids)
// - Uses resolveIconIdFromName (overrides + space-only normalization)
// - Writes missing-icons.md (alphabetical)
// - Updates src/v2/constants/iconOverrides.ts by adding 'N/A' entries for missing names, alphabetically

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import jiti from 'jiti'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const spritePath = path.resolve(root, 'public/galactic_tycoon_sprites.svg')
const dataPath = path.resolve(root, 'public/gamedata.fallback.json')
const overridesPath = path.resolve(root, 'src/v2/constants/iconOverrides.ts')
const reportPath = path.resolve(root, 'missing-icons.md')

// Load resolver and current overrides via jiti (TS/ESM friendly)
const _require = jiti(__dirname, { interopDefault: true, esmResolve: true })
const overridesMod = _require(path.resolve(root, 'src/v2/constants/iconOverrides.ts'))
const resolveIconIdFromName = overridesMod.resolveIconIdFromName
const MATERIAL_ICON_OVERRIDES = { ...overridesMod.MATERIAL_ICON_OVERRIDES }

// Build sprite symbol set
const sprite = fs.readFileSync(spritePath, 'utf8')
const svgIds = new Set()
for (const m of sprite.matchAll(/<symbol\s+[^>]*id="([^"]+)"/g)) {
  svgIds.add(m[1])
}
if (svgIds.size === 0) {
  console.error('No <symbol id> found in sprite:', spritePath)
  process.exit(1)
}

// Load materials from fallback
const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
const materials = Array.isArray(raw?.materials) ? raw.materials : []
if (materials.length === 0) {
  console.error('No materials found in fallback:', dataPath)
  process.exit(1)
}

// Determine missing
const missing = []
for (const m of materials) {
  const name = m?.name
  if (!name) continue
  const resolved = resolveIconIdFromName(name)
  if (!svgIds.has(resolved)) {
    missing.push({ id: m.id, name, resolved })
  }
}

// Sort alphabetically by material name
missing.sort((a, b) => a.name.localeCompare(b.name))

// Write report
const lines = []
lines.push('# Missing Icons Report')
lines.push('')
lines.push(`Total missing: ${missing.length}`)
lines.push('')
lines.push('| Material | Resolved ID |')
lines.push('|---|---|')
for (const m of missing) {
  lines.push(`| ${m.name} | ${m.resolved} |`)
}
fs.writeFileSync(reportPath, lines.join('\n'))

// Update overrides with 'N/A' for any missing name not already overridden
let addedCount = 0
for (const m of missing) {
  if (!(m.name in MATERIAL_ICON_OVERRIDES)) {
    MATERIAL_ICON_OVERRIDES[m.name] = 'N/A'
    addedCount++
  }
}

// Rebuild overrides file content by replacing object literal with sorted entries
const src = fs.readFileSync(overridesPath, 'utf8')
const startMarker = 'export const MATERIAL_ICON_OVERRIDES: Record<string, string> = {'
const startIdx = src.indexOf(startMarker)
if (startIdx === -1) {
  console.error('Could not find MATERIAL_ICON_OVERRIDES declaration in', overridesPath)
  process.exit(1)
}
const before = src.slice(0, startIdx + startMarker.length)
// Find matching closing brace for this object
let i = startIdx + startMarker.length
let depth = 1
while (i < src.length && depth > 0) {
  const ch = src[i++]
  if (ch === '{') depth++
  else if (ch === '}') depth--
}
const after = src.slice(i) // from the char after the closing brace

// Build sorted entries
const entries = Object.entries(MATERIAL_ICON_OVERRIDES).sort((a, b) => a[0].localeCompare(b[0]))
const body = '\n' + entries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n') + '\n'
const newSrc = before + body + '}' + after

fs.writeFileSync(overridesPath, newSrc)

console.log(`Report written: ${path.relative(root, reportPath)}`)
console.log(`Sprite symbols: ${svgIds.size}`)
console.log(`Materials total: ${materials.length}`)
console.log(`Missing total: ${missing.length}`)
console.log(`Overrides added: ${addedCount}`)
