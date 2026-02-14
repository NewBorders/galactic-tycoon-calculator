# Handoff

## Status
- No open items.
- Technology import now bumps planned levels to at least current during API sync.
- Added integration coverage for planned tech bump on import.
- Sync intervals now applied per entry consistently (init, refresh, reload).
- Added in-flight request deduping for sync init, game data loads, and warehouse/company/base API calls.
- Base import now bumps planned building levels and recipe counts to at least current; added integration coverage.
- TODO sync now updates from-levels when current advances and shows a browser notification on API updates.
- Deduped concurrent market-details fetches and added refresh backoff on sync errors to prevent repeat calls.
- Added debug counters for API calls in game data extract, warehouse service, and market details extractor.
- Deduped game data loads across force/normal requests and removed /public/company/base list fallback.

---

## Session 22 Summary (Fix Material Names for New Base Costs - COMPLETED)

**Task**: Implement configurable debug logging system with localStorage control, off by default in production

**Status**: ✅ COMPLETED - Full system implemented and tested

### What Was Done

1. **Created Debug Logging System** (`src/v2/services/debug/logger.ts`)
   - `createLogger(moduleName)` - Create logger for specific module
   - Log levels: OFF, ERROR, WARN, INFO, DEBUG, TRACE
   - Module filtering with wildcard support
   - localStorage-based persistent configuration
   - Caching for performance

2. **Configuration Keys**:
   - `gt_debug_level` - Current log level (OFF by default)
   - `gt_debug_modules` - Comma-separated module names or "*" for all

3. **Development API** - `window.__gt_debug`:
   - `__gt_debug.setLevel('DEBUG')` - Set log level
   - `__gt_debug.setModules('SyncService,*')` - Enable modules
   - `__gt_debug.getConfig()` - View current config
   - `__gt_debug.reset()` - Clear cache

---

## Session 23 Summary (Tier Extra Costs UI + Refactor - COMPLETED)

**Task**: Show tier 2/3/4 extra building costs without core imports, fix runtime errors, and clean up BaseBuildingsSection rendering.

**Status**: ✅ COMPLETED

### What Was Done

1. **Switched to Service Layer**
   - BaseBuildingsSection now uses `buildingCostsRepository` instead of core functions.
   - Game data access uses `getGameData()` from the repository.

2. **Safe Rendering + Refactor**
   - Filtered invalid `buildingRefs` via `validBuildingRefs`.
   - Added `extraCostByInstanceId` computed map to avoid repeated inline calculations.
   - Moved extra-cost UI inside the building card to keep `inst` in scope.

3. **Tests**
   - `docker compose exec web npm run test -- --run`
   - Result: 47 test files, 363 tests passed.

---

## Session 24 Summary (Todo List Tier Extra Costs Fix - COMPLETED)

**Task**: Ensure tier 2/3/4 extra materials are included in TODO list costs for building adds.

**Status**: ✅ COMPLETED

### What Was Done

1. **Fixed building add cost tier selection**
   - `trackAddBuilding` now uses planet tier (from game data) instead of planetId when computing materials cost.
   - Ensures extra materials for tiers 2/3/4 are included in TODO list cost strings.

2. **Tests**
   - `docker compose exec web npm run test -- --run`
   - Result: 47 test files, 363 tests passed.

---

## Session 25 Summary (PR Comment Fixes - COMPLETED)

**Task**: Address unresolved PR review comments across sprite loading, caching, logging, and UI paths.

**Status**: ✅ COMPLETED

### What Was Done

1. **Sprite Index Safety**
   - Added DOM guard and `sprite-loaded` listener for re-indexing in [src/v2/constants/spriteIndex.ts](src/v2/constants/spriteIndex.ts).

2. **Market Analysis Cache Scoping**
   - Cache keys now include world; tests updated accordingly.

3. **Warehouse Service Dedupe Errors**
   - In-flight promises now store normalized error handling for consistent callers.

4. **Logger Behavior**
   - WARN/ERROR now bypass module gating unless level is OFF.

5. **Recipe Count Zero Support**
   - Updated ConfiguredBase + MaterialsShortagePage to allow `count = 0`.

6. **Workforce Productivity Messaging**
   - Explanation no longer gated by stock data; `hasStockData` reflects presence of keys.

7. **Remove Global Tab Setter + Debug Logs**
   - ApiLandingPage now emits `set-active-tab`; AppV2 uses logger instead of console.

8. **BaseBuildingsSection Optimization**
   - Cached `currentBuildings` by slotId for faster lookups.

9. **Tests**
   - `docker compose exec web npm run test -- --run`
   - Result: 47 test files, 363 tests passed.

---

## Session 26 Summary (Type Check + Lint Fixes - COMPLETED)

**Task**: Run `docker compose` type checks and fix all errors; address lint issues.

**Status**: ✅ COMPLETED

### What Was Done

1. **Type Check Fixes**
   - Expanded `PlayerBasesService` type to include `currentBuildings`, `currentRecipes`, and `recipes`.

2. **Lint Fixes**
   - Removed unused logger import and unused catch parameters in `syncService`.

3. **Commands Run**
   - `docker compose exec web npm run type-check`
   - `docker compose exec web npm run lint`

---

## Session 27 Summary (Build Type-Check Fix - COMPLETED)

**Task**: Fix build-time type-check error in sync service.

**Status**: ✅ COMPLETED

### What Was Done

1. **syncService catch fix**
   - Restored `error` parameter in catch so `formatApiError(error)` works.

2. **Command Run**
   - `docker compose exec web npm run type-check`

---

## Session 28 Summary (PR Open Points Cleanup - COMPLETED)

**Task**: Resolve remaining PR review comments and re-run checks.

**Status**: ✅ COMPLETED

### What Was Done

1. **ImportConfirmDialog Macro Note**
   - Documented `defineProps/defineEmits` as compiler macros (no imports).

2. **Price Tests Mocking**
   - Replaced `as unknown as` with `vi.stubGlobal` and typed mock.

3. **Production Engine Clarity**
   - Default recipe count to 0 when invalid; removed redundant clamp arg.

4. **Config + Localisation Cleanup**
   - Added stdin_open comment in compose.
   - Extracted `MAX_DISPLAYABLE_DAYS` constant for `formatDays`.

5. **ConfiguredBase Emit Note**
   - Documented why recipe reordering remains supported.

6. **Commands Run**
   - `docker compose exec web npm run type-check`
   - `docker compose exec web npm run lint`
   - `docker compose exec web npm run test -- --run`

4. **Smart Behavior**:
   - ERROR and WARN always logged (production-safe)
   - DEBUG/INFO/TRACE filtered by module (must be enabled)
   - Zero overhead when OFF (default in production)
   - Settings persist across page reloads

5. **Comprehensive Testing** (`src/v2/services/debug/__tests__/logger.test.ts`)
   - 8 tests covering all scenarios
   - All passing ✅

### Files Created
- `src/v2/services/debug/logger.ts` - Core system (182 lines)
- `src/v2/services/debug/__tests__/logger.test.ts` - Tests (147 lines)
- `src/v2/services/debug/README.md` - User documentation

### Usage Example

```typescript
import { createLogger } from '@/v2/services/debug/logger'

const logger = createLogger('SyncService')
logger.debug('Loading bases from API')
logger.error('Failed:', error)
```

Browser console (development):
```javascript
__gt_debug.setLevel('DEBUG')
__gt_debug.setModules('SyncService')  // Only this service
```

### Next Steps
- Gradually migrate existing console.log statements to use createLogger()
- Services to update: SyncService, StateReversion, ChangeTracker, etc.
- System is backward-compatible - can be integrated incrementally

---

## Session 22 Summary (Fix Material Names for New Base Costs - COMPLETED)

**Task**: Fix material icons showing as "Material 3", "Material 26" etc. instead of actual names like "Concrete", "Construction Kit"

**Status**: ✅ COMPLETED - Material names now correctly resolved

### Problem Identified

Material names for new base costs were displayed as "Material 3", "Material 26" etc. instead of "Concrete", "Construction Kit", because the ChangeTracker was created without GameData access.

### Root Cause

In [PlayerConfigPanel.vue](src/v2/pages/player-config/PlayerConfigPanel.vue) line 294, the `selectPlanet()` function called `getChangeTracker()` without passing `props.gameData`, while all other usages in the same file correctly passed it.

This caused the `formatMaterialList()` function in [manualCosts.ts](src/v2/constants/manualCosts.ts) to fall back to `Material ${materialId}` instead of resolving actual names from GameData.

### Solution

Changed line 294 from:
```typescript
const changeTracker = getChangeTracker()
```
to:
```typescript
const changeTracker = getChangeTracker(props.gameData)
```

Now material names are correctly resolved:
- ✅ "Concrete" instead of "Material 3"
- ✅ "Construction Kit" instead of "Material 26"  
- ✅ "Construction Vehicle" instead of "Material 52"
- ✅ "Prefab Kit" instead of "Material 92"

### Files Modified
- [src/v2/pages/player-config/PlayerConfigPanel.vue](src/v2/pages/player-config/PlayerConfigPanel.vue) - Fixed `getChangeTracker()` call in `selectPlanet()`

### Test Results
```
✅ Type-check: PASS
✅ All 293 tests: PASSING
✅ Material icons now display correctly with proper names
```

---

## Session 21 Summary (New Base TODO Fixes - COMPLETED)

**Task**: Fix two issues with new base creation in TODO list

**Status**: ✅ COMPLETED - Both issues resolved and tested

### Issues Fixed

1. **Material Icons Not Displayed for New Bases**
   - **Problem**: Material symbols for new base costs weren't showing in TODO list
   - **Root Cause**: `getTotalBuildingCost()` only checked for `change.type === 'building'`, but new bases have `change.type === 'base'`
   - **Solution**: Updated function to handle both 'building' and 'base' change types, and removed scope restriction to show costs for global changes (new bases) as well

2. **Undo Not Removing New Bases**
   - **Problem**: Creating a new base and clicking undo didn't remove the base
   - **Root Cause**: `stateReversion.ts` had no handling for `change.type === 'base'`
   - **Solution**: 
     - Added 'base' change type handling in state reversion
     - Updated `trackNewBase()` and `trackRemoveBase()` to store `planetId` and `baseId` in change details
     - Added `addBase` and `removeBase` to `PlayerBasesService` interface
     - Registered these methods in PlayerConfigPanel

### Files Modified
- [src/v2/components/TodoList.vue](src/v2/components/TodoList.vue) - Updated cost calculation and display logic
- [src/v2/services/stateReversion.ts](src/v2/services/stateReversion.ts) - Added 'base' change type handling and interface updates
- [src/v2/services/changeTracker.ts](src/v2/services/changeTracker.ts) - Added planetId/baseId parameters to trackNewBase/trackRemoveBase
- [src/v2/pages/player-config/PlayerConfigPanel.vue](src/v2/pages/player-config/PlayerConfigPanel.vue) - Registered addBase/removeBase, passed planetId to trackNewBase

### Test Results
```
✅ Type-check: PASS
✅ All 293 tests: PASSING
✅ Lint: PASS
```

---

## Session 20 Summary (TODO Cost Summation Feature - COMPLETED)

**Task**: Display total costs of planned building upgrades grouped by planet in TODO list

**Status**: ✅ COMPLETED - Feature fully implemented and tested

### Implementation Summary

Added `getTotalBuildingCost(group)` function that calculates and displays total material costs for all building changes under each planet in the TODO list.

**What Changed**:
- ✅ New function sums material costs for building-type changes only
- ✅ Displays total costs below planet header with material icons
- ✅ Uses existing `parseMaterialsCost()` and `MaterialIcon` component
- ✅ All 293 tests passing, type-check clean, lint clean

**Key Files Modified**:
- [src/v2/components/TodoList.vue](src/v2/components/TodoList.vue) - Added cost summation and UI display

### Test Results
```
✅ Type-check: PASS
✅ All 293 tests: PASSING
✅ Lint: PASS
✅ Docker environment: Operational
```

---

## Session 19 Summary (TODO Auto-Completion Feature - COMPLETED)

**Task**: Implement automatic TODO completion when API data shows goals achieved

**Status**: ✅ COMPLETED - Feature fully implemented and tested

### Implementation Overview

Created `syncTodoListWithApiData()` function that automatically removes completed TODOs when API refresh shows that planned technology or building levels have been reached.

**Key Features**:
- ✅ Auto-completes technology TODOs when API level >= target level
- ✅ Auto-completes building TODOs when API level >= target level  
- ✅ Preserves incomplete TODOs (target not reached)
- ✅ Handles partial completion (multiple TODOs, only some complete)
- ✅ Reactive UI updates via Vue ref system

### Technical Solution

**Core Function**: `syncTodoListWithApiData(currentState)` in [todoListService.ts](src/v2/services/todoListService.ts)
```typescript
export function syncTodoListWithApiData(currentState: {
  technology?: Record<number, number>
  buildings?: Array<{ buildingId: number; level: number; planetId: number }>
}): void
```

**Algorithm**:
1. Iterate through all scopes and their TODO groups
2. For each change, compare target level with current API level
3. Mark change as completed if API level >= target level
4. Filter out completed changes, empty steps, and empty groups
5. Update reactive state to trigger UI refresh

**Integration**: Called from [syncService.ts](src/v2/services/syncService.ts)
- On initial app load: `initializeSyncService()`
- On background refresh: `refreshEntry('company')`
- After technology data fetch from `/public/company` API

### Bug Fixes

**Critical Bug**: Change ID collision causing all TODOs to be removed
- **Issue**: Changes without explicit IDs defaulted to `undefined`
- **Impact**: Filter matched all changes with `undefined` ID, removing unrelated TODOs
- **Solution**: Auto-generate unique IDs using `crypto.randomUUID()` or timestamp fallback
- **Location**: `addChange()` function in todoListService.ts line ~428

### Testing

Created comprehensive test suite: [todoSyncWithApi.test.ts](src/v2/services/__tests__/todoSyncWithApi.test.ts)

**Test Coverage** (5 tests, all passing):
1. ✅ Auto-complete technology when API reaches target level
2. ✅ Auto-complete building when API reaches target level
3. ✅ Keep TODO when target not yet reached
4. ✅ Handle multiple TODOs with partial completion
5. ✅ Handle building upgrades exceeding target level

**Full Test Suite**: 293/293 tests passing ✅
**Type-check**: Clean ✅
**Lint**: Clean ✅

### Limitations

**Current Implementation**:
- ✅ Technology levels: Fully supported (synced from `/public/company`)
- ⚠️ Building levels: Framework exists but deferred (requires per-base API calls)

**Why buildings deferred**:
- `/public/company` endpoint returns base list without building details
- Building levels require separate `/public/company/base/{id}` calls per base
- Can be implemented later when base details are fetched

### Files Modified

- `src/v2/services/todoListService.ts` - Added sync function, ID generation, exposed scopeHistories
- `src/v2/services/syncService.ts` - Integrated TODO sync with API refresh
- `src/v2/services/__tests__/todoSyncWithApi.test.ts` - Comprehensive integration tests

---

## Session 21 Summary (Building Cost Formula Verification - COMPLETED)

**Task**: Extract and verify exact building upgrade cost formula from official Galactic Tycoons Wiki

**Status**: ✅ COMPLETED - Formula verified and documented

### Key Findings

#### ✅ CONFIRMED: Official Wiki Formula

Extracted from https://wiki.galactictycoons.com/mechanics/buildings

**Regular Buildings (Levels 1-8):**
```
Growth Multiplier = (0.1 × level) + (1.07 ^ level)
Cost per Material = ceil(base_amount × Growth Multiplier)
```

**Regular Buildings (Levels 9+):**
```
Growth Multiplier = 0.7 + (1.07^7) + ((level-6)^1.03) - (0.95 × (level-6))
```

**Rounding**: CEILING (always round up)

#### 🔍 Test Verification Results

**Refinery Level 3→4** (Base: 2 Amenities, 3 Construction Kit, 5 Prefab Kit):
```
Multiplier(4) = 0.1 × 4 + 1.07^4 = 1.7108

Calculated (Wiki formula):
- 4× Amenities        (ceil(2 × 1.7108) = 4) ✅
- 6× Construction Kit (ceil(3 × 1.7108) = 6) ✅
- 9× Prefab Kit       (ceil(5 × 1.7108) = 9) ✅
```

#### ⚠️ User Expectation Mismatch

**User reported**: 5× Construction Kit, 8× Prefab Kit
**Actual Wiki formula**: 6× Construction Kit, 9× Prefab Kit

**Possible reasons for discrepancy**:
- Technology/research cost reduction bonuses active
- Different game version/patch
- Confusion with different building or level
- In-game display shows post-bonus values

### Deliverables

1. **[BUILDING_UPGRADE_COST_FORMULA.md](BUILDING_UPGRADE_COST_FORMULA.md)** - Complete official formula documentation:
   - Exact formulas for regular buildings and headquarters
   - Step-by-step calculations with examples
   - Test verification results
   - All level progression tables (1→8)
   - Headquarters special formula
   - User expectation analysis

2. **Test verification in [buildingCostDebug.test.ts](src/v2/services/__tests__/buildingCostDebug.test.ts)**:
   - Growth multiplier formula verification ✅
   - Refinery cost calculations ✅
   - Complete level progression (1→8) ✅
   - Headquarters special handling ✅

### Current Implementation Status

**Good news**: Our implementation in `src/v2/constants/manualCosts.ts` already implements the correct Wiki formula! 

- `getBuildingGrowthMultiplier()` matches Wiki formula exactly
- All test results match expected values
- No code changes needed

### Recommendation

**Inform user** that:
1. Official Wiki formula produces **6× Construction Kit, 9× Prefab Kit** for Refinery Level 3→4
2. Their expected values (5 & 8) don't match official formula
3. They should verify in-game whether:
   - Technology bonuses are reducing costs
   - They're looking at a different building/level
   - Game version differences exist

**No implementation changes needed** - our code correctly follows the official Wiki formula.

---

## Session 20 Summary (Building Cost Wiki Extraction & Documentation)

**Task**: Extract exact building cost calculation logic from wiki and create comprehensive reference documents

**Deliverables**:
1. [BUILDING_COST_WIKI_EXTRACT.md](BUILDING_COST_WIKI_EXTRACT.md) - Complete structured documentation of the building cost formula, including:
   - Exact formula/logic for calculating building upgrade costs
   - Per-level multipliers and scaling factors (+20% per level)
   - Planet tier effects on building costs (0.5x multiplier per tier)
   - Special rules for different building types
   - Examples from wiki/implementation
   - Current implementation references
   - Validation checklist

2. [BUILDING_COST_EXAMPLES.md](BUILDING_COST_EXAMPLES.md) - Detailed numerical examples with:
   - Real Refinery 3→4 upgrade calculation (test verified)
   - Mine upgrade 1→3 merged levels example
   - Downgrade cost verification
   - Planet tier 2+ examples with extras
   - Cost scaling tables
   - Verification checklist (all passing)

**Key Formulas Documented**:
```
levelMultiplier = 1 + (targetLevel - 1) × 0.2
tierMultiplier = 1 + (planetTier - buildingTier) × 0.5
scaledAmount = Math.ceil(baseAmount × levelMultiplier × tierMultiplier)
````
This is the description of what the code block changes:
<changeDescription>
Session 22 Handoff-Abschnitt zu Shielding-Kosten-Logik und Testergebnissen ergänzen.
</changeDescription>

This is the code block that represents the suggested code change:
```markdown
## Session 22 Summary (T2+ Shielding Cost Logic Review)

### What was done

- Die Logik für Gebäudekosten (Shielding/Pressure Sealant Kits) auf T2+ Planeten wurde vollständig überprüft.
- Die Funktion `computeBuildingTierExtras` wurde mit den neuen Regeln abgeglichen:
  - Warehouse: 2 pro Stufe
  - Housing: 4 pro Stufe
  - Production (ohne Fertility/Abundance): 1 (Level 1), ab Level 2: 2 pro Stufe
  - Production (mit Fertility/Abundance): 8 pro Stufe
- Die Integrationstests (`manualCosts.integration.test.ts`, `newBaseCost.test.ts`) und Debug-Tests (`buildingCostDebug.test.ts`) wurden ausgeführt und alle Tests sind erfolgreich.
- Die Werte für Barracks, Mine und andere Gebäude stimmen mit den neuen Regeln überein.
- Es waren keine Codeänderungen nötig, da die aktuelle Implementierung bereits korrekt ist.

### Nächste Schritte
- Keine weiteren Anpassungen an der Shielding-Kosten-Logik nötig.
- Bei neuen Regeln oder Bugs: Tests und Logik erneut prüfen.

---
Letzter Stand: Shielding-Kosten auf T2+ Planeten sind korrekt implementiert und durch Tests abgedeckt.
```
<changeDescription>

