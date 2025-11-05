// src/v2/services/production/types.ts
import type { GameData, Recipe } from '../gamedata/service'

export type BaseAssignment = {
  planetId: number
  buildings: Array<{ buildingId:number; level:number; count:number }>
  // später: recipe allocations je building/level, utilization [%]
}

export type Horizon = 1|7|14|30

export type BaseDailySummary = {
  costs: number
  revenue: number
  net: number
}
export type MaterialBalance = {
  materialId: number
  balancePerDay: number
  profitPerDay: number // optional
}
export type WorkerConsumptionRow = {
  tier: 1|2|3|4
  materialId: number
  consumptionPerDay: number
  costPerDay: number
}
export type BaseReport = {
  summary: BaseDailySummary
  materials: MaterialBalance[]
  workers: WorkerConsumptionRow[]
}

// src/v2/services/production/engine.ts
export function computeBaseReport(
  gd: GameData,
  assignment: BaseAssignment,
  horizonDays: Horizon = 1,
  options?: { theoretical?: boolean } // später für „theoretische Kosten & Produktion“
): BaseReport {
  // 1) Gebäude-Level → Kapazität pro Tag (via recipes & producedIn)
  // 2) Input-Needs aggregieren, Output-Erträge aggregieren
  // 3) Worker-Consumption aus Building/Level ableiten
  // 4) Preise: gd.materials[*].calculatedPriceInCents als Basis
  // 5) horizonDays multiplizieren
  return { summary:{costs:0,revenue:0,net:0}, materials:[], workers:[] }
}
