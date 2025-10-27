// Genau auf dein Schema zugeschnitten
export type Material = { id: number; name: string }
export type Building = { id: number; name: string }
export type RecipeV2Raw = {
  id: number
  inputs?: Array<{ id: number; am: number }>
  output: { id: number; am: number }
  producedIn: number
  reqTech: number
  timeMinutes: number
  type: number
  name?: string
}
export type GameData = {
  materials: Material[]
  buildings: Building[]
  recipes: RecipeV2Raw[]
}

export type RecipeV2Enriched = {
  id: number
  inputsEnriched?: Array<{ id: number; am: number; name: string }>
  output: { id: number; am: number; name: string }
  producedIn: number
  producedInName: string
  reqTech: number
  timeMinutes: number
  type: number
}

export type V1Recipe = {
  id: number
  name: string
  time: number // minutes
  inputs: Record<string, number>
  outputs: Record<string, number>
}

const toSnake = (s: string) =>
  s
    .trim()
    .replace(/[()]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()

function buildIndex<T extends { id: number }>(arr: T[]) {
  const byId = new Map<number, T>()
  for (const x of arr ?? []) byId.set(x.id, x)
  return byId
}

export function enrichRecipeV2(gd: GameData, r: RecipeV2Raw): RecipeV2Enriched | null {
  const mats = buildIndex(gd.materials ?? [])
  const blds = buildIndex(gd.buildings ?? [])
  const outMat = mats.get(r.output.id)
  if (!outMat) return null
  const produced = blds.get(r.producedIn)
  const inputsEnriched = (r.inputs ?? [])
    .map((i) => {
      const m = mats.get(i.id)
      return m ? { id: i.id, am: i.am, name: m.name } : null
    })
    .filter(Boolean) as Array<{ id: number; am: number; name: string }>

  return {
    id: r.id,
    producedIn: r.producedIn,
    producedInName: produced?.name ?? `building_${r.producedIn}`,
    inputsEnriched: inputsEnriched,
    output: { ...r.output, name: outMat.name },
    reqTech: r.reqTech,
    timeMinutes: r.timeMinutes,
    type: r.type
  }
}

export function toV1Recipe(gd: GameData, r: RecipeV2Enriched): V1Recipe {
  const outputName = r.output.name // <— immer Output-Materialname
  const inputs: Record<string, number> = {}
  for (const i of r.inputsEnriched ?? []) inputs[toSnake(i.name)] = i.am
  const outputs: Record<string, number> = {}
  outputs[toSnake(outputName)] = r.output.am

  return {
    id: r.id,
    name: outputName,
    time: r.timeMinutes ?? 0,
    inputs,
    outputs
  }
}

/** search for materials by name and deliver fitting recipes */
export function searchRecipes(gd: GameData, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const exact = (gd.materials ?? []).find((m) => m.name.toLowerCase() === q)
  const candidates = exact
    ? [exact]
    : (gd.materials ?? []).filter((m) => m.name.toLowerCase().includes(q))
  if (!candidates.length) return []

  const targetIds = new Set(candidates.map((m) => m.id))
  const matches = (gd.recipes ?? []).filter((r) => targetIds.has(r.output.id)) // <— only Outputs

  const out = []
  for (const r of matches) {
    const enr = enrichRecipeV2(gd, r)
    if (!enr) continue
    const v1 = toV1Recipe(gd, enr)

    out.push({
      key: toSnake(enr.output.name),
      uniqueKey: `${toSnake(enr.output.name)}_${enr.id}_${enr.producedIn}`,
      v2: enr,
      v1
    })
  }
  return out
}
