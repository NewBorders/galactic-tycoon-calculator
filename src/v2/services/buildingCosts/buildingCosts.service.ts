// Service/Repository für Building-Kosten
import * as buildingCostsCore from '@/v2/services/buildingCosts/buildingCosts.core';
import type { BuildingCostInput } from '@/v2/services/buildingCosts/buildingCosts.core';

export type MaterialsLookup = { materials: Array<{ id: number; name: string }> }

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
  getGrowthMultiplier(level: number) {
    return buildingCostsCore.getBuildingGrowthMultiplier(level)
  }
  formatMaterialList(list: Array<{ materialId: number; amount: number }>, gameData?: MaterialsLookup) {
    return buildingCostsCore.formatMaterialList(list, gameData)
  }

}

export const buildingCostsRepository = new BuildingCostsRepository()
