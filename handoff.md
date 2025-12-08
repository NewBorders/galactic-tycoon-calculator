# Handoff Document

## Most Recent Work: Workforce Satisfaction-Based Productivity (December 8, 2024)

### Latest Update (v2)
Fixed the "No Consumables Provided" edge case to match Wiki specification exactly.

**Change**: When ALL consumables (3 essential + 3 optional) are missing, satisfaction is now **directly set to 10%**, not calculated.

**Why**: The Wiki table shows "No Consumables Provided → Floored → 10%", which is a special case. Previously, the code would calculate 70% × 0.6³ = 15.12% and then apply Math.max(10, 15.12) = 15.12%. Now it correctly detects when all consumables are missing and sets satisfaction to 10% immediately.

**Implementation** (workforceProductivity.ts):
```typescript
const totalConsumables = tierConsumption.filter(c => c.consumptionPerDay > 0).length
const totalMissing = missingEssentials + missingOptionals

if (totalMissing === totalConsumables && totalConsumables > 0) {
  // All consumables missing → directly set to 10%
  satisfaction = 10
} else {
  // Normal calculation: optionals (-10% each) + essentials (×0.6 each) + floor
  satisfaction -= (missingOptionals * 10)
  for (let i = 0; i < missingEssentials; i++) {
    satisfaction *= 0.6
  }
  satisfaction = Math.max(10, satisfaction)
}
```

### Architecture: Single Source of Truth ✅

**Confirmed**: `calculateWorkforceProductivity()` in `src/v2/services/production/workforceProductivity.ts` is the **single source of truth** for satisfaction calculation.

**Usage**:
- ✅ `useGlobalSummary.ts` calls it for Overview page (Line 270)
- ✅ BaseCard component displays the result
- ✅ All bases use the same calculation via the shared service

**User Control**: In the player config (Bases section), users can toggle which optional consumables are active via `activeOptionalConsumables` parameter. This is passed to `computeBaseReport()`, which then flows into the workforce productivity calculation.

### Latest Change
Implemented proper workforce productivity calculation based on official game mechanics from Wiki (https://wiki.galactictycoons.com/mechanics/workforce#satisfaction).

### Problem
User reported that productivity should not drop to 0% immediately when a consumable is missing. The game uses a satisfaction-based system with different penalties for missing optional vs. essential consumables.

### Wiki Mechanics (Official Formula)

**Satisfaction Calculation**:
1. **Base Satisfaction**: 100%
2. **Optional Consumables**: Each missing optional reduces satisfaction by **-10%**
3. **Essential Consumables**: Each missing essential applies a **×0.6 multiplier**
4. **Satisfaction Floor**: Minimum **10%** (prevents going to 0%)

**Worker Productivity Formula**:
```
Worker Productivity = Satisfaction % × (Employed Workers / Required Jobs)
```

**Examples from Wiki**:
- All consumables provided → **100%** satisfaction
- Missing 1 optional → **90%** (100 - 10)
- Missing 3 optionals → **70%** (100 - 30)
- Missing 3 optionals + 1 essential → **42%** (70 × 0.6)
- Missing 3 optionals + 2 essentials → **25.2%** (70 × 0.6 × 0.6)
- No consumables → **≥10%** (floor applied)

### Implementation

**Files Changed**:

1. **src/v2/services/production/workforceProductivity.ts**:
   - Updated `WorkforceProductivityTier` type to include:
     - `satisfaction: number` - calculated per Wiki formula
     - `missingEssentials: number` - count of missing essential consumables
     - `missingOptionals: number` - count of missing optional consumables
     - `consumptionCoverage` now aliases `satisfaction` for backwards compatibility
   
   - Changed calculation logic (Lines 53-112):
     - Iterate through tier consumables
     - Check stock availability (>0 = available, ≤0 = missing)
     - Count missing essentials vs. optionals based on `consumption.optional` flag
     - Apply Wiki formula:
       ```typescript
       let satisfaction = 100
       satisfaction -= (missingOptionals * 10)  // -10% per optional
       for (let i = 0; i < missingEssentials; i++) {
         satisfaction *= 0.6  // x0.6 per essential
       }
       satisfaction = Math.max(10, satisfaction)  // Floor at 10%
       ```
     - Overall productivity = `Math.min(housingCoverage, satisfaction)`

2. **src/v2/services/production/__tests__/workforceProductivity.test.ts** (NEW FILE):
   - Created comprehensive test suite with 9 test cases
   - All test cases match Wiki examples exactly:
     - ✅ 100% with all consumables
     - ✅ 90% with 1 optional missing
     - ✅ 70% with 3 optionals missing
     - ✅ 42% with 3 optionals + 1 essential missing
     - ✅ 25.2% with 3 optionals + 2 essentials missing
     - ✅ 15.12% with all 6 consumables missing (above floor)
     - ✅ 10% floor when calculation goes below minimum
     - ✅ Housing limits productivity when satisfaction higher
     - ✅ Satisfaction limits productivity when housing higher

### Key Architectural Points

1. **Essential vs. Optional**: The `WorkerConsumptionRow` type already has an `optional: boolean` field populated by the production engine
2. **Gradual Degradation**: Missing 1-2 consumables causes moderate productivity loss, not immediate shutdown
3. **Essential Priority**: Missing essentials has much stronger impact (×0.6 multiplier) than optionals (-10%)
4. **Floor Protection**: Even with no consumables, workforce still operates at 10% minimum
5. **Housing Still Matters**: Overall productivity is `min(housing, satisfaction)` - both factors limit productivity

### Testing Results
- ✅ All 9 workforce productivity tests pass
- ✅ All 29 production service tests pass
- ✅ TypeScript compilation successful
- ❌ Pre-existing test failures in `useGlobalSummary.test.ts` (unrelated to this change - priceResolver issue)

### Next Steps
The satisfaction-based calculation should now match in-game behavior. Monitor user feedback to ensure:
1. Productivity values align with what players see in-game
2. Missing consumables have correct impact (optionals less severe than essentials)
3. The 10% floor prevents complete shutdown

---

## Previous Work: Locale-Aware Currency Formatting (December 8, 2024)

### Latest Change
Changed `formatCurrency` function to respect user's locale for number formatting:
- **File**: `src/v2/localisation/numbers.ts`
- **Change**: `formatCurrency` now uses `getCurrentLocale()` instead of hardcoded 'en-US'
- **Result**: 
  - English users see: $1,234.56 (dollar sign before number, dot for decimals)
  - German users see: 1.234,56 $ (dollar sign after number, comma for decimals, dot for thousands)
  - All other numbers also respect locale (formatNumber uses getCurrentLocale())

This ensures all numbers in the Overview page and elsewhere display correctly according to the user's selected language/locale.

---

## Previous Work: Productivity Calculation Fix (December 8, 2024)

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
