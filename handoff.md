# Project Handoff Document

## Most Recent Work (January 4, 2026 - Part 8)

### Fixed: Lost Profit for Combined Housing + Consumable Shortage

#### Problem
When both housing shortage AND consumable shortage occurred simultaneously, only housing lost profit was calculated (using `else if` logic). The consumable shortage was ignored.

#### Solution

**Calculate optimal state with BOTH improvements:**

1. If consumable shortage exists → Compute report with all optionals active
2. If housing shortage exists → Scale that report to 100% housing
3. Compare optimal state (100% housing + all optionals) with current state

```typescript
if (hasHousingShortage || hasConsumableShortage) {
  // Step 1: Get report with all optionals active (if needed)
  let optimalReport = report.value
  if (hasConsumableShortage) {
    optimalReport = computeBaseReport(..., {
      activeOptionalConsumables: allOptionalIds, // ALL optionals
      ...
    })
  }
  
  // Step 2: Scale to 100% housing (if needed)
  let netAtOptimal = optimalReport.summary.net
  if (hasHousingShortage) {
    const housingFactor = minHousingCoverage / 100
    const revenueOptimal = optimalReport.summary.productionRevenue / housingFactor
    const costsOptimal = (workerCosts + materialCosts) / housingFactor
    netAtOptimal = revenueOptimal - costsOptimal
  }
  
  // Lost profit = optimal - current
  lostProfitPerDay = netAtOptimal - report.value.summary.net
}
```

#### Files Modified

**src/v2/pages/player-config/components/SummaryCalculationsSection.vue**
- Lines 283-349: Rewrote lostProfitData to handle combined shortages
- Changed from `if/else if` to sequential processing
- Now calculates optimal state considering both improvements

#### Example Scenarios

**Scenario 1: Only housing shortage (99.5%)**
```
Current: Net $272k
Optimal (100% housing): Net $274k
Lost Profit: $2k
```

**Scenario 2: Only consumable shortage (1 optional inactive)**
```
Current: Net $272k
Optimal (all optionals): Net $288k
Lost Profit: $16k
```

**Scenario 3: BOTH housing (99.5%) + consumable shortage**
```
Current: Net $272k

Step 1 - Add all optionals: Net $288k
Step 2 - Scale to 100% housing: Net = $288k scaled by (100/99.5)
        Revenue: $535k / 0.995 = $538k
        Costs: Scale accordingly
        Net: ~$290k

Lost Profit: $290k - $272k = $18k
```

The lost profit now shows the TOTAL improvement from fixing both issues, not just one.

#### Benefits

1. **Accurate combined calculation**: Handles multiple issues simultaneously
2. **Realistic lost profit**: Shows true potential if ALL issues are resolved
3. **Better user guidance**: Users see total ROI of both housing and consumables
4. **No double-counting**: Properly combines effects without duplication

---

## Most Recent Work (January 4, 2026 - Part 7)

### Fixed: Housing Coverage Display & Lost Profit for Housing Shortage

#### Problems
1. **Housing coverage showed 100% when 5 housings were missing**
   - Rounding issue: 99.5% rounded to 100%
   
2. **Lost profit showed $0 for housing shortage**
   - Compared current state vs "all optionals active"
   - But housing was the same in both → no difference!
   - User expects to see lost profit from missing housing

#### Solution

**1. Housing coverage display precision**
- Changed from `formatNumber(tier.housingCoverage, 0)` to `formatNumber(tier.housingCoverage, 1)`
- Now shows 99.5% instead of 100%

**2. Separate lost profit calculation for housing vs consumables**

```typescript
const hasHousingShortage = productivity.tiers.some(t => t.housingCoverage < 100)
const hasConsumableShortage = productivity.tiers.some(t => t.missingEssentials > 0 || t.missingOptionals > 0)

if (hasHousingShortage) {
  // Scale production to 100% housing
  const minHousingCoverage = Math.min(...productivity.tiers.map(t => t.housingCoverage))
  const housingFactor = minHousingCoverage / 100
  
  const revenueAt100Housing = currentRevenue / housingFactor
  const costsAt100Housing = currentCosts / housingFactor
  const netAt100Housing = revenueAt100Housing - costsAt100Housing
  
  lostProfitPerDay = netAt100Housing - currentNet
} else if (hasConsumableShortage) {
  // Compare with all optionals active (as before)
  ...
}
```

**Housing shortage logic:**
- Calculate minimum housing coverage across all tiers
- Scale up revenue and costs to 100% housing
- Lost profit = Net @ 100% housing - Net @ current

**Consumable shortage logic:**
- Compute second report with all optionals active
- Lost profit = Net @ 100% satisfaction - Net @ current

#### Files Modified

**src/v2/pages/player-config/components/SummaryCalculationsSection.vue**
- Line 633: Changed housing coverage display to 1 decimal place
- Lines 283-354: Rewrote lostProfitData to handle housing and consumable shortages separately

#### Example Calculations

**Housing shortage (99.5% coverage):**
```
Current:
- Revenue: $535,819
- Costs: $263,683
- Net: $272,136

At 100% housing:
- Revenue: $535,819 / 0.995 = $538,513
- Costs: $263,683 / 0.995 = $265,008
- Net: $538,513 - $265,008 = $273,505

Lost Profit: $273,505 - $272,136 = $1,369
```

**Consumable shortage (90% satisfaction):**
```
Current (1 optional inactive):
- Net: $272,136

All optionals active:
- Net: $288,632

Lost Profit: $288,632 - $272,136 = $16,496
```

**Both housing + consumable shortage:**
- Prioritizes housing shortage calculation
- Shows lost profit from housing (consumable loss not shown in this case)

#### Benefits

1. **Accurate housing coverage display**: No more false 100%
2. **Meaningful lost profit for housing**: Shows value of building more housing
3. **Separate calculations**: Different logic for housing vs consumable shortages
4. **Clear user guidance**: Users can see ROI of building more housing buildings

---

## Most Recent Work (January 4, 2026 - Part 6)

### Fixed: Exact Lost Profit Calculation by Comparing Two Reports

#### Problem
Lost profit was an approximation, not exact. Users expect to see the exact amount of net profit lost due to missing consumables or housing.

Previous approach: Tried to extrapolate from single report by scaling → Inaccurate

#### Solution

**Calculate TWO reports and compare their net profit directly:**

1. **Report at current state**: With currently active optional consumables
2. **Report at 100% potential**: With ALL optional consumables active
3. **Lost Profit = Net @ 100% - Net @ current** (exact difference!)

This uses the already-correct net profit calculation from the engine, ensuring perfect accuracy.

#### Implementation

**In SummaryCalculationsSection.vue, `lostProfitData` computed:**

```typescript
// Collect all possible optional consumables
const allOptionalIds = new Set<number>()
;[1, 2, 3, 4].forEach((tier) => {
  const worker = props.index.workerByType.get(tier)
  if (!worker) return
  worker.consumables
    .filter((c) => !c.essential)
    .forEach((c) => allOptionalIds.add(c.matId))
})

// Compute report with ALL optionals active (100% satisfaction potential)
const reportAt100 = computeBaseReport(props.gameData, {
  assignment: assignment.value,
  horizonDays: 1,
  options: {
    activeOptionalConsumables: allOptionalIds,
    priceResolver: props.priceResolver,
    technologyLevels: technologyLevelsOption.value,
    startingBonus: props.startingBonus,
    globalWorkforceBurden: props.globalWorkforceBurden,
  },
})

// Compare net profits
const currentNetProfit = report.value.summary.net
const netProfitAt100 = reportAt100.summary.net
const lostProfitPerDay = netProfitAt100 - currentNetProfit
```

#### Files Modified

**src/v2/pages/player-config/components/SummaryCalculationsSection.vue**
- Lines 283-322: Complete rewrite of `lostProfitData` computed
- Now computes second report with all optionals active
- Directly compares `summary.net` values for exact lost profit

#### Verification with User's Data

**Scenario: One optional deactivated (90% productivity)**

Current state (90%):
- Net: $272,136

All optionals active (100%):
- Net: $288,632

**Lost Profit = $288,632 - $272,136 = $16,496** ✓

This now matches exactly! No approximation, no scaling assumptions, just direct comparison of actual calculated net profits.

#### Benefits

1. **Exact accuracy**: Uses engine's correct net profit calculation
2. **No assumptions**: Doesn't assume linear scaling or cost behavior
3. **Handles complexity**: Automatically accounts for:
   - Non-linear cost changes
   - Material consumption patterns
   - Worker satisfaction formulas
   - All game mechanics

#### Performance Note

This computes an additional report when productivity < 100%, which is acceptable since:
- Only computed when needed (not at 100%)
- Cached by Vue's computed property
- Same computation cost as the primary report
- Worth it for exact accuracy

---

## Most Recent Work (January 4, 2026 - Part 5)

### ~~Fixed: Lost Profit Calculation Logic (Approximation)~~

**This section is now obsolete** - replaced by Part 6 with exact calculation.

---

## Most Recent Work (January 4, 2026 - Part 4)

### Fixed: Satisfaction Calculation for Missing Optional Consumables

#### Problem
When all optional consumables were deactivated but essential consumables were provided, the satisfaction calculation was incorrect:
- Expected: 70% (per Wiki: 100% - 3×10% for 3 missing optionals)
- Actual: Higher than 70%

The issue: `totalConsumables` was counting only consumables with `consumptionPerDay > 0`, which excluded deactivated optionals. This caused the satisfaction calculation to not properly account for all available consumable slots.

#### Solution

**Changed totalConsumables calculation in workforceProductivity.ts:**

- Before: `tierConsumption.filter(c => c.consumptionPerDay > 0).length` (only active with consumption)
- After: `tierConsumption.length` (ALL consumables for this tier)

This ensures that:
1. All consumable slots are counted (essential + optional)
2. Deactivated optionals are properly counted as "missing"
3. Satisfaction calculation matches Wiki formula exactly

#### Files Modified

**src/v2/services/production/workforceProductivity.ts**
- Line 116: Changed from filtering by consumptionPerDay to counting all tier consumables

#### Example Calculation

**Tier 1 with 1 Essential + 3 Optionals:**

Scenario: Essential provided, all optionals deactivated
```
totalConsumables = 4 (1 essential + 3 optionals)
missingEssentials = 0
missingOptionals = 3 (all deactivated)
totalMissing = 3

Satisfaction = 100% - (3 × 10%) = 70% ✓
```

Scenario: Essential missing, all optionals deactivated
```
totalConsumables = 4
missingEssentials = 1
missingOptionals = 3
totalMissing = 4 (all missing)

Satisfaction = 10% (floor, no consumables provided) ✓
```

Scenario: Essential provided, 2 optionals active, 1 deactivated
```
totalConsumables = 4
missingEssentials = 0
missingOptionals = 1 (only deactivated one)
totalMissing = 1

Satisfaction = 100% - (1 × 10%) = 90% ✓
```

---

## Most Recent Work (January 4, 2026 - Part 3)

### Fixed: Workforce Productivity Warnings for Optional Consumables

#### Problem
Workforce productivity warnings for optional consumables were not showing correctly:
- When optional consumable was deactivated by user → NO warning shown
- When optional consumable was not in stock → NO warning shown (if deactivated)
- User expected "gewohnte Warnung" (usual warning) in both cases

The issue: Previous implementation only checked `active` consumables, so deactivated optionals were completely ignored in the productivity calculation.

#### Solution

**Modified workforceProductivity.ts to check ALL optional consumables:**

1. **Changed filter logic**
   - Before: `report.workers.filter(w => w.tier === wf.tier && w.active)` (only active)
   - After: `report.workers.filter(w => w.tier === wf.tier)` (all consumables)

2. **Updated missing detection for optionals**
   - Optional is "missing" if: `!consumption.active || currentStock <= 0`
   - This means: deactivated OR not in stock → counts as missing
   - Essential materials: only check stock (always required)

3. **Separated essential vs optional logic**
   - Essential materials: Check stock only, track days remaining
   - Optional materials: Check active flag AND stock, count as missing if either fails
   - Both contribute to satisfaction calculation

#### Files Modified

**src/v2/services/production/workforceProductivity.ts**
- Line 58: Changed filter from `w.tier === wf.tier && w.active` to `w.tier === wf.tier`
- Lines 73-109: Separated logic for essential vs optional materials
- Lines 84-87: Optional missing detection: `!consumption.active || currentStock <= 0`

#### Expected Behavior

**Scenario 1: Optional deactivated by user**
```
User unchecks optional consumable checkbox
→ consumption.active = false
→ isMissing = true
→ missingOptionals++
→ Satisfaction reduced by 10%
→ Warning shown: "Missing 1 optional material"
```

**Scenario 2: Optional not in stock**
```
Optional is active but currentStock = 0
→ isMissing = true
→ missingOptionals++
→ Satisfaction reduced by 10%
→ Warning shown: "Missing 1 optional material"
```

**Scenario 3: Optional active and in stock**
```
Optional is active and currentStock > 0
→ isMissing = false
→ No warning
→ Full satisfaction
```

#### Impact on Satisfaction Calculation

The satisfaction formula remains unchanged (per Wiki):
- Base: 100%
- Missing optional: -10% per item
- Missing essential: ×0.6 per item
- Floor: 10% minimum

But now "missing optional" includes:
- Optionals not in stock (was already counted)
- Optionals deactivated by user (NEW - now counted)

---

## Most Recent Work (January 4, 2026 - Part 2)

### Removed: Workforce Coverage Table & Cleaned Up

#### Changes Made

1. **Removed Workforce Coverage table**
   - Deleted entire "Workforce Coverage (right column, bottom)" section from template
   - Removed from SummaryCalculationsSection.vue (previously at lines ~697-730)

2. **Cleaned up unused functions**
   - Removed `workforceSummary` computed property (no longer needed)
   - Removed `tierIconName()` function (only used in removed table)
   - Removed `coverageClass()` function (only used in removed table)

3. **Verified Workforce Productivity behavior**
   - Optional consumables toggle already working correctly
   - When user deactivates optional consumable:
     - Report marks it as `active: false` (engine.ts line 510)
     - Consumed amount set to 0 (engine.ts line 511)
     - workforceProductivity filters by `w.active` (workforceProductivity.ts line 59)
     - Missing inactive optionals are NOT counted in satisfaction calculation
   - Productivity automatically updates when optionals are toggled

#### Files Modified

**src/v2/pages/player-config/components/SummaryCalculationsSection.vue**
- Removed `workforceSummary` computed property (~line 258)
- Removed `tierIconName()` function (~lines 350-365)
- Removed `coverageClass()` function (~lines 365-370)
- Removed entire Workforce Coverage table section from template (~lines 697-730)

#### How Optional Consumables Work

**Data Flow:**
1. User toggles optional consumable → `toggleOptional()` updates `optionalActive` Set
2. `optionalActive` passed to `computeBaseReport()` as `activeOptionalConsumables`
3. Engine sets `active = !optional || activeOptional.has(consumable.matId)` (line 510)
4. Engine sets `consumed = active ? baseAmount * multiplier : 0` (line 511)
5. WorkforceProductivity filters `report.workers.filter(w => w.tier === wf.tier && w.active)` (line 59)
6. Only active consumables considered in satisfaction calculation
7. Productivity updates automatically via reactive computed

**Result:** Workforce Productivity correctly reflects optional consumable selection without additional changes needed.

---

## Most Recent Work (January 4, 2026)

### Fixed: Single Source of Truth for Warehouse Stock

#### Problem
Stock data was displayed differently in two places:
- **Materials Balance > Stock coverage** showed correct stock (from `props.base.stock`)
- **Global Summary > Per Base Summary > Materials Running Out** showed incorrect stock (from `warehouseStocks`)

The issue: Two separate data sources were not synchronized, causing inconsistent display.

#### Solution

**Established `warehouseStocks` from `useWorldData()` as the Single Source of Truth:**

1. **Identified the SSOT**
   - `worldCurrent.value.warehouseStocks` from `useWorldData()` service
   - Already used correctly in GlobalSummaryPage
   - Updated via API sync callbacks

2. **Updated component chain**
   - PlayerConfigPanel: Import `useWorldData`, create `warehouseStocks` computed
   - ConfiguredBase: Added `warehouseStocks` prop
   - SummaryCalculationsSection: Added `warehouseStocks` prop
   - All components now use same stock source

3. **Modified stock calculations**
   - `stockByMaterialId`: Changed from `props.base.stock` to `props.warehouseStocks`
   - `workforceProductivity`: Changed from `props.base.stock` to `props.warehouseStocks`
   - Removed local stock object creation, use warehouse stocks directly

#### Files Modified

**src/v2/pages/player-config/PlayerConfigPanel.vue**
- Line 9: Added `import { useWorldData } from '@/v2/services/worldData'`
- Lines 53-55: Added `const { current: worldCurrent } = useWorldData()` and `warehouseStocks` computed
- Line 438: Added `:warehouse-stocks="warehouseStocks"` prop to ConfiguredBase

**src/v2/pages/player-config/components/ConfiguredBase.vue**
- Line 23: Added `warehouseStocks: Record<number, number>` to props interface
- Line 255: Added `:warehouse-stocks="props.warehouseStocks"` to SummaryCalculationsSection

**src/v2/pages/player-config/components/SummaryCalculationsSection.vue**
- Line 26: Added `warehouseStocks: Record<number, number>` to props interface
- Lines 114-122: Changed `stockByMaterialId` to use `props.warehouseStocks` instead of `props.base.stock`
- Lines 275-277: Changed `workforceProductivity` to use `props.warehouseStocks` directly

#### Data Flow

```
useWorldData().current.warehouseStocks (SSOT)
  ↓
PlayerConfigPanel.warehouseStocks (computed)
  ↓
ConfiguredBase.props.warehouseStocks
  ↓
SummaryCalculationsSection.props.warehouseStocks
  ↓
stockByMaterialId computed (for Materials Balance)
  ↓
workforceProductivity computed (for Workforce Productivity)
```

#### Impact

- **Materials Balance > Stock coverage**: Now uses `warehouseStocks` (unchanged behavior, same source)
- **Global Summary > Materials Running Out**: Already uses `warehouseStocks` (unchanged)
- **Result**: Both views now show identical stock values from single source

#### Benefits

1. **Consistency**: All views show same stock values
2. **Maintainability**: One source to update (via API sync callbacks)
3. **Accuracy**: Stock updates propagate to all displays automatically
4. **Simplicity**: Removed redundant `props.base.stock` data

---

## Most Recent Work (January 2, 2026 - Part 5)

### Simplified: Worker Consumption Productivity Display

#### Problem
The workforce productivity section showed per-tier breakdown (T1, T2, T3, T4) which was verbose and didn't provide clear information about what specifically was causing productivity issues. Users needed a simpler overall view with detailed reasons for any reductions.

#### Solution

**Modified workforce productivity display in SummaryCalculationsSection.vue:**

1. **Removed per-tier grid**
   - Eliminated the 2-column grid showing individual tier productivity percentages
   - Removed generic "Limited by Housing/Consumption" labels

2. **Added detailed issue breakdown**
   - Shows specific issues only when productivity < 100%
   - Three types of issues displayed with distinct styling:
     - **Housing shortages** (orange): Shows tier, coverage percentage
     - **Missing essential materials** (red): Shows tier, count, satisfaction percentage
     - **Missing optional materials** (amber): Shows tier, count, satisfaction percentage

3. **Clearer visual hierarchy**
   - Overall productivity percentage at the top (unchanged)
   - Detailed reasons below only when needed
   - Color-coded warnings: orange (housing), red (essential), amber (optional)
   - Each issue gets its own card with icon and details

#### Display Logic

**When productivity = 100%**: Only shows overall percentage, no details
**When productivity < 100%**: Shows overall percentage + detailed breakdown per tier:
- Housing shortage if housingCoverage < 100%
- Missing essentials if missingEssentials > 0
- Missing optionals if missingOptionals > 0

#### Optional Consumables Consideration

The underlying `calculateWorkforceProductivity()` service already considers optional consumables correctly:
- Checks `consumption.optional` field
- Only counts active consumables in calculations
- Applies -10% satisfaction penalty per missing optional
- Applies x0.6 multiplier per missing essential

#### Files Modified

**src/v2/pages/player-config/components/SummaryCalculationsSection.vue**
- Lines 596-647: Replaced per-tier grid with detailed issue breakdown
- Removed: grid showing T1/T2/T3/T4 with individual percentages
- Added: Conditional detail display with housing/essential/optional breakdowns

#### Expected UI Changes

**Before**: 
```
⚙️ Workforce Productivity          78%
[T1: 85%] [T2: 70%] 
[T3: 80%] [T4: 75%]
Limited by Consumption
```

**After**:
```
⚙️ Workforce Productivity          78%
🏠 Tier 1: Housing shortage (85% coverage)
⚠️ Tier 2: Missing 2 essential materials (70% satisfaction)
📦 Tier 3: Missing 1 optional material (80% satisfaction)
```

---

## Most Recent Work (January 2, 2026 - Part 4)

### Enhanced: Initial Data Loading on Startup and World Switch

#### Problem
When reloading the page, setting up API key for the first time, or switching worlds, the warehouse stocks were not being loaded initially. Users had to wait for the auto-refresh cycle or manually click refresh buttons to see their stock data.

#### Solution

**Modified `initializeSyncService()` in syncService.ts:**

1. **Force fresh company data on init**
   - Changed `fetchCompanyBases` to use `forceRefresh = true`
   - Ensures fresh data when initializing (startup, API key setup, world switch)

2. **Deduplicate warehouse entries**
   - Added `processedWarehouses` Set to track unique warehouse IDs
   - Prevents duplicate entries when multiple bases share same warehouse

3. **Initial warehouse stock load**
   - After creating all sync entries, trigger immediate warehouse refresh
   - Loads all warehouse stocks in parallel (non-blocking)
   - Catches and logs errors without blocking initialization

4. **Proper timing**
   - Entries are set in `syncEntries.value` first
   - Then warehouse loads are triggered
   - Background refresh timer starts normally

#### When Initial Load Happens

- **Page reload**: `onMounted` in AppV2.vue → `initializeSyncService()`
- **First API key setup**: ApiLandingPage → `setApiKey()` → `initializeSyncService()`
- **World switch**: `watch(getWorld)` in AppV2.vue → `initializeSyncService()`

#### Files Modified

**src/v2/services/syncService.ts**
- Line 99: Changed `forceRefresh` from `false` to `true`
- Lines 137-152: Added warehouse deduplication logic
- Lines 163-177: Added initial warehouse stock load after entries are set

#### Expected Behavior

1. **On Startup/Reload**:
   ```
   → initializeSyncService() called
   → Company bases fetched (fresh)
   → Sync entries created (Company, Bases, Warehouses)
   → Entries displayed in SyncStatus
   → Warehouse stocks loaded immediately (parallel)
   → Callback triggers → stock updates in playerBases
   → Stock visible in UI without waiting
   ```

2. **On API Key Setup**:
   ```
   → User enters API key in ApiLandingPage
   → API validation
   → setApiKey() called
   → initializeSyncService() → immediate warehouse load
   → User sees stock data right away
   ```

3. **On World Switch**:
   ```
   → User switches G1 ↔ G2
   → watch(getWorld) triggers
   → initializeSyncService() → fresh company data + warehouses
   → New world's data loaded immediately
   ```

#### Testing
- ✅ TypeScript type-check passes
- ⏳ Browser test: Reload page, verify stock appears
- ⏳ Browser test: First-time API key setup, verify stock loads
- ⏳ Browser test: Switch worlds, verify stock updates

---

## Previous Work (January 2, 2026 - Part 3)

### Improved: Detailed Error Messages in SyncStatus

#### Problem
- API errors (like 429 Rate Limit) were showing only generic "Error" text
- Error details from API response body (e.g., `{"error":"Rate limit exceeded"}`) were lost
- Time displays would overwrite error messages, hiding critical information

#### Solution

**1. Enhanced API Error Extraction**
- Modified `warehouseService.ts` to read and parse error response bodies
- Extracts `error` or `message` fields from JSON error responses
- Preserves full error details like "429: Rate limit exceeded"
- Applied to all three fetch functions:
  - `fetchCompanyBases()`
  - `fetchWarehouseStockForBase()`
  - `fetchGameBaseDetails()`

**2. Improved Error Formatting**
- Enhanced `formatApiError()` in `syncService.ts` to:
  - Detect rate limit errors and preserve custom messages
  - Extract and display HTTP status details (e.g., "Rate limit: Rate limit exceeded")
  - Handle other status codes with their details (401, 403, 404, 500, 502, 503)
  - Increase max error length to 100 chars (from 50) for better debugging
  - Never truncate important error information

**3. Updated SyncStatus Display**
- Show full error message instead of just "❌ Error"
- Error tooltip still shows full text on hover
- Replace time countdown with "—" when error exists (prevents overwriting)
- Never show time displays in columns with active errors
- Added CSS for proper error text overflow handling

#### Files Modified

**src/v2/services/api/warehouseService.ts**
- Lines 73-92: Enhanced fetchCompanyBases error handling
- Lines 133-149: Enhanced fetchWarehouseStockForBase error handling
- Lines 205-221: Enhanced fetchGameBaseDetails error handling

**src/v2/services/syncService.ts**
- Lines 171-222: Completely rewrote formatApiError() function
- Preserves API error details
- Better rate limit error detection
- Longer max error length

**src/v2/pages/config/components/SyncStatus.vue**
- Template: Show full error text instead of generic "Error"
- Template: Replace countdown with "—" when error exists
- CSS: Added error text overflow handling

#### Error Display Examples

**Before:**
```
❌ Error    5m 23s
```

**After (Rate Limit):**
```
❌ Rate limit: Rate limit exceeded    —
```

**After (Auth Error):**
```
❌ Auth error: Invalid API key    —
```

**After (Generic Error):**
```
❌ Failed to fetch warehouse stock for warehouse 123: Network error    —
```

#### Testing
- ✅ TypeScript type-check passes
- ⏳ Test with actual 429 error to verify message display
- ⏳ Test that errors persist until successful refresh
- ⏳ Verify tooltip shows full error on hover

---

## Previous Work (January 2, 2026 - Part 2)

### Fixed: Warehouse Stock Callback System

#### Problem
User reported two issues:
1. Warehouse stock API returns data but stock displays as 0
2. After investigation, it turned out the existing SyncStatus.vue was working correctly - the issue was just a temporary API timeout

#### Root Cause
There were **two separate state management systems** for player bases:
- `useWorldData().current.bases` - Used by syncService
- `usePlayerBases().state.bases` - Used by UI

The syncService was updating worldData, but UI read from playerBases - completely separate stores with no synchronization.

#### Solution Implemented

**1. Added `updateStockForWarehouse()` to playerBases.ts**
- Takes warehouseId and stocks (Record<materialId, quantity>)
- Finds all bases with matching gameWarehouseId
- Updates stock for all matching bases atomically
- Sanitizes data and persists to localStorage

**2. Extended SyncCallbacks interface in syncService.ts**
- Added `onWarehouseStockLoaded?: (warehouseId: number, stocks: Record<number, number>) => void`
- Allows components to react to warehouse stock updates

**3. Modified warehouse refresh logic in syncService.ts**
- Removed direct manipulation of worldData.current.bases
- Now triggers onWarehouseStockLoaded callback after fetching
- Still updates worldData.warehouseStocks for global calculations

**4. Registered callback in PlayerConfigPanel.vue**
- Added handleWarehouseStockLoaded(warehouseId, stocks) function
- Imports and calls updateStockForWarehouse()
- Registered in registerSyncCallbacks()

**5. Added Debug Logging** (can be removed later)
- playerBases.ts: Logs when updateStockForWarehouse is called
- PlayerConfigPanel.vue: Logs when callback receives data
- syncService.ts: Logs warehouse stock loading

#### Files Modified

**src/v2/services/playerBases.ts**
- Lines ~295-320: Added updateStockForWarehouse() function with logging
- Exported in return statement

**src/v2/services/syncService.ts**
- Line ~27: Extended SyncCallbacks interface
- Lines ~240-260: Modified warehouse refresh to use callback with logging

**src/v2/pages/player-config/PlayerConfigPanel.vue**
- Line ~43: Imported updateStockForWarehouse
- Lines ~303-307: Added handleWarehouseStockLoaded() with logging
- Line ~217: Registered callback in registerSyncCallbacks()
- Removed unused variables: apiSyncPanel, handleStocksLoaded

#### How It Works Now
1. **Auto-Refresh (every 5 minutes)**:
   - syncService fetches warehouse stocks
   - Triggers onWarehouseStockLoaded callback
   - PlayerConfigPanel receives callback
   - Calls updateStockForWarehouse()
   - Updates all bases with matching warehouseId
   - Saves to localStorage

2. **Manual Sync**:
   - Use SyncStatus.vue in Configuration page
   - Click refresh button (🔄) for any warehouse entry
   - Same callback flow as auto-refresh

3. **Persistence**:
   - Stock is saved in playerBases localStorage
   - loadState() restores stock on page reload
   - Works across world switches

#### Testing Checklist
- ✅ TypeScript type-check passes
- ✅ SyncStatus.vue shows all sync entries
- ⏳ Browser test: Verify stock updates and persists
- ⏳ Browser test: Verify world switching works

#### Debug Console Output (Expected)
When warehouse syncs:
```
[SyncService] Warehouse stocks loaded { warehouseId: 123, stockCount: 50, hasCallback: true }
[PlayerConfigPanel] handleWarehouseStockLoaded { warehouseId: 123, stockCount: 50 }
[PlayerBases] updateStockForWarehouse called { gameWarehouseId: 123, stockCount: 50 }
[PlayerBases] Updating stock for base "Base Name" "base-id"
[PlayerBases] Stock updated, saving to localStorage
```

---

## Previous Work: Workforce Productivity & Price Alerts

### Workforce Productivity Integration (December 28, 2024)

#### Solution Implemented

**1. Added `updateStockForWarehouse()` to `playerBases.ts`**
- Takes `warehouseId` and `stocks` (Record<materialId, quantity>)
- Finds all bases with matching `gameWarehouseId`
- Updates stock for all matching bases atomically
- Sanitizes data and persists to localStorage once
- More efficient than updating bases individually

**2. Extended `SyncCallbacks` interface in `syncService.ts`**
- Added `onWarehouseStockLoaded?: (warehouseId: number, stocks: Record<number, number>) => void`
- Allows components to react to warehouse stock updates
- Follows existing pattern used for `onCompanyDataLoaded`

**3. Modified warehouse refresh logic in `syncService.ts`**
- Removed direct manipulation of `worldData.current.bases`
- Now triggers `onWarehouseStockLoaded` callback after fetching stocks
- Still updates `worldData.warehouseStocks` for global calculations
- Decouples sync service from player bases implementation

**4. Registered callback in `PlayerConfigPanel.vue`**
- Added `handleWarehouseStockLoaded(warehouseId, stocks)` function
- Imports and calls `updateStockForWarehouse()`
- Registered in `registerSyncCallbacks()` alongside existing company data callback

#### Files Modified

**src/v2/services/playerBases.ts**
- Lines ~295-314: Added `updateStockForWarehouse()` function
- Exported in return statement (line ~428)

**src/v2/services/syncService.ts**
- Line ~27: Extended `SyncCallbacks` interface
- Lines ~240-258: Modified warehouse refresh to use callback

**src/v2/pages/player-config/PlayerConfigPanel.vue**
- Line ~43: Imported `updateStockForWarehouse`
- Lines ~303-306: Added `handleWarehouseStockLoaded()` function
- Line ~217: Registered callback in `registerSyncCallbacks()`

#### Testing
- ✅ TypeScript type-check passes
- ✅ No compile errors
- ⏳ Browser testing needed: Verify auto-refresh updates UI stock values

#### Technical Notes
- Warehouse stocks are shared across multiple bases (same `gameWarehouseId`)
- Auto-refresh interval: 5 minutes
- Stock data cached with 5-minute TTL in `warehouseService`
- Transform function: `mats[{id, am}]` → `items[{materialId, quantity}]`

---

## Previous Work: Workforce Productivity & Price Alerts

### Workforce Productivity Integration (December 28, 2024)

**Problem**: Workforce productivity showing 10% despite having all consumables

**Solution**: Added stock data validation
- Added `hasStockData` flag to `WorkforceProductivitySummary` type
- UI warning when stock data unavailable
- Enhanced explanation generation
- 11 comprehensive tests (all passing)

**Files Modified**:
- `src/v2/services/production/workforceProductivity.ts`
- `src/v2/pages/player-config/components/SummaryCalculationsSection.vue`
- `src/v2/components/BaseDetailExpanded.vue`

**UI Changes**:
- Removed "Tier" column from worker consumption tables
- Added workforce productivity section above worker consumption
- Shows per-tier productivity with limiting factors
- Lost profit warning when < 100%

### Price Alerts Feature (December 28, 2024)

Added price alert functionality to Materials Running Out page:
- Alert buttons inline with material names (🔔/💰/📈)
- Removed separate "Alert" column (per user request)
- Time left colors: green when >timeframe, red when <timeframe
- Integrated with existing `AlertOverlay` component

**Files Modified**:
- `src/v2/components/StockWarnings.vue`
- `src/v2/pages/MaterialsShortagePage.vue`

---

## Architecture & Patterns

### State Management
- **Player Bases**: `usePlayerBases()` - localStorage-backed, UI state
- **World Data**: `useWorldData()` - API-synced, per-world isolation
- **Sync Service**: Background auto-refresh with callbacks
- Separation allows planning mode without affecting current state

### Service Patterns
- **ETL**: External API connections use extraction → transformation → load
- **MVC**: Model-View-Controller separation
- **Repository**: Services encapsulate data access
- **Composables**: Reactive state with Vue Composition API

### Docker Environment
- Dev container: Ubuntu 24.04.3 LTS
- Command: `docker compose up`
- Web service: node:20-alpine, port 5173
- Commands: `docker compose exec web npm run <script>`

---

## Next Steps

1. **Test warehouse stock fix in browser**:
   - Start docker compose
   - Configure API key
   - Wait for auto-refresh or manually sync warehouse
   - Verify stock displays in Bases section
   - Check workforce productivity updates with stock

2. **If issues persist**:
   - Check browser console for errors
   - Verify `gameWarehouseId` is set on bases
   - Confirm sync service is creating warehouse entries
   - Add logging to `handleWarehouseStockLoaded`

3. **Potential enhancements**:
   - Manual "Refresh Stock" button for immediate updates
   - Visual indicator when stock is stale (>5 minutes old)
   - Toast notification when stock successfully updates
