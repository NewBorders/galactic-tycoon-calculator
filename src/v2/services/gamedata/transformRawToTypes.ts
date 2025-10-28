import type {
  BuildingRaw,
  GameDataRaw,
  MaterialRaw,
  PlanetRaw,
  RecipeRaw,
  SystemRaw,
  WorkerRaw,
} from './types.raw'
import type { Building, GameData, Material, Planet, Recipe, System, Worker } from './types'

export function normalize(raw: GameDataRaw): GameData {
  const sysArr: SystemRaw[] = raw.systems ?? []
  const matArr: MaterialRaw[] = raw.materials ?? []
  const bldArr: BuildingRaw[] = raw.buildings ?? []
  const recArr: RecipeRaw[] = raw.recipes ?? []
  const workerArr: WorkerRaw[] = raw.workers ?? []

  const materials: Material[] = matArr.map((m) => ({
    id: m.id,
    name: m.name,
    shortName: m.sName,
    description: m.description,
    type: m.type,
    calculatedPriceInCents: m.cp,
    reqTech: m.reqTech,
    source: m.source,
    tier: m.tier,
    weightInTonnes: m.weight,
  }))
  const materialById = new Map(materials.map((m) => [m.id, m]))

  const systems: System[] = sysArr.map((s) => ({
    id: s.id,
    name: s.name,
    x: s.x,
    y: s.y,
    v: s.v,
  }))

  const planets: Planet[] = sysArr.flatMap((s) =>
    (s.planets ?? []).map((p: PlanetRaw) => ({
      id: p.id,
      systemId: p.sId,
      name: p.name,
      fertility: p.fert,
      tier: p.tier,
      x: p.x,
      y: p.y,
      materials: (p.mats ?? []).map((pm) => ({
        id: pm.id,
        name: materialById.get(pm.id)?.name ?? `unknown_material_${pm.id}`,
        abundanceRating: pm.ab,
      })),
      type: p.type,
      size: p.size,
    })),
  )

  const buildings: Building[] = bldArr.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    constructionMaterials: (b.constructionMaterials ?? []).map((cm) => ({
      id: cm.id,
      name: materialById.get(cm.id)?.name ?? `unknown_material_${cm.id}`,
      amount: cm.am,
    })),
    specialization: b.specialization,
    tier: b.tier,
    recipesIds: b.recipesIds,
    workersHousing: {
      worker: b.workersHousing?.[0] ?? 0,
      technician: b.workersHousing?.[1] ?? 0,
      engineer: b.workersHousing?.[2] ?? 0,
      scientist: b.workersHousing?.[3] ?? 0,
    },
    workersNeeded: {
      worker: b.workersNeeded?.[0] ?? 0,
      technician: b.workersNeeded?.[1] ?? 0,
      engineer: b.workersNeeded?.[2] ?? 0,
      scientist: b.workersNeeded?.[3] ?? 0,
    },
  }))
  const buildingById = new Map(buildings.map((b) => [b.id, b]))

  const recipes: Recipe[] = recArr.map((r) => ({
    id: r.id,
    producedInId: r.producedIn,
    producedInName: buildingById.get(r.producedIn)?.name ?? `unknown_building_${r.producedIn}`,
    reqTech: r.reqTech,
    timeMinutes: r.timeMinutes,
    type: r.type,
    inputs: (r.inputs ?? []).map((i) => ({
      id: i.id,
      name: materialById.get(i.id)?.name ?? `unknown_material_${i.id}`,
      amount: i.am,
    })),
    output: {
      id: r.output.id,
      name: materialById.get(r.output.id)?.name ?? `material_${r.output.id}`,
      amount: r.output.am,
    },
  }))

  const workers: Worker[] = workerArr.map((w) => ({
    type: w.type,
    adminCost: w.adminCost,
    consumables: (w.consumables ?? []).map((c) => ({
      matId: c.matId,
      matName: materialById.get(c.matId)?.name ?? `unknown_material_${c.matId}`,
      amount: c.amount,
      essential: c.essential,
    })),
  }))

  return { systems, planets, materials, buildings, recipes, workers }
}
