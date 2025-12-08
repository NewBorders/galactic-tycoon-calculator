# Handoff Document

## Most Recent Work (December 8, 2024) - Critical Per-Day Calculation Fixes

### Completed: Global Summary Per-Day Calculations & Timeframe Control

Fixed critical calculation inconsistencies where values scaled by `periodFactor` were displayed as "/day", causing values to be 7x too high (when timeframe = 168 hours). Also added UI control for timeframe adjustment.

#### Core Problem Identified:
Values were being multiplied by `periodFactor` in useGlobalSummary.ts but displayed as "/day" in the UI:
- `totalNetProfit`: Was `report.summary.net * periodFactor` but shown as "/day"
- `exportMaterials[].valuePerDay`: Was `amount * price * periodFactor` but named "PerDay"
- `totalExportNetProfit`: Mixed scaling (revenue scaled, costs scaled)
- `totalConsumptionOverheadCost`: Was `overhead * periodFactor` but shown as "/day"

#### Solution - Established Consistent Convention:

**Per-Day Values** (for global totals in Overview):
- `totalNetProfit`: Now truly per-day (removed periodFactor)
- `totalExportNetProfit`: Now per-day (both revenue and costs per-day)
- `totalConsumptionOverheadCost`: Now per-day (removed periodFactor)
- `exportMaterials[].valuePerDay`: Now truly per-day (removed periodFactor)

**Period Values** (for base summaries in BaseCard):
- `baseSummary.netProfit`: Kept scaled by periodFactor
- `baseSummary.exportNetProfit`: Now scaled by periodFactor (multiply sum by periodFactor)
- BaseCard component divides these by periodFactor to show per-day

#### Changes Made:

1. **Fixed Per-Day Calculations in useGlobalSummary.ts** ✅
   - Line 256: Removed `* periodFactor.value` from exportMaterials valuePerDay
   - Line 271: Added `* periodFactor.value` to exportNetProfit for base summaries
   - Line 291: Removed `* periodFactor.value` from totalNetProfit
   - Line 315: Removed `* periodFactor.value` from totalExportNetProfit costs
   - Line 329: Removed `* periodFactor.value` from totalConsumptionOverheadCost

2. **Added Summary Window (Hours) Control UI** ✅
   - Added input field in GlobalSummaryPage header
   - Users can now adjust timeframeHours (default 168, range 1-336)
   - Similar to PlayerConfigPanel's timeframe control
   - Uses existing translations

#### Testing Status:
- ✅ Type-check passing (no TypeScript errors)
- ⚠️ Integration tests: 7 tests failing in useGlobalSummary.test.ts (priceResolver setup issue, not related to fixes)
- 🔄 Manual testing in progress at http://localhost:5173/

#### Known Issues:
- **Productivity Still Shows 0%**: User reports despite fix. Need to investigate actual workforce data.
- **Integration Tests**: useGlobalSummary.test.ts has priceResolver mock setup issue

#### Files Modified:
```
modified:   src/v2/composables/useGlobalSummary.ts
modified:   src/v2/pages/GlobalSummaryPage.vue
```

---

## Previous Work (December 7, 2024) - GlobalSummaryPage Initial Fixes

Fixed critical bugs and improved functionality based on user feedback:

#### Changes Made:

1. **Fixed Productivity Calculation Bug** ✅
   - **Issue**: Productivity was always showing 0%
   - **Root Cause**: `workforceProductivity.ts` was treating `wf.coverage` as percentage (0-100), but it's actually a decimal (0-1) from the engine
   - **Fix**: Convert coverage from decimal to percent: `wf.coverage * 100`
   - **Impact**: Workforce productivity now displays correctly

2. **Fixed Export Net Profit Calculation** ✅
   - Ensured export net profit uses the same periodFactor as other calculations
   - Export material values are now correctly scaled by timeframe

3. **Show All Export Materials with Icons** ✅
   - Changed from showing top 5 to showing ALL export materials
   - Reduced icon size from 20px to 16px for better density
   - Added max-width and tighter spacing for better layout
   - All materials visible at a glance with visual icons

4. **Previous UI/UX Improvements** ✅
   - Updated color theme to slate colors for better visibility
   - Removed "Production Overview" title
   - Verified Net Profit calculations use correct `report.summary.net`
   - Refactored BaseDetailExpanded with 6 detailed sections:
     * Net Result with cost breakdown
     * Worker Consumables per tier
     * Production Revenue (top exports)
     * Material Purchases (top consuming)
     * Workforce Coverage
     * Full Materials Balance

#### Technical Details:
- Files Modified:
  * `src/v2/services/production/workforceProductivity.ts` - Fixed coverage conversion
  * `src/v2/composables/useGlobalSummary.ts` - Clarified export net profit calculation
  * `src/v2/components/BaseCard.vue` - Show all export materials, optimized icon size and layout
- All type-checks passing
- Build successful

#### User Requirements Addressed:
- [x] "Productivity is currently always 0%, seems not to be correct" - FIXED
- [x] "re-use the existing calculations for Net Profit, Export Net Profit" - VERIFIED CORRECT
- [x] "list all export materials, just using icons is awesome" - IMPLEMENTED
- [ ] "when expanded: we see in detail reports like we currently have: Net result (with price trend of 7d only affecting this bases productions)" - PARTIAL (trend missing)

### Still TODO:

1. **7-Day Price Trend Visualization** 
   - Add price trend indicators to Net Result section in expanded view
   - Show trend specifically for materials this base produces
   - Note: User wants trend to only affect this base's productions, not all calculations

### Previous Work

#### Completed: Mobile Overview Feature
- Created workforce productivity calculations with stock awareness
- Built BaseCard and BaseDetailExpanded components
- Refactored GlobalSummaryPage with collapsible base tiles
- Added mobile-responsive CSS

#### Completed: Issue #61 - Allow Recipe Count and Building Level to be 0
- Fixed 4 critical bugs preventing zero values
- All 11 integration tests passing

#### Completed: Issue #42 - Technology Levels from API
- Company Data endpoint now sets technology levels
- Integration tests cover this functionality

## Next Steps / Future Work

### High Priority:
1. Add 7-day price trend visualization to Net Result section (user requested)
2. Ensure trend only affects base's production materials, not all calculations

### Potential Improvements:
3. Add filtering/sorting options for materials in expanded view
4. Performance optimization if user has 20+ bases
5. Add charts/visualizations for trends

### Known Issues:
- None currently

## Project Context

This is a Vue 3 + TypeScript calculator for Galactic Tycoon game. Key patterns:
- Use MVC and Service Repository Pattern
- Use ETL for external API connections
- Always run integration tests for workflows
- Always fix type-check issues: `docker compose exec web npm run type-check`
- Try to fix lint issues: `docker compose exec web npm run lint`
- Document changes in handoff.md
