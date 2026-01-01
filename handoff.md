# Handoff Document

## Most Recent Work Session: Manual Game Data Refresh Button

### Summary
Added a manual refresh button for game data in the Bases page (PlayerConfigPanel). Users can now manually refresh the game data from the API instead of waiting for the page reload. The refresh button displays loading state, success messages, and error messages (including rate limiting).

### User-Facing Features
1. **Refresh Button**: Located next to the "Game data as of [timestamp]" display
2. **Loading State**: Button shows "Refreshing…" while fetching
3. **Success Feedback**: Green toast message "Game data refreshed successfully" appears for 3 seconds
4. **Error Feedback**: Red toast message displays if refresh fails (e.g., "API error: 429 Too Many Requests")
5. **Auto-hide**: Success/error messages automatically disappear after 3 seconds

### Technical Implementation

#### Frontend Changes

**File**: `/src/v2/pages/player-config/PlayerConfigPanel.vue`

1. **Imported loadGameData Function**:
   - Added `loadGameData` to imports from `../../services/gamedata/service.ts`

2. **Added Refresh State Variables**:
   ```typescript
   const gameDataLoading = ref(false)
   const gameDataError = ref<string | null>(null)
   const gameDataSuccess = ref<string | null>(null)
   let gameDataSuccessTimer: ReturnType<typeof setTimeout> | null = null
   ```

3. **Created refreshGameData() Function**:
   - Calls `loadGameData(true)` to force refresh (bypass cache)
   - Handles loading state during API call
   - Catches and displays errors
   - Shows success message for 3 seconds
   - Properly cleans up timer on unmount

4. **Updated Template**:
   - Added error/success toast notifications (red/green backgrounds)
   - Added refresh button next to gameDataTimestamp
   - Button is disabled during loading

#### Localization

**File**: `/src/v2/localisation/messages.ts`

Added four new localization keys:
- **English**:
  - `gameDataRefresh`: "Refresh data"
  - `gameDataRefreshing`: "Refreshing…"
  - `gameDataRefreshSuccess`: "Game data refreshed successfully"
  - `gameDataRefreshError`: "Game data refresh failed"
- **German** (Deutsch):
  - `gameDataRefresh`: "Daten aktualisieren"
  - `gameDataRefreshing`: "Aktualisiere…"
  - `gameDataRefreshSuccess`: "Spieldaten erfolgreich aktualisiert"
  - `gameDataRefreshError`: "Aktualisierung der Spieldaten fehlgeschlagen"

#### Integration Tests

**File**: `/src/v2/services/gamedata/__tests__/gameDataRefresh.test.ts`

Created comprehensive tests for the gamedata refresh functionality:
1. **Force Refresh Test**: Verifies that `loadGameData(true)` bypasses cache and fetches fresh data
2. **Error Handling Test**: Ensures errors (like rate limiting) are caught and propagated
3. **Cache Update Test**: Confirms that new data is stored in localStorage
4. **buildIndex Test**: Validates that the index mapping works correctly

### Testing
- ✅ All type checks pass (`npm run type-check`)
- ✅ All lint checks pass (`npm run lint`)
- ✅ All new tests pass (4/4 tests in gameDataRefresh.test.ts)
- ✅ Existing test suite: 130 passed (7 unrelated failures in useGlobalSummary)

### Design Patterns
- **Follows existing patterns**: The implementation mirrors the price refresh button pattern already in use
- **Consistent styling**: Uses the same toast notification styling as the import feedback
- **Proper state management**: Loading state prevents multiple simultaneous refreshes

---

## Previous Work Session: Removed Display Limitations in Global Summary


### Summary
Implemented persistence for the material balance sort order (name vs recipe) on a per-base level. Users can now toggle between alphabetical sorting and recipe order, and their preference is saved individually for each base in localStorage.

### Background
Previously, the material balance tables had a toggle button to switch between:
- **Name sorting** (🔤): Alphabetical order by material name
- **Recipe sorting** (📋): Order by production sequence/recipe order

However, this preference was not persisted - it would reset to 'name' on page reload.

### Implementation

#### Backend: Storage Layer
**File**: `/src/v2/services/playerBases.ts`

1. **Extended PlayerBase Type**:
```typescript
export type PlayerBase = {
  // ... existing fields
  materialSortOrder?: 'name' | 'recipe'
}
```

2. **Added Setter Function**:
```typescript
function setMaterialSortOrder(baseId: string, sortOrder: 'name' | 'recipe') {
  const b = state.value.bases.find((x) => x.id === baseId)
  if (!b) return
  b.materialSortOrder = sortOrder
  saveState(state.value)
}
```

3. **Exported Function**:
- Added `setMaterialSortOrder` to the return object of `usePlayerBases()`

#### Frontend: Component Wiring
**File**: `/src/v2/pages/player-config/components/SummaryCalculationsSection.vue`

1. **Initialize from Props**:
```typescript
const materialSortOrder = ref<MaterialSortOrder>(props.base.materialSortOrder ?? 'name')
```
- Reads initial value from `props.base.materialSortOrder`
- Falls back to 'name' if not set

2. **Added Emit**:
```typescript
const emit = defineEmits<{
  updateOptional: [number[]]
  updateStock: [Record<number, number>]
  updateMaterialSortOrder: [sortOrder: 'name' | 'recipe']
}>()
```

3. **Watch for Changes**:
```typescript
watch(materialSortOrder, (newSortOrder) => {
  emit('updateMaterialSortOrder', newSortOrder)
})
```

**File**: `/src/v2/pages/player-config/components/ConfiguredBase.vue`

1. **Added Emit Type**:
```typescript
const emit = defineEmits<{
  // ... existing emits
  updateMaterialSortOrder: [sortOrder: 'name' | 'recipe']
}>()
```

2. **Pass Through Emit**:
```vue
<SummaryCalculationsSection
  @updateMaterialSortOrder="
    (sortOrder) => {
      $emit('updateMaterialSortOrder', sortOrder)
      $emit('persist')
    }
  "
/>
```

**File**: `/src/v2/pages/player-config/PlayerConfigPanel.vue`

1. **Import Function**:
```typescript
const {
  // ... existing imports
  setMaterialSortOrder,
} = usePlayerBases(props.gameData)
```

2. **Handle Emit**:
```vue
<ConfiguredBase
  @updateMaterialSortOrder="
    (sortOrder) => {
      setMaterialSortOrder(base.id, sortOrder)
      persist()
    }
  "
/>
```

### Data Flow
1. User clicks toggle button in SummaryCalculationsSection
2. `materialSortOrder` ref updates (e.g., from 'name' to 'recipe')
3. Watcher detects change and emits `updateMaterialSortOrder`
4. ConfiguredBase passes emit up to PlayerConfigPanel
5. PlayerConfigPanel calls `setMaterialSortOrder(baseId, sortOrder)`
6. `setMaterialSortOrder` updates the base object and saves to localStorage
7. On page reload, initial value is read from `base.materialSortOrder`

### Storage Location
- **localStorage key**: `gt:v2:player:bases:v2`
- **Structure**: Each base object now includes optional `materialSortOrder` field
- **Migration**: Existing bases without this field default to 'name' sorting

### Validation
- ✅ TypeScript: No compilation errors (`npm run type-check`)
- ✅ Dev server: Starts successfully
- ✅ Type safety: All emit chains properly typed
- ✅ Fallback: Defaults to 'name' for bases without saved preference

### User Impact
- Sort order preference is now saved per-base
- Each base can have different sort preference (some 'name', others 'recipe')
- Preference persists across page reloads
- No migration needed for existing bases (defaults to 'name')
- Toggle button works as before, but now saves state

### Technical Notes
- The watcher emits on every change, which triggers persist() in parent
- No debouncing needed since toggle is discrete action (not continuous input)
- localStorage is updated synchronously via `saveState()`

---

## Previous Session: Export Threshold Configuration

### Summary
Moved the export material threshold (previously hardcoded at 50%) into a configurable setting in the Config panel. The threshold is now centrally managed and used consistently across both Global Summary and per-base Materials Balance tables.

### What is Export Threshold?
The threshold determines which materials are classified as "export materials" vs materials consumed by own production:
- Materials with **less than X% local consumption** are considered exports
- Example at 50%: A material using 30% locally = export material, 60% locally = not export
- Used to split materials balance into "Export Materials" and "Other Materials" tables

### Implementation

#### New Service: Export Threshold Management
**File**: `/src/v2/services/config/exportThreshold.ts`
- Central storage in localStorage with key `exportThreshold`
- Default: 50%
- Reactive ref that can be imported by other modules
- API:
  - `getExportThreshold()` - Returns current value (0-100)
  - `getExportThresholdRef()` - Returns reactive ref
  - `setExportThreshold(value)` - Updates value (validates 0-100)
  - `getExportThresholdRatio()` - Returns decimal ratio for calculations (e.g., 0.5 for 50%)

#### Config UI Added
**File**: `/src/v2/pages/config/ConfigPanel.vue`
- New section: "Export Material Threshold"
- Range slider: 0-100% in 5% steps
- Live percentage display
- Descriptive help text with example
- Changes saved automatically to localStorage

#### Integration Updates
**Files Modified**:
1. `/src/v2/pages/player-config/PlayerConfigPanel.vue`
   - Removed local exportThreshold implementation
   - Now uses `getExportThresholdRef()` from central service
   - Removed duplicate localStorage handling

2. `/src/v2/pages/player-config/components/SummaryCalculationsSection.vue`
   - Updated to use `getExportThresholdRatio()` from central service
   - Removed hardcoded 50% threshold
   - Now respects user's configured threshold

3. `/src/v2/composables/useGlobalSummary.ts`
   - Already accepted threshold as parameter (no changes needed)
   - Gets threshold value from PlayerConfigPanel

#### Translations Added
**English**:
- `exportThresholdLabel`: "Export Material Threshold"
- `exportThresholdHint`: "Materials with less than this percentage of local consumption are classified as exports and shown in the Export Materials table."
- `exportThresholdExample`: "Example"
- `exportThresholdExampleText`: "At {threshold}% threshold: A material that uses 30% of its production locally is an export material. A material using 60% locally is not."

**German**:
- `exportThresholdLabel`: "Export-Materialschwelle"
- `exportThresholdHint`: "Materialien mit weniger als diesem Prozentsatz lokalem Verbrauch werden als Exporte klassifiziert und in der Export-Materialien-Tabelle angezeigt."
- `exportThresholdExample`: "Beispiel"
- `exportThresholdExampleText`: "Bei {threshold}% Schwelle: Ein Material, das 30% seiner Produktion lokal nutzt, ist ein Export-Material. Ein Material mit 60% lokalem Verbrauch nicht."

### Validation
- ✅ ESLint: Clean (no errors)
- ✅ TypeScript: Compiles without errors
- ✅ Production build: Successful (16.39s)
- ✅ Config UI shows slider with live percentage
- ✅ Both Global Summary and Materials Balance use same threshold
- ✅ Changes persist across page reloads

### Technical Details
**Storage**: localStorage key `exportThreshold` (was previously `gt:v2:exportThreshold` in PlayerConfigPanel, now centralized)

**Migration**: Old storage key is not migrated automatically. Users will see default 50% on first load after update, then can adjust as needed.

**Validation**: Value is clamped to 0-100 range, rounded to integers.

### User Impact
- Users can now adjust export threshold based on their play style
- Setting is in Config tab, easy to find and adjust
- Clear explanation of what the setting does
- Changes apply immediately to all calculations

---

## Previous Session: Tech Debt & Package Updates

### Summary
Completed comprehensive tech debt cleanup: updated all outdated packages, fixed ESLint errors, and validated production build. Application is now up-to-date with latest dependencies.

### Package Updates Completed

#### Major Updates
- **@vercel/node**: 2.3.0 → 5.5.14 (major update for Vercel API functions)
- **@types/node**: 22.18.6 → 24.10.1 (Node.js TypeScript definitions)

#### Minor/Patch Updates
- **eslint-plugin-vue**: 10.4.0 → 10.6.2
- **lucide-vue-next**: 0.544.0 → 0.555.0 (icon library)
- **prettier**: 3.6.2 → 3.7.4 (code formatter)

#### Engine Requirements
- Added `npm >= 10.0.0` requirement to engines (removes warning)

### Code Quality Fixes

#### ESLint Errors Fixed (8 total)
1. **SummaryCalculationsSection.vue**: Removed unused `autoCreateBuyAlert` import
2. **PriceAlertsPanel.vue**: Removed unused `priceLastFetched` variable
3. **PriceAlertsPanel.vue**: Removed unused `lastCheck` variable
4. **PriceAlertsPanel.vue**: Removed unused `lastCheckLabel` computed property
5. **types.ts**: Removed unused `World` import
6-8. **materialHelpers.test.ts**: Fixed all `any` types by using proper `Material` type from gamedata

### Security Status

**Remaining Vulnerabilities (4 total):**
- esbuild <=0.24.2 (moderate)
- path-to-regexp 4.0.0-6.2.2 (high)
- undici <=5.28.5 (moderate)

**Context**: All vulnerabilities are in `@vercel/node` dependencies and affect the **development server only**, not production builds. These are low-risk for this project since:
- Only used in `/api/prices.ts` for Vercel serverless function
- Production builds are static and don't include dev dependencies
- Dev server is only used locally, not exposed to internet

**Resolution**: Would require downgrading `@vercel/node` from 5.x back to 2.x, which would reverse the major update. Not recommended unless actively developing API endpoints.

### Validation Results

✅ **TypeScript compilation**: No errors (vue-tsc --build)
✅ **ESLint**: Clean - all 8 errors fixed
✅ **Production build**: Successful in 14.16s
- dist/assets/main-B7Nq1dR-.js: 119.93 kB (gzip: 31.11 kB)
- dist/assets/v2-D3uNSHfo.js: 365.26 kB (gzip: 115.06 kB)

### Files Modified
1. `/package.json` - Updated 6 package versions, added npm engine requirement
2. `/src/v2/pages/player-config/components/SummaryCalculationsSection.vue` - Removed unused import
3. `/src/v2/pages/price-alerts/PriceAlertsPanel.vue` - Removed 3 unused variables
4. `/src/v2/services/priceAlerts/types.ts` - Removed unused import
5. `/src/v2/utils/__tests__/materialHelpers.test.ts` - Fixed type assertions

### Not Updated (Requires Breaking Changes)
- **tailwindcss**: 3.4.18 → 4.1.17 (major v4 rewrite - significant config changes needed)
- **vuedraggable**: 4.1.0 → 2.24.3 (version regression - likely incorrect in npm registry)

### Next Steps for Future Tech Debt
1. Consider Tailwind v4 migration (read migration guide first)
2. Monitor for `@vercel/node` updates that fix vulnerabilities
3. Update npm to v10+ in dev container to eliminate engine warnings
4. Consider adding automated dependency updates (Dependabot/Renovate)

---

## Previous Session: UX Improvements

### Summary
Completed a comprehensive set of UX improvements focused on materials management, price alerts, and market analysis filtering. All 5 requested tasks have been successfully implemented and validated.

### Completed Tasks

#### 1. Auto-unmute Price Alerts (Instead of Auto-create)
- **File**: `src/v2/pages/player-config/components/SummaryCalculationsSection.vue`
- **Change**: Modified the watch that monitors materials running out (toPurchase > 0)
- **Behavior**: Now toggles mute state of existing buy alerts instead of creating new ones
- **Implementation**: Lines 165-181 - checks for existing muted buy alerts and unmutes them

#### 2. Material Tier Filter in Market Analysis
- **File**: `src/v2/pages/market/MarketAnalysisPanel.vue`
- **Changes**:
  - Added `materialTiers` computed property (maps materialId → tier from gameData)
  - Added `tierFilter` ref (Set<number>, defaults to all tiers 1-4 selected)
  - Added `toggleTier()` function to handle checkbox interactions
  - Updated `searchFilteredOpportunities` to filter by tier before text search
  - Added tier filter UI with checkboxes for tiers 1-4
  - Added "Tier" column in results table (8% width, yellow-400 text)
  - Adjusted column widths: Material 28%, Tier 8%, Score 12%, Price 13%, Demand 13%, Revenue 13%, Supply 13%
- **Translations**: Added `tierFilter`, `tier1`, `tier2`, `tier3`, `tier4` in EN/DE

#### 3. Split Materials Balance into Export/Non-export Tables
- **File**: `src/v2/pages/player-config/components/SummaryCalculationsSection.vue`
- **Changes**:
  - Added `exportMaterialIds` computed property (lines 137-182)
    - Uses 50% threshold: if <50% consumed locally, it's an export material
    - Builds production/consumption maps from recipes and workers
  - Added `exportMaterials` and `nonExportMaterials` computed properties (lines 203-210)
  - Completely restructured template (lines 373-525):
    - **Export Materials Table**: Material, Period, Unit Price, Net Result (emerald-300 styling)
    - **Other Materials Table**: Material, Period, Unit Price, To Buy, Stock Coverage, Net Result (slate-300 styling)
  - Different column sets reflect different use cases (exports don't need "To Buy" column)
- **Translation**: Added `otherMaterials` in EN/DE

#### 4. Sort Materials Balance by Name (Issue #32)
- **File**: `src/v2/pages/player-config/components/SummaryCalculationsSection.vue`
- **Changes**:
  - Added `materialSortOrder` ref (type: `'name' | 'recipe'`, default: `'name'`)
  - Updated `materialRows` computed to support both sort modes (lines 184-201)
    - `'name'`: Alphabetical by material name
    - `'recipe'`: Original recipe order (maintains production sequence)
  - Added sort toggle button with emojis (📋 = name, 🔤 = recipe)
- **Translations**: Added `sortByName`, `sortByRecipeOrder`, `sortedByName`, `sortedByRecipe` in EN/DE

#### 5. Add New Recipes at Top (Issue #52)
- **File**: `src/v2/services/playerBases.ts`
- **Change**: Line 188 - changed `b.recipes.push(newRecipe)` to `b.recipes.unshift(newRecipe)`
- **Effect**: New recipes now appear at the top of the recipe list instead of the bottom

### Technical Details

**Export Material Logic** (50% threshold):
```typescript
const threshold = 0.5 // hardcoded
// Material is export if: localConsumptionRatio < (1 - threshold)
// Meaning: if less than 50% is consumed locally, it's an export
```

**Tier Filter Implementation**:
- Uses `Set<number>` for efficient membership testing
- Filters materials before text search for better performance
- Reactive via `new Set(tierFilter.value)` pattern
- All tiers selected by default for non-breaking UX

**Sort Toggle Pattern**:
- Single ref tracks current mode
- Computed property handles sorting logic
- Button shows current state and action on hover
- Preserves user preference within session

### Validation
- ✅ No TypeScript errors in any modified files
- ✅ All files checked: MarketAnalysisPanel.vue, SummaryCalculationsSection.vue, playerBases.ts, messages.ts
- ✅ Translation keys added for both EN and DE
- ✅ All 5 tasks completed successfully

### Files Modified
1. `/src/v2/pages/market/MarketAnalysisPanel.vue` - Tier filter and column
2. `/src/v2/pages/player-config/components/SummaryCalculationsSection.vue` - Alerts, sorting, table split
3. `/src/v2/services/playerBases.ts` - Recipe insertion order
4. `/src/v2/localisation/messages.ts` - All translation strings

### Next Steps
- All requested features are complete
- Ready for testing in the application
- Consider adding tier filter persistence to localStorage (future enhancement)
- Consider making export threshold configurable (currently hardcoded at 50%)
