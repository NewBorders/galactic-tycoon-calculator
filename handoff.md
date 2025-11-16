Summary of recent changes (Nov 16, 2025) — Phase 4 & 5: Button Integration & World-Aware GameData Loading

## ✅ COMPLETED: Phase 4 - Language & Button Integration (DONE Nov 16)
## ✅ COMPLETED: Phase 5 - Button Repositioning & World-Aware GameData (DONE Nov 16)

### Phase 5 Completion (Nov 16):

#### 1. ✅ "Load my bases" Button Repositioned
- Issue: Button needed to move beside planet search for better UX
- Solution: Created standalone `LoadBasesButton.vue` component
- Integration: Wrapped PlanetSearch and LoadBasesButton in flex container in PlayerConfigPanel
- Result: Button sits right beside search input for cleaner layout

#### 2. ✅ GameData Service Now World-Aware
- Added watch for world changes in AppV2.vue:
  ```typescript
  watch(getWorld, async () => {
    const result = await loadGameData(true)  // force reload
    gd.value = result.data
    gdIndex.value = result.index
    gdLoadedAt.value = result.loadedAt
  })
  ```
- When user switches world (g1 ↔ g2), gamedata automatically reloads from correct API
- extractRawGameData.ts already had getApiUrl() so API calls go to correct server
- Result: Prices, materials, and buildings now update when world is changed

#### 3. ✅ Component Separation Cleaned
- LoadBasesButton.vue: Standalone component with handleSyncBases() logic
- ApiSyncPanel.vue: Now focused only on warehouse stock loading
- PlanetSearch.vue: Pure search UI, no button logic
- PlayerConfigPanel.vue: Orchestrates components, imports LoadBasesButton
- Result: Clean separation of concerns, easier to maintain

## ✅ COMPLETED: Phase 4 - Language & Button Integration (Nov 16)

### Phase 4 Completion (Nov 16):

#### 1. ✅ Language Switcher Moved to Config
- Removed from AppV2.vue top bar
- Added to ConfigPanel.vue
- All settings (API key, World, Locale, Language) now grouped together

#### 2. ✅ "Load my bases" Button Functionality Fixed
- Created dedicated handler in PlayerConfigPanel: `handleSyncBasesClick()`
- Properly invokes `apiSyncPanel.value?.handleSyncBases?.()`
- Button now reliably triggers base synchronization

## ✅ COMPLETED: Phase 2 - UI Reorganization & World Selector (DONE Nov 15)
## ✅ COMPLETED: Phase 3 - Bug Fixes & Language Integration (DONE Nov 16)

### Phase 3 Fixes (Nov 16):

#### 1. ✅ "Load my bases" Button Fixed
- Issue: Button was not triggering handleSyncBases
- Fix: Created dedicated handler function `handleSyncBasesClick()` in PlayerConfigPanel
- Method invocation now properly calls `apiSyncPanel.value?.handleSyncBases?.()`
- Button now works reliably when clicked

#### 2. ✅ Warehouse Stocks Error Fixed  
- Issue: TypeError "Cannot read properties of undefined (reading 'forEach')"
- Root Cause: `w.data.items` could be undefined
- Fix: Added fallback `items: w.data.items ?? []` in ApiSyncPanel.vue
- Prevents forEach on undefined

#### 3. ✅ Language Switcher Moved to Config
- Removed: LanguageSwitcher from AppV2.vue top bar
- Added: LanguageSwitcher component to ConfigPanel.vue
- Language selector now integrated with other settings (API key, World, Locale)
- Added localization string: `languageLabel` (EN & DE)
- Better UX: All configuration grouped in one place

#### 4. ✅ World Selector Everywhere
- extractRawGameData.ts: Uses `getApiUrl()` with dynamic world
- prices.ts: Uses `getApiUrl()` with dynamic world
- Gamedata and prices now respect user's world selection (g1/g2)

## Phase 2 Summary (Completed Nov 15):

### 1. ✅ Config Tab Created
- Added new 'config' tab to AppV2.vue alongside 'bases' and 'technology' tabs
- Type: `type Tab = 'bases' | 'technology' | 'config'`
- Accessible from top-level tab navigation

### 2. ✅ API Settings Consolidated  
- Created ConfigPanel.vue component with:
  - API key input (can save empty string to clear)
  - World selector (g1 test / g2 production)
  - Locale selector
- Removed "Clear API Key" button
- All settings persisted in localStorage

### 3. ✅ World Selector Implementation
- Added World type ('g1' | 'g2') in types.ts
- Dynamic API URLs: `https://api.${world}.galactictycoons.com`
- Default world: 'g2' (production)
- All API functions world-aware:
  - fetchCompanyBases(apiKey, world, forceRefresh)
  - fetchWarehouseStockForBase(apiKey, warehouseId, world)
  - fetchWarehouseStockForAllBases(apiKey, warehouseIds, world)

### 4. ✅ Warehouse Stock Loading Fixed
- Changed endpoint from `/warehouse` (all at once) to `/warehouse/{warehouseId}` (per-base)
- Implemented parallel fetching via Promise.all()
- Returns object with: `{ warehouses: Array<{ data, source }>, errors: string[] }`
- Error handling: gracefully returns empty on 404/401

### 5. ✅ "Load my bases" Button Positioned
- Added beside planet search input in PlanetSearch.vue
- Emits `syncBases` event that PlayerConfigPanel handles
- Uses ApiSyncPanel ref for method invocation
- Consistent button styling with UI

### 6. ✅ "Load warehouse stocks" Button Positioned
- Placed in ApiSyncPanel beside gamedata/price timestamps
- Matches timestamp area styling
- Shows last sync time and success/error messages
- Calls fetchWarehouseStockForAllBases() with world awareness

### 7. ✅ Tests & Quality
- All tests passing (28/28)
- Type-check: PASS
- Lint: PASS (new files)
- Build: PASS
  - Matches by gameBaseId (primary) or planetId (fallback)
  - Only sets name if not already set
  - Places new bases at top of list
  - Auto-creates entries if needed
  
- **updateBaseStockFromApi(gameBaseId, stocks)** - Update warehouse
  - Updates stock for specific base
  - Sanitizes negative values
  - Replaces entire stock object
  - Tracks refresh timestamp

- **getLastStockRefresh(baseId)** - Get update timestamp

#### 4. UI Component (`src/v2/pages/player-config/components/ApiConfigPanel.vue`)
New component with:
- Password input for API key
- Save/Clear buttons with feedback
- "Sync Bases" button - fetches all player bases
- "Load warehouse stocks" button - fetches all warehouse stocks
- Success/error messaging with timestamps
- Emits: `basesLoaded`, `stocksLoaded` events

Integrated into `PlayerConfigPanel.vue` at the top with handlers for:
- `handleBasesLoaded()` - processes synced bases
- `handleStocksLoaded()` - processes warehouse stocks

#### 5. Localization
Added comprehensive translations in `src/v2/localisation/localisation.ts`:
- API configuration labels and hints
- Sync action buttons
- Success/error messages
- Timestamps and status indicators

#### 6. Comprehensive Tests (34 tests, all passing ✅)
- **apiKeyManager.test.ts** (11 tests) - Storage, retrieval, error handling
- **warehouseService.test.ts** (10 tests) - API calls, caching, TTL, errors
- **playerBasesApi.test.ts** (10 tests) - Sync logic, stock updates, workflows

### Architecture Highlights

**Separation of Concerns**
- API layer separate from UI (services/api/)
- PlayerBases handles sync logic
- Components handle user interactions

**Caching Strategy**
- 5-min TTL prevents excessive API calls
- Force refresh available
- Timestamps exposed to UI

**Base Matching Intelligence**
- Primary: gameBaseId (new API field)
- Secondary: planetId (backward compatibility)
- Auto-creates entries if needed

**Stock Management**
- Replace model: warehouse truth supersedes manual edits
- Value sanitization: rejects negatives
- Timestamp tracking for UI feedback

### Files Changed

**New**:
- src/v2/services/api/index.ts
- src/v2/services/api/types.ts
- src/v2/services/api/apiKeyManager.ts
- src/v2/services/api/warehouseService.ts
- src/v2/services/api/__tests__/apiKeyManager.test.ts
- src/v2/services/api/__tests__/warehouseService.test.ts
- src/v2/services/__tests__/playerBasesApi.test.ts
- src/v2/pages/player-config/components/ApiConfigPanel.vue

**Modified**:
- src/v2/services/playerBases.ts (added 3 functions)
- src/v2/pages/player-config/PlayerConfigPanel.vue (integrated ApiConfigPanel)
- src/v2/localisation/localisation.ts (added translation keys)

### Verification

✅ All tests pass: `Test Files 4 passed | Tests 34 passed`
✅ Type checking: `npm run type-check` passes
✅ Build succeeds: `npm run build` produces dist/
✅ No new lint errors introduced

### Notes

- API keys stored in plain text in localStorage (consider encryption in future)
- Manual stock import textarea remains available
- Both import methods work independently
- Stock from API replaces entire warehouse (not merged)
- Smart base matching uses gameBaseId/planetId fallback

---

**Previous changes (Nov 13, 2025) — Number formatting improvements**

What I changed

- Consolidated multiple `formatNumber` implementations into a single utility at `src/v1/utils/formatNumber.ts`.
- `formatNumber` now chooses numeric formatting based on `document.documentElement.lang` so formatting follows the app language. For the currently supported languages (`en`, `de`) it uses `de-DE` numeric formatting (dot thousands separator, comma decimal separator) as requested.
- Added `formatPrice(value, decimals?)` which always formats values as game Dollars (prefix `$`) and uses the same numeric formatting rules (example: `$1.104,5`). Default decimals for prices is 1.
- Updated usages:
  - Replaced inline `formatNumber` functions in several v2 components and imported the shared `formatNumber`.
  - Updated `DailyCalculationsSection.vue` to use `formatPrice` for unit price columns.
  - Updated `src/v1/components/PricesConfig.vue` to show `current` and `avg` prices using `formatPrice`.

Testing & QA
- Ran TypeScript checks (`npm run type-check`) — no blocking errors.
- Spot-checked the affected components; number displays now use the unified formatting.

Next steps you may want
- If you want language-specific numeric rules for more languages, expand the `numericLocaleFromDocument()` mapping in `src/v1/utils/formatNumber.ts`.
- Replace other raw `.toFixed()` usages (if any) where you want localized formatting.

Files changed (high level)
- `src/v1/utils/formatNumber.ts` — consolidated functions + `formatPrice`
- `src/v2/pages/player-config/components/BaseSummaryCard.vue` — import shared formatter
- `src/v2/pages/player-config/components/DailyCalculationsSection.vue` — import shared formatter + use `formatPrice` for prices
- `src/v1/components/PricesConfig.vue` — use `formatPrice` for current/avg

Actions performed
- Started dev container and ran type-check. All good.

Recent (Nov 14, 2025) change

- `src/v2/services/production/availability.ts`: Replaced specialization-based fertility check with an explicit list of building IDs that require planetary fertility (farm, orchard, aquaponics). This ensures recipes that should use planetary fertility do so, and excludes `Ranch` (id 17) which produces animal products regardless of planet fertility.

Notes
- I attempted a local TypeScript check (`npm run type-check`) but `vue-tsc` is not installed in this environment; please run `docker compose exec web npm run type-check` in the project's dev container to verify type checks.
Notes
- I attempted to run `npm run build` here but required dev tools (`run-p`, `vue-tsc`) are not available in the container environment. I fixed the TypeScript errors reported by `vite build`:

- Fixed possible-undefined assignment when iterating `planet.materials` in `src/v2/services/production/availability.ts` by checking `mat` before use.

Please run the following in your dev environment to verify and finish:

```bash
docker compose up -d
docker compose exec web npm run type-check
docker compose exec web npm run build
```
