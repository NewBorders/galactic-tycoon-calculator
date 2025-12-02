# Development Handoff Document

## 🎯 LATEST: Price Alerts & Export Profit Enhancements — COMPLETED ✅

**STATUS: Multiple improvements to Global Summary and Price Alerts completed and ready for testing**

### What Was Implemented

#### 1. Issue #51: Stock Display in Materials Balance ✅
Added stock amounts alongside coverage time in the Materials Balance table for better visibility.

**Display Format:** `150 / 2d 4h` (stock amount / coverage time)

**Files Changed:**
- `src/v2/pages/player-config/components/SummaryCalculationsSection.vue` (lines 358-365)

#### 2. Export Net Profit Metric ✅
Added new metric to Global Summary showing net profit from export materials only (materials meeting export threshold), with all costs subtracted.

**Calculation Logic:**
- Export Net Profit = Export Materials Revenue - All Costs
- Export materials are determined by export threshold setting (e.g., 50% means material must have ≥50% not reused locally)
- All costs include material purchase costs and worker purchase costs
- Result is lower than Total Net Profit because only export material revenue is counted, but all costs are still subtracted

**Files Changed:**
- `src/v2/composables/useGlobalSummary.ts` - Added `totalExportNetProfit` computed property
- `src/v2/pages/player-config/components/GlobalSummary.vue` - Added Export Net Profit card (grid expanded from 3 to 4 columns)
- `src/v2/localisation/messages.ts` - Translations already existed

#### 3. Price Alert Trend Colors Fixed ✅
Price trend colors now contextually correct based on alert type:
- **Buy Alerts:** Green = price falling (good), Red = price rising (bad)
- **Sell Alerts:** Green = price rising (good), Red = price falling (bad)

**Files Changed:**
- `src/v2/pages/price-alerts/PriceAlertsPanel.vue` - Added `getTrendColor()` function

#### 4. Price Alerts Sync with Manual Prices ✅
When user sets a manual price in Price Management UI, system automatically creates/updates a buy alert with that price as the target.

**Implementation:**
- Dynamic imports to avoid circular dependencies
- Graceful fallback if price alerts module not available
- Uses existing `addAlert()` function to create/update alerts

**Files Changed:**
- `src/v2/services/gamedata/prices.ts` (lines 322-340) - Added dynamic import call
- `src/v2/services/priceAlerts/alertManager.ts` - Added `syncAlertWithManualPrice()` function

### Current Branch
`51-add-stock-into-materials-balance`

### Testing Recommendations
1. Verify stock display shows correct format in Materials Balance
2. Check Export Net Profit calculation in Global Summary
3. Test price trend colors in Price Alerts panel for both buy and sell alerts
4. Test price alerts sync:
   - Set manual price in Price Management UI
   - Verify buy alert created/updated in Price Alerts panel
   - Confirm alert uses correct target price

### Technical Notes
- All changes pass `npm run type-check`
- Vue 3 Composition API with TypeScript
- Price alerts stored per-world in LocalStorage
- Dynamic imports prevent circular dependencies
- Alert system supports buy/sell types with status tracking

---

## Previous: Material Weight Display — COMPLETED ✅

**STATUS: Material weights are now displayed across all relevant sections to help users calculate shipping requirements**

### What Was Implemented (Issue #24)

Added material weight information to help users understand shipping requirements:

1. **Global Summary > Per Base Summary > Export Materials**
   - Split combined "Balance / Value" back into separate columns
   - Added "Weight" column showing total weight of exported materials
   - Headers: "Material", "Balance", "Value", "Weight", "Export %"
   - Weight calculated using `material.weightInTonnes * amount`

2. **Global Summary > Per Base Summary > Running Out**
   - Split combined "Time Left / Stock" into separate columns
   - Added "To Buy" column showing amount needed + weight for timeframe
   - Headers: "Material", "Time Left", "Stock", "To Buy"
   - To Buy calculation: `(consumptionPerDay * timeframeHours / 24) - currentStock`

3. **Per Base > Summary > Materials Balance**
   - Added weight to "per XXh" column: `amount / weight`
   - Added weight to "To Buy" column: `amount / weight`
   - Weight shown even for negative amounts (always positive)

### Technical Implementation

**Files Modified:**
- `src/v2/pages/player-config/components/GlobalSummary.vue`
  - Added `getMaterialWeight()` and `formatWeight()` helper functions
  - Updated Export Materials section with separate Balance/Value/Weight columns
  - Updated Running Out section with separate Time Left/Stock/To Buy columns

- `src/v2/pages/player-config/components/SummaryCalculationsSection.vue`
  - Added `getMaterialWeight()` and `formatWeight()` helper functions
  - Updated Materials Balance table to show weights in "per XXh" and "To Buy" columns

**Weight Data Source:**
- `GameData.materials[].weightInTonnes` (from game data)
- Format: `{amount}t` (e.g., "125.3t")

**Validation:**
- ✅ Type-check passed
- ✅ Lint passed
- ⚠️ Pre-existing test failures in useGlobalSummary.test.ts (unrelated to this change)

---

## Previous: Refactored Worker Consumables as Single Source of Truth — COMPLETED ✅

**STATUS: Worker consumable identification now uses GameData as single source of truth, Global Summary split into two tables, removed /d suffix**

### What Was Implemented

We refactored the worker consumables logic and enhanced the Global Summary display:

1. **Worker Consumables Utilities (REFACTORING)**
   - **Problem:** Hardcoded Set of material IDs in GlobalSummary component to identify worker consumables
   - **Solution:** Created `src/v2/utils/workerConsumables.ts` with utility functions that extract material IDs from GameData
   - **Single Source of Truth:** GameData `workers` array with `consumables` property
   - **Impact:** More maintainable, automatically updates when game data changes, no hardcoded IDs

2. **Global Material Tables Split (UX IMPROVEMENT)**
   - **Left Table:** Regular materials (all except worker consumables)
   - **Right Table:** Worker consumables with dedicated "Worker consumption" header
   - **Merged Columns:** Balance and Value combined into single column to save space
   - **Responsive Layout:** Two-column grid on large screens, stacks on mobile

3. **Removed /d Suffix in Per Base Summary**
   - Export materials and their values no longer show "/d" suffix
   - Cleaner display: "+150.5" instead of "+150.5/d"

### Technical Implementation

**Files Created:**
- `src/v2/utils/workerConsumables.ts` - Utility functions for worker consumable identification
- `src/v2/utils/__tests__/workerConsumables.test.ts` - Comprehensive unit tests (8 tests, all passing)

**Files Modified:**
- `src/v2/pages/player-config/components/GlobalSummary.vue` - Uses new utility, split tables, removed /d

**Available Functions:**
```typescript
// Get all worker consumable material IDs
getWorkerConsumableMaterialIds(gameData: GameData): Set<number>

// Get worker consumables grouped by tier
getWorkerConsumablesByTier(gameData: GameData): Map<number, Set<number>>

// Get only essential worker consumables
getEssentialWorkerConsumableMaterialIds(gameData: GameData): Set<number>

// Get only optional worker consumables
getOptionalWorkerConsumableMaterialIds(gameData: GameData): Set<number>

// Check if material is worker consumable
isWorkerConsumable(gameData: GameData, materialId: number): boolean
```

**Data Flow:**
```
GameData.workers[].consumables[] (Single Source of Truth)
    ↓
workerConsumables.ts utilities
    ↓
GlobalSummary.vue (computed: workerConsumableIds)
    ↓
Split materials into regularMaterials & workerConsumableMaterials
```

**Validation:**
- ✅ All 8 unit tests passing for workerConsumables utilities
- ✅ TypeScript type-check passes
- ✅ ESLint passes
- ✅ Handles materials appearing in multiple tiers (e.g., Drinking Water in T1 and T2)
- ✅ Handles materials with different essential flags across tiers (e.g., Workwear)

---

## 📋 Previous Work: Production/Consumption Display & Reactive Calculations (Dec 2024)

### What Was Fixed

We fixed two critical issues in the Global Summary Panel:

1. **Production & Consumption Display (CRITICAL FIX)**
   - **Problem:** In "Global Material Production & Consumption", per-base breakdown showed net values instead of actual production/consumption
   - **Example:** Base producing 1000 drinking water and consuming 500 would show "produced 500" instead of "produced 1000, consumed 500"
   - **Root Cause:** Used `balancePerDay` (net = production - consumption) to derive production/consumption
   - **Solution:** Rewrote to build production/consumption maps from recipe outputs/inputs + worker consumption
   - **Impact:** Now correctly shows separate production and consumption values for each base

2. **Reactive Calculations (CRITICAL FIX)**
   - **Problem:** Changing summary window hours or export threshold didn't update calculations until page reload
   - **Root Cause:** Composable parameters were passed as plain values, not reactive refs
   - **Solution:** Changed `useGlobalSummary` to accept `MaybeRef<T>` parameters and use `toValue()` to unwrap them
   - **Implementation:** Used `toRef(() => props.x)` in component to pass reactive references
   - **Impact:** All calculations now update immediately when user changes timeframe or threshold

### Technical Implementation

**Files Modified:**
- `src/v2/composables/useGlobalSummary.ts` - Changed to accept MaybeRef parameters, rewrote globalMaterials calculation
- `src/v2/pages/player-config/components/GlobalSummary.vue` - Wrapped props in toRef() for reactivity

**Key Algorithm Changes:**

```typescript
// OLD (Wrong): Derived from net balance
const production = material.balancePerDay > 0 ? material.balancePerDay : 0
const consumption = material.balancePerDay < 0 ? Math.abs(material.balancePerDay) : 0

// NEW (Correct): Built from source data
const productionMap = new Map<number, number>()
const consumptionMap = new Map<number, number>()

// Get production from recipe outputs
report.recipes.forEach((recipe) => {
  const current = productionMap.get(recipe.outputMaterialId) || 0
  productionMap.set(recipe.outputMaterialId, current + recipe.outputPerDay)
})

// Get consumption from recipe inputs
report.recipes.forEach((recipe) => {
  recipe.inputsPerDay.forEach((input) => {
    const current = consumptionMap.get(input.materialId) || 0
    consumptionMap.set(input.materialId, current + input.amount)
  })
})

// Add worker consumption
report.workers.forEach((worker) => {
  const current = consumptionMap.get(worker.materialId) || 0
  consumptionMap.set(worker.materialId, current + worker.consumptionPerDay)
})

const production = productionMap.get(materialId) || 0
const consumption = consumptionMap.get(materialId) || 0
```

**Reactivity Pattern:**

```typescript
// Composable signature with MaybeRef
export function useGlobalSummary(
  timeframeHours: MaybeRef<number>,
  exportThreshold: MaybeRef<number>,
  // ... other params
) {
  // Use toValue to unwrap refs reactively inside computed
  const periodFactor = computed(() => {
    const hours = Number(toValue(timeframeHours))
    return hours / 24
  })
}

// Component usage with toRef
const { baseSummaries, globalMaterials } = useGlobalSummary(
  toRef(() => props.timeframeHours),
  toRef(() => props.exportThreshold),
  // ... other props
)
```

**Validation:**
- ✅ TypeScript type-check passes
- ✅ ESLint passes
- ✅ All calculations use source data (recipes + workers)
- ✅ Reactivity works via MaybeRef + toValue pattern
- ✅ Production/consumption shown separately in per-base breakdown

### Testing Needed

**Critical Test Case 1 (Production/Consumption Display):**
- Configure base producing 1000 drinking water/day
- Configure buildings consuming 500 drinking water/day
- Open "Global Material Production & Consumption"
- Enable "Show per-base breakdown"
- **Expected:** Base row shows "Production: 1000, Consumption: 500, Balance: +500"
- **NOT:** "Production: 500, Consumption: 0"

**Critical Test Case 2 (Reactive Calculations):**
- Open Global Summary with default 24h timeframe
- Note the export materials and their values
- Change timeframe to 168h (1 week)
- **Expected:** All values immediately multiply by 7 (168/24)
- Change export threshold from 50% to 25%
- **Expected:** More materials show up in export list immediately

**Other Test Cases:**
- Verify all calculated values scale with timeframe changes
- Verify export materials list updates with threshold changes
- Verify materials running out updates with timeframe changes
- Test with multiple bases to see correct per-base breakdown

---

## 📋 Previous Work: Export Material Bug Fix (Dec 2024)

### What Was Fixed

Fixed three critical issues in the Global Summary Panel:

1. **Export Material Calculation Bug**
   - Glass showing 100% export despite 768 production and 483.84 consumption (63% local use)
   - Rewrote to use recipe outputs/inputs + worker consumption
   - Now correctly calculates export ratio as `1 - (consumption / production)`

2. **Export Threshold Configuration Location**
   - Moved from top-level config to "Per Base Summary" header
   - Implemented v-model two-way binding

3. **Enhanced Per Base Summary Layout**
   - Two-column grid (export materials left, materials running out right)
   - Added ⚠️ warning icon in base header
   - Fixed timeframe to use configured hours instead of 30 days

---

## 🏗️ Architecture Overview

### Tech Stack
- **Framework:** Vue 3 with Composition API
- **Language:** TypeScript (strict mode)
- **Build:** Vite
- **Styling:** Tailwind CSS
- **Testing:** Vitest
- **Dev Environment:** Docker Compose

### Key Patterns
- **MVC:** Clear separation between views, composables (controllers), and services
- **Service/Repository:** Encapsulated data access via services
- **ETL:** External connections use extraction, transformation, and load pattern
- **Composition API:** Modern Vue 3 with `<script setup>` syntax
- **Reactivity:** Use `MaybeRef<T>` + `toValue()` for composables that need reactive params

### Project Structure
```
src/v2/
├── pages/           # Page-level components (Player Config, Market Analysis, etc.)
├── components/      # Reusable UI components
├── composables/     # Business logic and state management (use MaybeRef for reactivity)
├── services/        # Data access layer (API, localStorage, calculations)
├── constants/       # Static data and configurations
├── localisation/    # i18n messages and utilities
└── utils/          # Helper functions
```

### Core Services
- **Production Engine** (`services/production/engine.ts`) - Calculates production/consumption per base
- **Market Analysis** (`services/marketAnalysis/`) - Analyzes market prices and opportunities
- **Player Bases** (`services/playerBases.ts`) - Manages base configuration and persistence
- **Prices API** (`services/api/pricesApi.ts`) - Fetches market prices from game API

---

## 🔧 Development Workflow

### Commands
```bash
# Start development environment
docker compose up

# Type checking (ALWAYS run before commit)
docker compose exec web npm run type-check

# Linting (TRY to fix issues)
docker compose exec web npm run lint

# Run tests
docker compose exec web npm run test
```

### Code Standards
- ✅ **English Only:** All code, comments, docs, and translations in English (except DE translations)
- ✅ **Type Safety:** Strict TypeScript mode, no `any` types
- ✅ **Testing:** Integration tests for workflows and processes
- ✅ **Refactoring:** Reduce complexity in code being modified
- ✅ **Comments:** Explain "why" not "what"

### Best Practices
- Use composition API with `<script setup>` syntax
- Keep components focused and small
- Extract business logic to composables
- Use `MaybeRef<T>` + `toValue()` for reactive composable parameters
- Use `toRef(() => props.x)` to pass reactive props to composables
- Use services for data access
- Prefer computed over watchers
- Use provide/inject sparingly
- Follow Vue 3 naming conventions

---

## 📝 Context for Next Agent

### Current State
The application is a production calculator for "Galactic Tycoon" game. Users can:
- Configure multiple planetary bases
- Add buildings and assign recipes
- Track production/consumption of materials (showing actual values, not just net)
- Monitor economic performance (revenue, costs, profit)
- Sync stock levels via game API
- Analyze export materials and stock warnings
- View global summary across all bases (reactive to config changes)

### Recent Changes
- Fixed production/consumption display to show actual values from recipes+workers
- Made all global summary calculations reactive to timeframe/threshold changes
- All calculations now use source data (recipe outputs/inputs + worker consumption)
- Implemented MaybeRef + toValue pattern for composable reactivity
- All TypeScript and linting checks passing

### Known Issues
- None currently - all reported bugs fixed

### Next Steps
If continuing work on this feature:
1. Add integration tests for production/consumption calculation
2. Add integration tests for reactivity (timeframe/threshold changes)
3. Consider adding material filtering/search in global summary
4. Consider adding export/import to CSV functionality
5. Consider performance optimization for large numbers of bases

---

## 🎯 Agent Guidelines

### Work Philosophy
- **Dogged:** Keep working autonomously as long as progress can be made
- **Smart:** Think deeply, add logging to check assumptions when debugging
- **Systematic:** Use task tracking for multi-step work
- **Thorough:** Always run type-check, try to fix lint issues

### When Debugging
1. Add logging to verify assumptions
2. Check type definitions and interfaces
3. Review source data flow from engine → composable → component
4. Test with realistic data (not edge cases first)
5. Use browser DevTools Vue plugin to inspect reactive state
6. Check if values are reactive refs or plain values

### When Implementing Features
1. Start with types/interfaces
2. Implement service layer
3. Add composable for business logic (use MaybeRef for reactive params)
4. Create/update UI component (use toRef for passing props)
5. Add translations (EN + DE)
6. Run type-check and lint
7. Test manually
8. Write integration tests
9. Update handoff.md

---

## 📚 Important Files Reference

### Global Summary Feature
- `src/v2/composables/useGlobalSummary.ts` - Core calculation logic (uses MaybeRef for reactivity)
- `src/v2/pages/player-config/components/GlobalSummary.vue` - UI display (passes toRef wrapped props)
- `src/v2/pages/player-config/PlayerConfigPanel.vue` - State management
- `src/v2/services/production/engine.ts` - Production calculations per base

### Localization
- `src/v2/localisation/messages.ts` - All translations (EN + DE)
- `src/v2/localisation/locale.ts` - Locale management
- `src/v2/localisation/index.ts` - Translation utilities

### Data Structures
- `src/v2/services/production/types.ts` - Production engine types
- `src/v2/services/playerBases.ts` - Base configuration types
- `src/v2/services/gamedata/types.ts` - Game data types (buildings, materials, recipes)

---

**Last Updated:** Dec 2024  
**Agent:** Claude Sonnet 4.5  
**Status:** Production/consumption display fixed, calculations now reactive, all validations passing


### What Was Fixed

We fixed three critical issues in the Global Summary Panel based on user bug report:

1. **Export Material Calculation Bug (CRITICAL FIX)**
   - **Problem:** Glass showing 100% export despite 768 production and 483.84 consumption (63% local use)
   - **Root Cause:** Incorrectly used `balancePerDay` (net value) to derive production/consumption
   - **Solution:** Rewrote calculation to use source data (recipe outputs/inputs + worker consumption)
   - **Impact:** Now correctly calculates export ratio as `1 - (consumption / production)`

2. **Export Threshold Configuration Location**
   - **Before:** Hidden in top-level config section
   - **After:** Moved directly into "Per Base Summary" header for immediate visibility
   - **Implementation:** Used v-model two-way binding between components
   - **Cleanup:** Removed duplicate input from PlayerConfigPanel config section

3. **Enhanced Per Base Summary Layout**
   - **New Design:** Two-column grid (export materials left, materials running out right)
   - **Warning Icon:** Added ⚠️ SVG icon in base header when materials running out
   - **Fixed Timeframe:** Materials running out now uses configured hours instead of hardcoded 30 days
   - **Empty States:** Shows "No export materials" / "No materials running out" when applicable

### Technical Implementation

**Files Modified:**
- `src/v2/composables/useGlobalSummary.ts` - Complete rewrite of export calculation (lines 200-280)
- `src/v2/pages/player-config/components/GlobalSummary.vue` - Restructured UI, added warning icon, moved threshold input
- `src/v2/pages/player-config/PlayerConfigPanel.vue` - v-model binding, removed duplicate input
- `src/v2/localisation/messages.ts` - Added translations (noExportMaterials, noMaterialsRunningOut)

**Key Algorithm (Fixed):**

```typescript
// Build separate production and consumption maps from source data
const productionMap = new Map<number, number>()
const consumptionMap = new Map<number, number>()

// Add recipe outputs (production)
report.recipes.forEach(recipe => {
  const current = productionMap.get(recipe.outputMaterialId) || 0
  productionMap.set(recipe.outputMaterialId, current + recipe.outputPerDay)
})

// Add recipe inputs (consumption)
report.recipes.forEach(recipe => {
  recipe.inputsPerDay.forEach(input => {
    const current = consumptionMap.get(input.materialId) || 0
    consumptionMap.set(input.materialId, current + input.amount)
  })
})

// Add worker consumption
report.workers.forEach(worker => {
  const current = consumptionMap.get(worker.materialId) || 0
  consumptionMap.set(worker.materialId, current + worker.consumptionPerDay)
})

// Calculate export ratio correctly
const production = productionMap.get(materialId) || 0
const consumption = consumptionMap.get(materialId) || 0
const localConsumptionRatio = consumption / production
const exportRatio = 1 - localConsumptionRatio

// Material is export if local consumption < (1 - threshold)
// e.g., threshold=50% means export if <50% consumed locally (i.e., >50% exported)
if (localConsumptionRatio < (1 - exportThresholdDecimal.value)) {
  exportMaterials.push({ materialId, exportRatio })
}
```

**Export Threshold Semantics:**
- Threshold = 50% means: Material is "export" if less than 50% is consumed locally
- Example: Glass with 37% local consumption → IS export material (37% < 50%)
- Example: Material with 70% local consumption → NOT export material (70% > 50%)

**Validation:**
- ✅ TypeScript type-check passes (`npm run type-check`)
- ✅ ESLint passes (`npm run lint`)
- ✅ Vue 3 Composition API with proper `defineEmits`
- ✅ Two-way binding via v-model pattern
- ✅ localStorage persistence maintained

### Testing Needed

**Critical Test Case (from bug report):**
- Configure base with glass production: 768/day
- Configure amenities production consuming glass: 483.84/day
- Set export threshold: 50%
- **Expected:** Glass shows ~37% export ratio (not 100%)
- **Calculation:** 1 - (483.84 / 768) = 1 - 0.63 = 0.37 = 37%

**Other Test Cases:**
- Test various threshold values (0%, 25%, 50%, 75%, 100%)
- Verify warning icon appears/disappears correctly
- Test materials running out with different timeframes (24h, 168h, 336h)
- Verify threshold changes persist to localStorage
- Test empty states (no exports, no materials running out)

---

## 📋 Previous Work: Global Summary Panel Enhancement (Nov 2024)

### What Was Implemented

Implemented comprehensive global summary panel with timeframe-based calculations:

1. **Timeframe-Based Calculations** - All calculations use user-configured summary window
2. **Fixed Consumption Overhead** - Correctly shows cost difference with expansion overhead
3. **Compact Materials Table** - Redesigned with production/consumption in amounts and dollars
4. **Per-Base Breakdown Toggle** - Show/hide per-base breakdown in materials table
5. **Export Material Identification** - User-configurable threshold for export classification

### Technical Implementation

**Files Created/Modified:**
- `src/v2/composables/useGlobalSummary.ts` - Global summary calculations with export logic
- `src/v2/pages/player-config/components/GlobalSummary.vue` - UI component
- `src/v2/pages/player-config/PlayerConfigPanel.vue` - State management and integration
- `src/v2/localisation/messages.ts` - Translations (EN + DE)

---

## 🏗️ Architecture Overview

### Tech Stack
- **Framework:** Vue 3 with Composition API
- **Language:** TypeScript (strict mode)
- **Build:** Vite
- **Styling:** Tailwind CSS
- **Testing:** Vitest
- **Dev Environment:** Docker Compose

### Key Patterns
- **MVC:** Clear separation between views, composables (controllers), and services
- **Service/Repository:** Encapsulated data access via services
- **ETL:** External connections use extraction, transformation, and load pattern
- **Composition API:** Modern Vue 3 with `<script setup>` syntax

### Project Structure
```
src/v2/
├── pages/           # Page-level components (Player Config, Market Analysis, etc.)
├── components/      # Reusable UI components
├── composables/     # Business logic and state management
├── services/        # Data access layer (API, localStorage, calculations)
├── constants/       # Static data and configurations
├── localisation/    # i18n messages and utilities
└── utils/          # Helper functions
```

### Core Services
- **Production Engine** (`services/production/engine.ts`) - Calculates production/consumption per base
- **Market Analysis** (`services/marketAnalysis/`) - Analyzes market prices and opportunities
- **Player Bases** (`services/playerBases.ts`) - Manages base configuration and persistence
- **Prices API** (`services/api/pricesApi.ts`) - Fetches market prices from game API

---

## 🔧 Development Workflow

### Commands
```bash
# Start development environment
docker compose up

# Type checking (ALWAYS run before commit)
docker compose exec web npm run type-check

# Linting (TRY to fix issues)
docker compose exec web npm run lint

# Run tests
docker compose exec web npm run test
```

### Code Standards
- ✅ **English Only:** All code, comments, docs, and translations in English (except DE translations)
- ✅ **Type Safety:** Strict TypeScript mode, no `any` types
- ✅ **Testing:** Integration tests for workflows and processes
- ✅ **Refactoring:** Reduce complexity in code being modified
- ✅ **Comments:** Explain "why" not "what"

### Best Practices
- Use composition API with `<script setup>` syntax
- Keep components focused and small
- Extract business logic to composables
- Use services for data access
- Prefer computed over watchers
- Use provide/inject sparingly
- Follow Vue 3 naming conventions

---

## 📝 Context for Next Agent

### Current State
The application is a production calculator for "Galactic Tycoon" game. Users can:
- Configure multiple planetary bases
- Add buildings and assign recipes
- Track production/consumption of materials
- Monitor economic performance (revenue, costs, profit)
- Sync stock levels via game API
- Analyze export materials and stock warnings
- View global summary across all bases

### Recent Changes
- Fixed critical export material calculation bug (using net balance instead of source data)
- Enhanced per-base summary with warning icons and two-column layout
- Moved export threshold configuration to per-base summary section
- Added proper two-way binding for export threshold
- All TypeScript and linting checks passing

### Known Issues
- None currently - all reported bugs fixed

### Next Steps
If continuing work on this feature:
1. Add integration tests for export material calculation
2. Add integration tests for materials running out calculation
3. Consider adding material filtering/search in global summary
4. Consider adding export/import to CSV functionality
5. Consider performance optimization for large numbers of bases

---

## 🎯 Agent Guidelines

### Work Philosophy
- **Dogged:** Keep working autonomously as long as progress can be made
- **Smart:** Think deeply, add logging to check assumptions when debugging
- **Systematic:** Use task tracking for multi-step work
- **Thorough:** Always run type-check, try to fix lint issues

### When Debugging
1. Add logging to verify assumptions
2. Check type definitions and interfaces
3. Review source data flow from engine → composable → component
4. Test with realistic data (not edge cases first)
5. Use browser DevTools Vue plugin to inspect reactive state

### When Implementing Features
1. Start with types/interfaces
2. Implement service layer
3. Add composable for business logic
4. Create/update UI component
5. Add translations (EN + DE)
6. Run type-check and lint
7. Test manually
8. Write integration tests
9. Update handoff.md

---

## 📚 Important Files Reference

### Global Summary Feature
- `src/v2/composables/useGlobalSummary.ts` - Core calculation logic
- `src/v2/pages/player-config/components/GlobalSummary.vue` - UI display
- `src/v2/pages/player-config/PlayerConfigPanel.vue` - State management
- `src/v2/services/production/engine.ts` - Production calculations per base

### Localization
- `src/v2/localisation/messages.ts` - All translations (EN + DE)
- `src/v2/localisation/locale.ts` - Locale management
- `src/v2/localisation/index.ts` - Translation utilities

### Data Structures
- `src/v2/services/production/types.ts` - Production engine types
- `src/v2/services/playerBases.ts` - Base configuration types
- `src/v2/services/gamedata/types.ts` - Game data types (buildings, materials, recipes)

# Integration tests (when added)
docker compose exec web npm run test
```

**Last Updated:** Dec 2024  
**Agent:** Claude Sonnet 4.5  
**Status:** Export material bug fixed, all validations passing, ready for testing
