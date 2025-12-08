# Handoff Document

## Most Recent Work: Productivity Calculation Fix (December 8, 2024)

### Problem
Productivity was showing 0% despite 100% housing coverage. Debug logs revealed:
- Housing Coverage: 99.7-100% ✅
- Consumption Coverage: 0% ❌
- All Tier 1 consumption materials had `stock=0`:
  - Material 12 (Food): 0
  - Material 16 (Luxury Food): 0
  - Material 17 (Drinks): 0
  - Material 10 (Clothing): 0
  - Material 44 (Spices): 0
  - Material 130 (Consumer Electronics): 0

### Root Cause
1. **Missing Parameter**: `useGlobalSummary` tried to use `base.stock`, but this field was never populated
2. **Architecture Issue**: Warehouse stocks are stored globally in `worldData.current.warehouseStocks`, not per-base
3. **Integration Gap**: `syncService` fetched warehouse data but didn't save it to `worldData`

### Solution Implemented

**Files Changed**:
1. `src/v2/composables/useGlobalSummary.ts`:
   - Added `warehouseStocks: MaybeRef<Record<number, number>>` parameter
   - Changed Line 188: `const stock = toValue(warehouseStocks)` instead of `base.stock ?? {}`

2. `src/v2/pages/GlobalSummaryPage.vue`:
   - Import `useWorldData`
   - Get `warehouseStocks` from `worldCurrent.value.warehouseStocks`
   - Pass to `useGlobalSummary()`

3. `src/v2/pages/player-config/components/GlobalSummary.vue`:
   - Same changes as GlobalSummaryPage

4. `src/v2/services/syncService.ts`:
   - Import `useWorldData`
   - After fetching warehouse data, transform items to `Record<number, number>` format
   - Call `updateCurrent({ warehouseStocks })` to save to worldData

5. `src/v2/services/production/workforceProductivity.ts`:
   - Removed all debug `console.log` statements

### Result
- Productivity now correctly reflects warehouse inventory
- Tier 1 workers show 0% when consumption materials are missing (correct behavior)
- Once warehouse is synced with API, productivity will show actual coverage

### Next Steps (for future agent)
- User needs to sync warehouse from API (Bases page → Sync button)
- Consider showing which material is limiting productivity in UI
- Maybe add a warning: "Productivity 0%: Missing Food (0 stock, need 404/day)"

---

## Previous Work Context

### Timeframe System (Completed December 8, 2024)
- Unified timeframe control via localStorage key `'gt:v2:timeframeHours'`
- Default: 24 hours, Range: 1-336 hours, Step: 1 hour
- Both Overview and Bases pages stay synchronized
- All calculations use `periodFactor = timeframeHours / 24`
- Display shows "per X hours" dynamically

### Export Net Profit (Completed)
- Added to Overview page stat cards
- Shows: Export Revenue - All Costs (consumption overhead + base costs)
- Values correctly scaled by periodFactor

### Display Cleanup (Completed)
- Replaced all "/day" with dynamic "per X hours" labels
- Removed period suffix from Overview stat cards (values speak for themselves)
- Materials table header shows "Value/per X hours"
- Stock warnings show consumption per selected period

### Productivity Formula
```typescript
// Per tier:
housingCoverage = (housing / required) * 100
consumptionCoverage = min(100, (stock / (consumptionPerDay * planDays)) * 100)
productivityPercent = min(housingCoverage, consumptionCoverage)

// Overall:
overallProductivityPercent = weighted average by worker count
```

If any consumption material has 0 stock → consumptionCoverage = 0% → productivity = 0%
