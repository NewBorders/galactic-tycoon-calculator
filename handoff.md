# Handoff Document

## Most Recent Work: Intelligent Global Stock Warnings (December 9, 2024)

### Summary
✅ **COMPLETED**: Implemented a smart, global "Running Out of Stock" overview that intelligently categorizes materials and provides actionable insights for redistribution vs. purchase decisions.

### Key Features

#### 1. Smart Material Categorization ✅
**Service**: `src/v2/services/stockAnalysis.ts`

The system now distinguishes between:
- **Redistribution Needed** 🔄: Export materials produced in at least one base but needed in others
  - User can ship these between their own bases
  - Shows which bases need the material
  
- **Purchase Needed** 🛒: Input materials not produced anywhere
  - User must buy these from the exchange
  - Direct market links for easy purchase

#### 2. Dual View Modes ✅
**Component**: `src/v2/components/StockWarnings.vue`

**By Material View (Default)**:
- Groups materials across all bases
- Shows total quantity, weight, value needed
- Displays urgency (shortest time left)
- Shows number of bases affected
- Separate sections for redistribution vs. purchase

**By Base View**:
- Groups materials by base (delivery packages)
- Shows total weight and value per base
- Helps plan shipments and logistics
- Urgency color-coded per base

#### 3. Rich Information Display ✅

**Columns Shown**:
- **Material**: Name with direct link to market
- **Time Left**: Days until stock runs out (color-coded)
- **Current Stock**: Available units
- **To Buy**: Amount needed for timeframe
- **Weight**: Total kg/tonnes (placeholder - TODO: add material weight data)
- **Value**: Total cost/value
- **Bases**: Number of bases affected (material view)

**Urgency Color Coding**:
- 🔴 Critical: ≤1 day (red)
- 🟠 High: ≤3 days (orange)
- 🟡 Medium: ≤7 days (yellow)
- ⚪ Low: >7 days (gray)

#### 4. Summary Totals ✅

Each category shows:
- Total materials to buy/redistribute
- Total weight (for shipping calculations)
- Total value (for budget planning)

### Technical Implementation

**New Files**:
1. `src/v2/services/stockAnalysis.ts`
   - `analyzeStockSituation()`: Main analysis function
   - Categorizes materials based on export status
   - Calculates totals and urgency per material/base
   - Returns structured data for both view modes

2. `src/v2/components/StockWarnings.vue`
   - View mode toggle (By Material / By Base)
   - Responsive tables with all data columns
   - Market links and color-coded urgency
   - Summary footers with totals

**Modified Files**:
1. `src/v2/pages/GlobalSummaryPage.vue`
   - Added `stockAnalysis` computed property
   - Integrated StockWarnings component
   - Removed old per-base stock warnings section
   - Cleaned up unused CSS

2. `src/v2/localisation/messages.ts`
   - Added 18 new translation keys (EN/DE)
   - Removed duplicate keys that caused conflicts
   - Keys: materialsRunningOut, groupByMaterial, groupByBase, redistributionNeeded, purchaseNeeded, timeLeft, currentStock, toBuy, weight, value, total, bases, urgency

### Known Limitations

1. **Weight Calculation**: Currently placeholder (0)
   - Material weight property not yet available in game data
   - TODO: Add weight calculation when data becomes available
   - Affects shipping/cargo planning features

2. **Price Alerts**: Not yet implemented
   - Column mentioned in requirements but deferred
   - Future enhancement for market monitoring

### Visual Result

**Redistribution Section** (Blue border):
- Shows materials player already produces
- Clear hint: "Ship them to bases that need them"
- Helps optimize internal logistics

**Purchase Section** (Amber border):
- Shows materials player doesn't produce
- Clear hint: "Buy them from the exchange"
- Direct market links for quick purchasing

**Empty State**:
- ✅ "No materials running out – all stocks sufficient"
- Clean, encouraging message

### Testing Status

- ✅ TypeScript compilation passes
- ✅ Lint checks pass
- ✅ All translations present (EN/DE)
- ✅ Responsive design implemented
- ⏳ Visual testing pending user verification
- ⏳ Weight calculation awaiting data integration

### Git Commit

**decc48a**: "feat: add intelligent global stock warnings overview"
- New stockAnalysis service
- StockWarnings component with dual view modes
- Replaced old per-base warnings
- 18 new translations added
- Duplicate keys removed

---

## Previous Work: Overview Page UI Compaction & Workforce Display Improvements (December 9, 2024)

### Summary
✅ **COMPLETED**: Comprehensive UI improvement of the Overview page to make it more compact and information-dense, with a focus on displaying actionable workforce metrics.

### Changes Made

#### 1. Removed Emoji Icons from All Stat Cards ✅
**Files**: `src/v2/components/BaseCard.vue`, `src/v2/pages/GlobalSummaryPage.vue`

Removed unnecessary emoji icons from all metric displays:
- **BaseCard.vue**: Removed 💰, 📦, 👷 from Net Profit, Export Net Profit, Productivity (kept 🚢 for Export Materials)
- **GlobalSummaryPage.vue**: Removed 💰, 📦, 👷, 📊, 🏗️ from all header stat cards
- Updated CSS to remove icon-specific styling

**Impact**: Cleaner, more professional metric display without visual clutter.

#### 2. Narrower Global Summary Stat Cards ✅
**File**: `src/v2/pages/GlobalSummaryPage.vue`

Reduced stat card dimensions to improve space utilization:
- Grid minimum width: 250px → 180px (28% reduction)
- Card padding: 1.25rem → 0.875rem 1rem
- Gap between cards: 1rem → 0.75rem
- Label font: 0.75rem (with ellipsis for overflow)
- Value font: 1.25rem

**Impact**: More compact summary cards, better information density, more cards visible on screen.

#### 3. Improved Workforce Display ✅
**File**: `src/v2/components/BaseDetailExpanded.vue`

Replaced the detailed "Workforce Coverage" section with a streamlined "Workforce Productivity" display:

**Old Display** (Removed):
- Detailed housing ratios (e.g., "100/120")
- Individual consumable costs per material
- Housing coverage details

**New Display** (Added):
- Per-tier productivity percentages with color coding:
  - Green (≥95%): Good productivity
  - Amber (≥75%): Moderate productivity  
  - Red (<75%): Low productivity
- Limiting factor labels:
  - "Limited by housing shortage"
  - "Limited by consumption"
- Lost profit warning box (when productivity < 100%):
  - Shows lost profit amount per period
  - Shows productivity gap percentage
  - Amber styling to draw attention

**New Code Components**:
- `productivityColor()` helper function for color coding
- `lostProfitData` computed property for lost profit calculation
- New CSS for workforce warning box with amber theme

**Impact**: Focus on actionable metrics (productivity % and lost profit) rather than implementation details (housing numbers and consumption lists).

#### 4. Translation Keys ✅
**File**: `src/v2/localisation/messages.ts`

Added new translation keys in both English and German:
- `limitedByConsumption`: "Limited by consumption" / "Begrenzt durch Konsum"
- `lostProfitWarning`: "Lost Profit" / "Verlorener Gewinn"
- `lostDueToProductivity`: "lost due to {percent}% productivity gap" / "verloren durch {percent}% Produktivitätslücke"

### Technical Quality ✅

- ✅ All calculations remain unchanged - using existing `calculateWorkforceProductivity()` service
- ✅ Single Source of Truth architecture maintained
- ✅ Lost profit data comes from `potentialLostProfitPerDay` field in workforce productivity report
- ✅ TypeScript compilation passes
- ✅ Lint errors in modified files fixed
- ✅ All changes committed to git

### Git Commits

1. **b3253bd**: "feat: compact Overview UI and improve workforce display"
   - BaseCard emoji removal, stat card sizing, workforce display improvements, translations

2. **b4cc144**: "fix: remove emoji icons from GlobalSummaryPage header stat cards"
   - Completed emoji removal from header section

### Visual Result

The Overview page now presents:
- **Cleaner Headers**: No emoji clutter, professional appearance
- **Better Space Usage**: 28% narrower cards, more information on screen
- **Actionable Workforce Metrics**: 
  - Quick color-coded productivity status per tier
  - Financial impact clearly shown when not at full productivity
  - Limiting factors identified (housing vs consumption)
- **Focus on What Matters**: Removed technical details, emphasized business impact

---

## Previous Work: Workforce Satisfaction-Based Productivity (December 8, 2024)

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
