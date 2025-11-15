Summary of recent changes (Nov 15, 2025) — Player API Integration for Warehouse Stocks

## ✅ COMPLETED: Galactic Tycoons API Integration

Implemented full integration with the Galactic Tycoons API to fetch and manage warehouse stocks and player bases automatically.

### What I Changed

#### 1. New API Services (`src/v2/services/api/`)
- **apiKeyManager.ts** - Secure API key storage in localStorage
  - `getApiKey()`, `setApiKey()`, `clearApiKey()`, `hasApiKey()`
  
- **warehouseService.ts** - API client with intelligent caching
  - `fetchCompanyBases(apiKey)` calls `/public/company` endpoint
  - `fetchWarehouseStock(apiKey)` calls `/public/company/warehouse` endpoint
  - 5-minute TTL cache to respect rate limits
  - Force refresh capability
  - Last fetch time tracking

- **types.ts** - TypeScript types for API responses

#### 2. PlayerBase Model Enhancement
Extended with:
- `gameBaseId?: number` - Unique ID from API (for matching)
- `gameWarehouseId?: number` - Warehouse ID from API
- `lastStockRefresh?: number` - Timestamp of last warehouse update

#### 3. PlayerBases Service (`src/v2/services/playerBases.ts`)
Added three new functions:
- **syncBaseFromApi(apiBase)** - Smart base sync
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
