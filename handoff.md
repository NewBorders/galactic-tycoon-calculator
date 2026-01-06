# Handoff Document

## Most Recent Work (2026-01-06)

### Refactored Base Summary Calculations to Service Layer

**Context:**
Following best practices to keep business logic out of view components, we extracted all calculation logic from `BaseSummaryCard.vue` into a dedicated service module. This improves testability, reusability, and maintainability.

**Changes Made:**

1. **Created New Service: `baseSummaryMetrics.ts`**
   - Location: `/src/v2/services/production/baseSummaryMetrics.ts`
   - Exports three main functions:
     - `calculateExportMaterials(report: BaseReport): Set<number>` - Determines which materials are exports based on local consumption ratio and export threshold
     - `calculateExportMetrics(report, exportIds, periodFactor): ExportMaterialsResult` - Calculates export revenue and export net profit
     - `calculateNetProfitPriceTrend(report, marketOpportunities): number` - Calculates weighted average 7-day price trend
   - All functions are pure and easily testable
   - Fully type-safe with TypeScript

2. **Simplified BaseSummaryCard.vue Component**
   - Removed ~100 lines of calculation logic from view layer
   - Now imports and uses service functions for all calculations
   - **Removed Export Net Profit price trend** - Makes no sense since Export Net Profit and Net Profit share the same costs, so price changes affect both equally
   - Removed debug console.log statements
   - Component now focused purely on presentation logic
   - Reduced from ~245 lines to ~160 lines

3. **Key Design Decisions:**
   - Export Net Profit = Export Revenue - ALL costs (both material + worker purchase costs)
   - Only Net Profit shows 7-day price trend indicator
   - Export materials determined by formula: `localConsumptionRatio < (1 - threshold)`
   - Price trend weighted by absolute material value per day (`Math.abs(valuePerDay)`)

**Technical Details:**
- Uses existing `getExportThresholdRatio()` from config service
- Integrates with `MarketOpportunity` type for price trend data
- Export materials: Only materials with `balancePerDay > 0` can be exports
- Returns structured results via TypeScript interfaces

**Testing:**
- ✅ Type-check passes (`npm run type-check`)
- ✅ Application runs successfully on http://localhost:5173
- ✅ Export Net Profit displays correctly
- ✅ Net Profit with 7d price trend displays correctly
- ✅ No new lint errors introduced

**Git:**
- Branch: `71-planning-mode`
- Commit: `85b5042` - "refactor: extract base summary calculations to service layer"
- Status: Committed and pushed to remote

---

## Previous Work Summary

### Base Summary Enhancements (2026-01-06)
- Added Export Net Profit calculation and display
- Added 7-day price trends with visual indicators (📈↗→↘📉)
- Integrated market analysis data with auto-fetch
- Renamed "Net result" to "Net Profit"
- Fixed price trend visibility issues
- Color-coded trends: emerald/green for positive, orange/red for negative

### Technology Names in Production (2026-01-06)
- Added specialization names to recipe requirements
- Shows "Metallurgy require technology level 1" instead of just "require technology level 1"
- Created `getSpecializationName()` utility function
- Uses `BuildingSpecialization` enum for type safety

### Workforce Productivity Warnings (2026-01-05)
- Added compact warnings with lost profit calculations
- Extracted lost profit logic to `lostProfit.ts` service
- Shows housing coverage and satisfaction metrics
- Displays when productivity < 100%

### UI Cleanup (2026-01-05)
- Removed redundant sections from GlobalSummary
- Removed Workforce Deficit Cost card
- Simplified GlobalSummary from ~220 lines to 84 lines

---

## Architecture Patterns Used

### Service Layer Pattern
- Business logic extracted to service modules (e.g., `lostProfit.ts`, `baseSummaryMetrics.ts`)
- View components focus on presentation only
- Services are pure functions that are easily testable

### Repository Pattern
- Configuration values retrieved via dedicated services (e.g., `getExportThresholdRatio()`)
- Single source of truth for data access

### Composables Pattern
- `useMarketAnalysis()` for market data fetching and state management
- Provides reactive state and fetch methods

---

## Next Steps / Open Tasks

### Potential Improvements
1. **Integration Tests** - Consider adding tests for `baseSummaryMetrics.ts` service
2. **Tooltips** - Add explanatory tooltips for price trends
3. **Similar Refactoring** - Apply service extraction pattern to other complex view components
4. **Documentation** - Consider adding JSDoc comments to service functions

### Technical Debt
- Some lint errors remain in unrelated files (not introduced by recent work)
- Consider addressing `@typescript-eslint/no-explicit-any` warnings in other components

### Feature Ideas
- Extend trend indicators to other views (e.g., material overview)
- Add trend prediction/forecasting based on historical data
- Consider adding trend charts/graphs
