import * as technologyCostsCore from './technologyCosts.core'

export class TechnologyCostsRepository {
  computeTechnologyResearchCost(
    techId: number,
    fromLevel: number,
    toLevel: number,
    gameData?: { materials: Array<{ id: number; name: string }> },
    totalTechnologies?: number
  ): string | undefined {
    return technologyCostsCore.computeTechnologyResearchCost(
      techId,
      fromLevel,
      toLevel,
      gameData,
      totalTechnologies
    )
  }

  formatTechnologyMaterials(
    list: Array<{ materialId: number; amount: number }>,
    gameData?: { materials: Array<{ id: number; name: string }> }
  ): string {
    return technologyCostsCore.formatTechnologyMaterials(list, gameData)
  }
}

export const technologyCostsRepository = new TechnologyCostsRepository()
