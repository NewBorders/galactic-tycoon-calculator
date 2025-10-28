import type { GameData, Recipe, Material } from '../../services/gamedata/service.ts'

type V1Recipe = {
  id: number
  name: string
  time: number           // minutes
  inputs: Record<string, number>
  outputs: Record<string, number>
}

const toSnake = (s: string) =>
  s.trim().replace(/[()]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()

export function searchRecipes(gd: GameData, query: string): Array<{
  key: string
  uniqueKey: string
  v2: Recipe
  v1: V1Recipe
}> {
  const q = query.trim().toLowerCase()
  if (!q) return []

  // Material-Index
  const materialById = new Map<number, Material>(gd.materials.map(m => [m.id, m]))

  // target materials by name
  const targets = gd.materials.filter(m => m.name.toLowerCase().includes(q))
  if (targets.length === 0) return []

  const targetIds = new Set(targets.map(t => t.id))

  // recipes, that contains the target material as output
  const matches = gd.recipes.filter(r => targetIds.has(r.output.id))

  return matches.map(r => {
    const key = toSnake(r.output.name)

    // Inputs -> Name mapping
    const inputs: Record<string, number> = {}
    for (const i of r.inputs ?? []) {
      const nm = materialById.get(i.id)?.name ?? `material_${i.id}`
      inputs[toSnake(nm)] = i.amount
    }

    // Single Output
    const outputs: Record<string, number> = { [key]: r.output.amount }

    const v1: V1Recipe = {
      id: r.id,
      name: r.output.name,
      time: r.timeMinutes ?? 0,
      inputs,
      outputs,
    }

    return {
      key,
      uniqueKey: `${key}_${r.id}_${r.producedInId}`,
      v2: r,
      v1,
    }
  })
}
