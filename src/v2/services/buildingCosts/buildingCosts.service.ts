// Service/Repository für Building-Kosten
import type { TechnologyMaterial } from './buildingCosts.types';
import * as buildingCostsCore from '@/v2/services/buildingCosts/buildingCosts.core';

export class BuildingCostsRepository {
  getSingleLevelCost(building: any, planetTier: number, level: number) {
    return buildingCostsCore.computeSingleBuildingLevelCost(building, planetTier, level)
  }
  getUpgradeCost(building: any, planetTier: number, fromLevel: number, toLevel: number, gameData?: any) {
    return buildingCostsCore.computeBuildingUpgradeCost(building, planetTier, fromLevel, toLevel, gameData)
  }
  getTierExtras(building: any, planetTier: number, targetLevel: number) {
    return buildingCostsCore.computeBuildingTierExtras(building, planetTier, targetLevel)
  }
  getGrowthMultiplier(level: number) {
    return buildingCostsCore.getBuildingGrowthMultiplier(level)
  }
  formatMaterialList(list: Array<{ materialId: number; amount: number }>, gameData?: any) {
    return buildingCostsCore.formatMaterialList(list, gameData)
  }

  // TODO: technology has nothing to do with building costs, should be moved to a different service/repository
  computeTechnologyResearchCost(specialization: number, level: number, gameData?: any): string {
    return buildingCostsCore.computeTechnologyResearchCost(specialization, level, gameData)
  }
}

export const buildingCostsRepository = new BuildingCostsRepository()
