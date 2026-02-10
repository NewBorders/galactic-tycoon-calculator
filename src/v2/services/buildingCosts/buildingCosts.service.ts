// Service/Repository für Building-Kosten
import * as buildingCostsCore from '@/v2/services/buildingCosts/buildingCosts.core';

type BuildingCostInput = {
  constructionMaterials: Array<{ id: number; amount: number }>
  tier?: number
  workersHousing?:
    | number[]
    | { worker?: number; technician?: number; engineer?: number; scientist?: number }
    | null
  name?: string
  specialization?: number
}

type MaterialsLookup = { materials: Array<{ id: number; name: string }> }

export class BuildingCostsRepository {
  getSingleLevelCost(building: BuildingCostInput, planetTier: number, level: number) {
    return buildingCostsCore.computeSingleBuildingLevelCost(building, planetTier, level)
  }
  getUpgradeCost(
    building: BuildingCostInput,
    planetTier: number,
    fromLevel: number,
    toLevel: number,
    gameData?: MaterialsLookup
  ) {
    return buildingCostsCore.computeBuildingUpgradeCost(building, planetTier, fromLevel, toLevel, gameData)
  }
  getTierExtras(building: BuildingCostInput, planetTier: number, targetLevel: number) {
    return buildingCostsCore.computeBuildingTierExtras(building, planetTier, targetLevel)
  }
  getGrowthMultiplier(level: number) {
    return buildingCostsCore.getBuildingGrowthMultiplier(level)
  }
  formatMaterialList(list: Array<{ materialId: number; amount: number }>, gameData?: MaterialsLookup) {
    return buildingCostsCore.formatMaterialList(list, gameData)
  }

}

export const buildingCostsRepository = new BuildingCostsRepository()
