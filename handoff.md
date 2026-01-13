// Handoff Document

## Current Session: Planning Mode - Production Display Separation ✅

**Branch**: `71-planning-mode`  
**Status**: RecipeTile Current/Planned separation complete. Ready for further work.

**Most Recent Changes**:
- ✅ Separated Current Production (readonly, API-based) from Planned Production (editable, user-modified) in RecipeTile
- ✅ Updated ProductionSection to create dual reports (reportCurrent vs report)
- ✅ Implemented side-by-side UI display showing Current (left) and Planned (right) columns
- ✅ All tests passing (240/240), type-check and lint clean

---

## Completed Features This Session

### 1. ✅ Implemented Current vs Planned Production Display (RecipeTile)

**Objective**: Enforce Planning Mode philosophy - show API data (Current) as readonly, allow user to modify Planned values

**Architecture Changes**:
- **ProductionSection.vue**:
  - Added `currentTechnologyLevelMap` computed (from props.currentTechnologyLevels)
  - Added `currentTechnologyLevelsOption` computed (converts map to object)
  - Created `reportCurrent` computed (uses currentTechnologyLevelsOption + currentStartingBonus for API-based calculations)
  - Kept `report` computed (uses technologyLevelsOption + startingBonus for user-modified calculations)
  - Added dual CardData structures: `cardsByIdCurrent` (API data) and `cardsById` (planned/editable)
  - Updated RecipeTile props to pass `reportRowCurrent` and `currentTechnologyLevel`

- **RecipeTile.vue**:
  - Added comprehensive Current production computed properties:
    - `currentActiveUnits`, `currentRunsPerModulePerDay`, `currentRunsPerDay`
    - `currentOutputPerDay`, `currentInputsPerDay`
    - `currentOutputPerPeriod`, `currentInputsPerPeriod`
    - `currentWorkforce`, `currentWorkforceFactor`, `currentAbundanceFactor`, `currentProductivityFactor`
    - `currentBlockedReason` and related status helpers
  - Updated template to show side-by-side comparison:
    - Left column: Current Production (readonly, uses currentXxx computeds)
    - Right column: Planned Production (editable, uses existing xxx computeds)
    - Both sections show: Tech level, factors, queue share, runs/hour, output, inputs, workforce demands
  - Applied consistent styling: Current uses slate-400/500 (dimmed), Planned uses emerald-300 (bright)

**Code Quality**:
- Type-check: ✅ 0 errors
- Lint: ✅ 0 errors (all unused vars removed)
- Tests: ✅ 240/240 passing

---

## Architecture Overview

### Planning Mode Philosophy
1. **Current State** (readonly, from API):
   - Shows what the user's base actually produces right now
   - Based on API-sourced technology levels and starting bonus
   - Display only - cannot be modified
   
2. **Planned State** (editable, user input):
   - Shows what the user plans to configure
   - Based on user-modified technology levels and starting bonus
   - User can modify through UI

### Dual Report Pattern
```
ProductionSection:
├── reportCurrent (computed from props.currentTechnologyLevels + props.currentStartingBonus)
│   └── used for readonly Current display
├── report (computed from props.technologyLevels + props.startingBonus)  
│   └── used for editable Planned display
├── cardsByIdCurrent (from reportCurrent)
│   └── passed to RecipeTile as reportRowCurrent
└── cardsById (from report)
    └── passed to RecipeTile as reportRow
```

### RecipeTile Two-Column Layout
```
┌─ Header: Recipe Name, Building, Controls ─┐
├─ [CURRENT] │ [PLANNED] (two-column grid) │
│ (readonly) │ (editable)                  │
├─ Tech Level │ Tech Level (user-modified) │
├─ Factors   │ Factors (updated on input)  │
├─ Queue/Runs│ Queue/Runs (computed)       │
├─ Output    │ Output (based on plan)      │
├─ Inputs    │ Inputs (based on plan)      │
└─ Workforce │ Workforce (from report)     ─┘
```

---

## Test Results

```
Type Check:    ✅ 0 errors
Lint:          ✅ 0 errors
Tests:         ✅ 240/240 passing
Commit:        fac0ba4 + e304b11
```

---

## Files Modified This Session

1. **ProductionSection.vue**
   - Lines 58-88: Added currentTechnologyLevelMap and currentTechnologyLevelsOption
   - Lines 92-108: Added reportCurrent and dual report logic
   - Lines 135-145: Added cardsByIdCurrent and cardsById separation
   - Template: Updated RecipeTile props for current/planned data

2. **RecipeTile.vue**
   - Lines 7-26: Updated props to include reportRowCurrent and currentTechnologyLevel
   - Lines 50-169: Added comprehensive Current production computed properties
   - Lines 160-165: Added blocked status helpers (blockedByAbundance, etc.)
   - Lines 167-169: Added hasTechnology and currentHasTechnology comparisons
   - Lines 184-438: Updated template to show Current (left) and Planned (right) columns
   - Styling: Current uses dimmed colors (slate-400), Planned uses bright (emerald-300)

---

## Known Limitations & Future Work

### Pending: BaseBuildingsSection.vue Current/Planned Separation
**Status**: ⚠️ Not yet implemented
**Reason**: Requires architectural change to state management
- Current implementation: PlayerBase stores single `buildings` array (planned/user-editable)
- Needed for Current/Planned: Store current buildings separately when imported from API
- Would require tracking API-sourced buildings in CurrentState, then passing to ConfiguredBase
- Complexity: Affects playerBases service, worldData types, and ConfiguredBase component hierarchy

**Approach for future work**:
1. Modify PlayerBase type to optionally store currentBuildings
2. Update syncBaseFromApi to preserve current building levels
3. Add currentBuildings prop to ConfiguredBase
4. Update BaseBuildingsSection to show dual Current/Planned like RecipeTile
5. Consider extracting to reusable "DualDisplay" component pattern

---

## How to Continue This Work

If implementing BaseBuildingsSection.vue Current/Planned:
1. Read this document section on state architecture
2. Review ProductionSection + RecipeTile changes as the pattern reference
3. Assess if PlayerBase type needs currentBuildings field
4. Update synchronization logic in playerBases.ts
5. Apply dual-column layout from RecipeTile to BaseBuildingsSection
6. Run full test suite and lint checks

---

## Key Technical Patterns Established

1. **Dual Report Generation**:
   - Create separate `reportCurrent` and `report` computed properties
   - Both use same calculation engine, just different input sources

2. **Side-by-Side UI Display**:
   - Use CSS Grid `grid-cols-2` for two equal columns
   - Left column: Current (readonly, dimmed styling)
   - Right column: Planned (editable, bright styling)
   - Border separator between columns for clarity

3. **Computed Property Naming Convention**:
   - Planned: `activeUnits`, `outputPerDay`, `blockedReason`
   - Current: `currentActiveUnits`, `currentOutputPerDay`, `currentBlockedReason`
   - Makes it clear which source (API vs user) each computes from

4. **Props Passing Pattern**:
   - For Current: pass `reportRowCurrent` and `currentTechnologyLevel`
   - For Planned: pass `reportRow` (contains all needed data) and `technologyLevel`
   - Child component mirrors parent's dual structure

---

## Code Review Checklist

- [x] Type-check passes (0 errors)
- [x] Linter passes (0 errors)
- [x] All tests passing (240/240)
- [x] Current production shows readonly (no inputs, dimmed colors)
- [x] Planned production shows editable (user can modify)
- [x] Both sections show same metrics for easy comparison
- [x] Styling clearly distinguishes Current (slate-400) vs Planned (emerald-300)
- [x] Git history clean (meaningful commit messages)

---

## Next Steps (Recommended Order)

1. **Optional**: Implement BaseBuildingsSection.vue Current/Planned display
   - Requires state management changes
   - Use RecipeTile pattern as reference
   
2. **QA Testing**: Manual testing of Planning Mode workflows
   - Import base from API
   - Verify Current Production shows API data
   - Modify technology levels
   - Verify Planned Production updates while Current stays fixed
   - Test with multiple recipes and buildings

3. **Polish**: UI refinements based on user feedback
   - Column widths and spacing
   - Color contrast for accessibility
   - Mobile responsiveness of two-column layout

4. **Performance**: Monitor re-render cycles if needed
   - Current dual-structure should be efficient
   - No extra API calls or calculations

---

## Session End Notes

Production display separation is the largest piece of Planning Mode UI refactoring. The Current vs Planned separation now works for Recipes (ProductionSection).

Building configuration (BaseBuildingsSection) would benefit from the same treatment but requires more architectural work to track API-sourced building levels separately.

All quality gates passed - code is ready for review and deployment.

- Applied consistently to all Revenue and Stock cells showing differences

---

## Next Steps (if needed)

1. Monitor user feedback on color changes and Stock column naming
2. Consider additional refinements to Planning Mode UI
3. Any additional worker/materials table styling requests

---

## Important Discovery: How Optional Consumables Affect Productivity

### User's Expected Behavior (INCORRECT):
> "When I deactivate an optional consumable, workforce productivity should drop"

### Actual System Behavior (CORRECT):
**Deactivated optional consumables do NOT reduce productivity!**

#### Why This Is Correct:
1. **Deactivated Optionals Are Ignored**
   - When you deactivate an optional consumable, you're saying "I don't want to provide this"
   - The system stops calculating consumption for that material
   - Workers don't expect it, so productivity is NOT affected

2. **Only ACTIVE Optionals Affect Productivity**
   - Productivity drops only when an **ACTIVE** optional is **missing from stock**
   - Example: 
     - Ale is ACTIVE but stock = 0 → Productivity drops 10%
     - Ale is DEACTIVATED → Productivity remains 100% (regardless of stock)

3. **Wiki-Accurate Satisfaction Formula**
   ```
   Satisfaction = 100%
                - (10% × missing ACTIVE optionals)
                × (0.6 ^ missing essentials)
                (floor: 10%)
   ```

### Test Results Confirming Correct Behavior:

```typescript
// Test 1: All optionals active + in stock
activeOptionals = [workwear, ale]
stock = { workwear: 1000, ale: 1000 }
→ Productivity = 100% ✓

// Test 2: One optional deactivated (ale)
activeOptionals = [workwear]  // ale removed
stock = { workwear: 1000, ale: 1000 }
→ Productivity = 100% ✓  // Ale not counted as "missing"

// Test 3: Active optional missing from stock
activeOptionals = [workwear, ale]
stock = { workwear: 0, ale: 1000 }  // workwear missing
→ Productivity = 90% ✓  // -10% for missing ACTIVE optional
```

---

## What Was Accomplished This Session

### 1. Reactivity Investigation

**Verified that the system works correctly:**
1. ✅ `optionalActive` ref is reactive
2. ✅ `report` computed depends on `optionalActive.value`
3. ✅ `report.workers` includes correct `active` flag
4. ✅ `workforceProductivity` recalculates when `report` changes
5. ✅ Productivity warnings display correctly

### 2. Test Coverage Added

**File**: `src/v2/pages/player-config/components/__tests__/workforce-productivity-reactivity.test.ts`

Tests confirm:
- ✅ 100% productivity when all ACTIVE consumables in stock
- ✅ Deactivated optionals don't count as "missing"
- ✅ ACTIVE optionals missing from stock DO reduce productivity
- ✅ `report.workers` includes correct `active` flags

### 3. System Documentation
**File**: `src/v2/pages/player-config/components/SummaryCalculationsSection.vue`

#### Changes Made:

1. **All Optional Consumables Default to Active**
   - Previous: Loaded from `props.base.optionalConsumables` (could be empty)
   - Now: All optional consumables active by default
   - New helper function: `getAllOptionalConsumables()`
   - Scans all worker tiers (1-4) for non-essential consumables

2. **Helper Function Added**
   ```typescript
   function getAllOptionalConsumables(): Set<number> {
     const optionals = new Set<number>()
     ;[1, 2, 3, 4].forEach((tier) => {
       const worker = props.index.workerByType.get(tier as Worker['type'])
       if (!worker) return
       worker.consumables
         .filter((c) => !c.essential)
         .forEach((c) => optionals.add(c.matId))
     })
     return optionals
   }
   ```

3. **Initialization Logic**
   - `optionalActive` initialized with all optionals active
   - Watch handler checks if user has custom settings
   - If `props.base.optionalConsumables` is empty/undefined → use all
   - If user has explicit settings → respect those

4. **Auto-Save on Mount**
   - When base has no saved optional consumables
   - Automatically emits all active optionals to parent
   - Ensures state is persisted to localStorage
   - Only happens once per base on first load

### 2. Workforce Productivity Tracking (Already Working)

The workforce productivity system was already in place and working:

#### How it Works:
1. **Calculate Productivity**
   ```typescript
   const workforceProductivity = computed(() => {
     return calculateWorkforceProductivity(report.value, props.warehouseStocks)
   })
   ```
   - Uses `report.value` which includes `activeOptionalConsumables`
   - Checks stock levels for all worker consumables
   - Returns productivity percentage and details

2. **Productivity Warning Display**
   - Shown when `workforceProductivity.overallProductivityPercent < 100`
   - Orange badge with "Lost Profit" amount
   - Shows housing coverage % if below 100%
   - Shows satisfaction % if below 100% (affected by missing optionals)

3. **Lost Profit Calculation**
   ```typescript
   const lostProfitResult = computed(() => {
     return calculateLostProfit(
       workforceProductivity.value,
       report.value,
       // ... other params
     )
   })
   ```
   - Calculates exact profit loss from reduced productivity
   - Factors in reduced worker satisfaction from missing optionals
   - Scaled to selected timeframe

### 3. User Flow

#### New Base (First Load):
1. Base has no saved `optionalConsumables`
2. Component initializes with ALL optionals active
3. `onMounted` detects no saved state
4. Emits all active optionals to parent
5. Parent saves to `playerBases.state` → localStorage
6. Workforce productivity = 100% (all consumables available)

#### User Deactivates Optional:
1. User unchecks optional consumable
2. `toggleOptional()` removes from active set
3. Emits updated list to parent
4. Parent saves to localStorage
5. `report.value` recalculates with new active set
6. `workforceProductivity` recalculates
7. If productivity drops < 100% → warning appears

#### Returning User:
1. Base has saved `optionalConsumables` list
2. Watch handler loads saved preferences
3. Workforce productivity calculated based on saved state
4. Warning shown if productivity < 100%

### 4. Test Results
✅ **All Tests Passing**:
- Test Files: 25/25 passing
- Tests: 231/231 passing  
- Type-Check: 0 errors
- Lint: 0 errors (auto-fixed)

---

## Technical Implementation Details

### State Management Flow:

```
Component Init
    ↓
getAllOptionalConsumables() → Set<number>
    ↓
optionalActive = ref(allOptionals)
    ↓
Watch props.base.optionalConsumables
    ↓
If saved state exists → Use it
If no saved state → Keep all active
    ↓
onMounted: Check if needs save
    ↓
If no saved state → emit to parent
    ↓
Parent saves to localStorage
```

### Productivity Calculation:

```
User changes optional
    ↓
toggleOptional(materialId)
    ↓
optionalActive updated
    ↓
emit('updateOptional', [...])
    ↓
Parent saves new state
    ↓
report recomputes (uses activeOptionalConsumables)
    ↓
workforceProductivity recomputes
    ↓
If < 100% → Warning displayed
    ↓
lostProfit calculated
```

### Key Computed Properties:

1. **workforceProductivity**
   - Input: `report.value` (includes active optionals), `warehouseStocks`
   - Output: `{ overallProductivityPercent, hasStockData, explanation, tierDetails }`
   - Recalculates when report or stocks change

2. **lostProfitData**
   - Only calculated when productivity < 100%
   - Returns null if productivity is 100%
   - Scaled by `periodFactor` for selected timeframe

3. **optionalConsumables**
   - Scans all worker tiers
   - Groups by tier
   - Provides material IDs and amounts for UI

---

## UI Display

### Optional Consumables Section:
- Checkbox for each optional consumable
- Grouped by worker tier (T1, T2, T3, T4)
- Material icon + name + amount displayed
- "(optional)" label next to name

### Workforce Productivity Display:
```
⚙️ Workforce Productivity XX%

[If < 100%]
Lost Profit $XXX (YY% housing coverage, ZZ% satisfaction)
```

### Warning Conditions:
- Orange badge appears when productivity < 100%
- Shows calculated lost profit per period
- Breaks down causes (housing vs satisfaction)
- Only shown when stock data available

---

## Session Outcome

### ✅ What Was Verified / Updated:
1. **Reactivity Chain Works Correctly**
    - `optionalActive` ref → reactive
    - `report` computed → depends on `optionalActive.value`
    - `workforceProductivity` computed → depends on `report.value`
    - UI updates immediately when toggling optionals

2. **Optional Consumable Rules (per new request)**
    - Inactive optionals now reduce satisfaction (treated as missing)
    - Active + out-of-stock optionals reduce satisfaction **and** flag limiting material
    - Active + in-stock optionals do not reduce satisfaction
    - Satisfaction formula remains Wiki-compliant (optional penalty -10% each, essential x0.6 each, floor 10%)
    - Covered by tests: [src/v2/services/production/__tests__/workforceProductivityOptionals.test.ts](src/v2/services/production/__tests__/workforceProductivityOptionals.test.ts)

3. **All Tests Pass**
    - 236/236 tests passing ✅
    - 0 TypeScript errors ✅
    - 0 Lint errors ✅

### 📝 Behavior Summary for Optionals:

- **Inactive optional** → counts as missing → -10% satisfaction per item (stock irrelevant)
- **Active optional, no stock** → -10% satisfaction per item and marked as limiting (0 days)
- **Active optional, in stock** → no penalty

---

## Next Steps for New Agent

If user still wants productivity to drop when deactivating optionals:
1. This would require changing the game mechanics (not recommended)
2. Would deviate from Wiki documentation
3. Current behavior is correct and tested

**Recommended approach**: Educate user on correct system behavior rather than changing the logic.

---

## Previous Sessions Summary

### Materials Balance Refinement:
- Weight columns added to all material tables
- Revenue columns unified across tables
- Unit price with alerts in export materials

### Planning Mode Features:
- Current vs Planned production tracking
- Technology level differentiation
- Blue highlighting for differences

---

## Important Notes

### Worker Consumables Categories:

1. **Essential Consumables**
   - Required for basic worker function
   - Always active (can't be disabled)
   - Not shown in optional section
   - Examples: Basic food, basic drinks

2. **Optional Consumables**
   - Improve worker satisfaction
   - Can be toggled by user
   - Default: ALL ACTIVE
   - Examples: Luxury food, entertainment items

### Productivity Impact:

- **Housing Coverage**: Available housing / required workforce
- **Satisfaction**: Essential + Optional consumables coverage
- **Overall Productivity**: MIN(housing coverage, satisfaction)
- Each tier calculated independently

### Data Persistence:

- Saved in `PlayerBase.optionalConsumables: number[]`
- Persisted to localStorage via `playerBases.state`
- Synced across component remounts
- Defaults restored if data corrupted/missing

---

## Testing Scenarios

1. **New Base**: Should have all optionals active by default
2. **Deactivate Optional**: Productivity should recalculate, warning appears if needed
3. **Reload Page**: Settings should persist across page reloads
4. **Multiple Bases**: Each base maintains independent optional settings
5. **No Stock Data**: Warning shows "stock data not available" instead

---

## Next Steps

1. **UI Verification**: Test that all optionals are checked on new base
2. **Productivity Test**: Deactivate optional and verify warning appears
3. **Persistence Test**: Reload page and verify settings persist
4. **Cross-Base Test**: Verify each base has independent settings
5. **PR Review**: Ready for final code review

**Status**: ✅ Production Ready

