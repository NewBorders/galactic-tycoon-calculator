# Development Handoff Document

## 🎯 LATEST (Jan 2025): Market Analysis Search & Info Tooltips - COMPLETED ✅

**STATUS: UX Improvements Complete - Search Replaced Filters, Daily Volume Added, Calculation Tooltips Implemented**

### Major UX Improvements Based on User Feedback

Successfully replaced ineffective filter system with user-friendly material search and added transparency features:

#### 1. Material Search (Replaced Advanced Filters) ✅
- **Removed**: Complex "Advanced Filters" section (min score slider, demand/trend checkboxes, apply/clear buttons)
- **Added**: Simple text search input for material names and IDs
- **Features**: Instant reactive search, case-insensitive, shows "X of Y materials" count
- **Technical**: `materialSearch` ref, `searchFilteredOpportunities` computed property

#### 2. Enhanced Demand Column with Daily Volume ✅
- **Before**: Single badge (HIGH/MEDIUM/LOW)
- **After**: Badge + daily volume quantity ("1,500 units/day")
- **Why**: Provides concrete market size data for decision-making

#### 3. Info Button Tooltips in Table Headers ✅
- **Added**: ⓘ icon with `title` tooltips explaining calculations
- **Covers**: Score/Rating, Avg Price, Demand, Revenue/Day, Supply
- **Why**: Transparency builds trust in scoring methodology

#### 4. Simplified Recommendation Stats ✅
- **Changed**: From clickable filter buttons to read-only stat cards
- **Why**: Part of simplified UX (removed filter-by-recommendation feature)

**Files Modified**: `src/v2/pages/market/MarketAnalysisPanel.vue` (386 lines)

**Testing**: ✅ TypeScript passes, ✅ No lint errors, ✅ All existing tests pass

---

## 🎉 PREVIOUS (Dec 2025): Market Analysis UX Improvements - COMPLETED ✅

### Major UX Improvements Implemented

Successfully implemented comprehensive improvements to the Market Analysis feature:

#### 1. Revenue-Based Demand Calculation ✅
**What Changed:**
- Demand now considers both quantity AND price (revenue = qty × price)
- Old system: Only looked at units sold per day (>1000 units = high)
- New system: Looks at daily revenue in dollars (>$5k/day = high, $500-5k = medium, <$500 = low)

**Why:** Materials with low volume but high prices (luxury goods) now score appropriately. Example:
- Old: 500 units × $100 = "medium demand" (volume-based)
- New: 500 units × $100 = $50k/day = "high demand" (revenue-based) ✅

**Technical:**
- Added `revenue7d` and `revenueAvgPerDay` to `MarketDemand` type
- Thresholds: 500k cents (>$5k), 50k cents (>$500)
- Formula: `sum(qtySold × avgPrice) / historyLength`

#### 2. Production-Focused Terminology ✅
**Renamed Recommendations:**
```
strong-buy  →  excellent  (worth producing!)
buy         →  good       (good to produce)
hold        →  neutral    (neutral opportunity)
sell        →  poor       (poor opportunity)
strong-sell →  avoid      (avoid producing)
```

**Why:** Users are producers, not traders. The question is "should I produce this?" not "should I buy this?"

#### 3. UI/UX Enhancements ✅

**Sticky Table Header:**
- Table scrolls with header staying visible
- `max-h-[600px] overflow-y-auto` + `sticky top-0 z-10`

**Combined Score + Recommendation:**
- Before: Separate columns
- After: Single column with score number + colored badge
- Example: `85 [Excellent]` with green badge

**Dollar Prices Instead of Cents:**
- Before: 6400 cents
- After: $64.00
- Uses `formatDecimal(cents / 100, 2)` from locale system

**Locale-Aware Number Formatting:**
- Uses `formatInteger`, `formatDecimal`, `formatPercent` from `localisation/numbers.ts`
- Respects user's locale settings (EN: 1,234.56 vs DE: 1.234,56)

**7d Trend Below Price:**
- Average price shown on first line
- Trend indicator below: `↑ +5.2%` (green) or `↓ -3.1%` (red)

**Clickable Recommendation Filters:**
- Stats cards (Excellent: 12, Good: 45, etc.) now toggle filters
- Active filter shows ring indicator
- Click to filter table by that recommendation

#### Files Modified:
```
src/v2/services/marketAnalysis/
  ├── transformer.ts           - Revenue calculation logic
  ├── types.ts                 - Added revenue fields, new recommendation type
  └── __tests__/
      ├── transformer.test.ts  - Updated expectations
      ├── repository.test.ts   - Updated test data
      └── testFixtures.ts      - Adjusted prices ($1.50 instead of $1.00)

src/v2/pages/market/
  └── MarketAnalysisPanel.vue  - Complete UI restructure
```

#### Test Results:
```bash
✅ 64/64 market analysis tests passing
✅ TypeScript: 0 errors
✅ Ready for browser testing
```

#### Technical Details:

**Demand Thresholds (Revenue-Based):**
```typescript
// High: >$5k/day (500k cents/day)
if (revenueAvgPerDay > 500000) demandLevel = 'high'
// Medium: $500-5k/day (50k-500k cents/day)  
else if (revenueAvgPerDay > 50000) demandLevel = 'medium'
// Low: <$500/day
else demandLevel = 'low'
```

**Recommendation Colors:**
- Excellent: Green (`bg-green-100`, `text-green-800`)
- Good: Blue (`bg-blue-100`, `text-blue-800`)
- Neutral: Gray (`bg-gray-100`, `text-gray-800`)
- Poor: Orange (`bg-orange-100`, `text-orange-800`)
- Avoid: Red (`bg-red-100`, `text-red-800`)

**Price Formatting Function:**
```typescript
function formatPrice(cents: number) {
  return '$' + formatDecimal(cents / 100, 2)
}
```

### Next Steps for User:
1. Test in browser - all UX improvements should be visible
2. Verify filters work by clicking recommendation stats
3. Check that prices show as dollars ($64.00)
4. Confirm table header stays visible when scrolling
5. Test with different materials to see revenue-based demand

---

## 🎉 PREVIOUS (Nov 27, 2025): All Pull Request Comments Addressed

[Previous content preserved below...]

### Pull Request Review Comments - All Resolved ✅

1. **✅ API Format Mismatch** (Already Fixed)
   - Types and extractor use correct format: `materials`, `matId`, `matName`, `currentPrice`, `avgPrice`, `priceHistory`
   - All 100 tests passing

2. **✅ Unused api/market-details.ts Proxy Deleted**
   - File had hardcoded g2, missing API key forwarding, never used by extractor
   - Removed to avoid confusion

3. **✅ Made World Reactive**
   - `MarketAnalysisPanel.vue`: Changed to `computed(() => getWorld())`
   - Added watch to re-fetch when world changes (g1 ↔ g2)

4. **✅ Division by Zero Protection**
   - Added checks for `avgPrice === 0`, `avg1d !== 0`, `bidPrice !== 0`, `avgQtySoldDaily > 0`
   - All edge cases handled safely, returns null or fallback to 0

5. **✅ Cache API Key Awareness**
   - Cache key now: `${world}:${apiKey}` instead of just `world`
   - Prevents serving wrong account's data after API key change
   - clearMarketDetailsCache updated for new format

6. **✅ Removed Unnecessary Non-Null Assertions**
   - Replaced `!` operators with local const variables
   - TypeScript control flow properly narrows types now

7. **✅ Added Division by Zero Test Coverage**
   - Added 4 new tests for avgPrice=0, avg1d=0, avgQtySoldDaily=0, bidPrice=0
   - All 100 tests passing (64 market + 36 other)

8. **✅ Full Internationalization**
   - Added 40+ translation keys to messages.ts (English + German)
   - Replaced all hardcoded strings in MarketAnalysisPanel.vue
   - Uses translate() function consistently throughout
   - Helper functions (getRecommendationLabel, getDemandLabel, formatTimeAgo) all use translations

### Note on Spread Logic
PR comment mentioned spread interpretation. The implementation now uses **days of supply** (totalQty / dailyVolume):
- Oversupplied: >3 days
- Undersupplied: <1 day  
- Balanced: 1-3 days

This is more accurate than bid/ask spread for game mechanics. Old comment referred to previous implementation.

### Quality Assurance
- ✅ TypeScript: Clean, 0 errors
- ✅ Tests: 100/100 passing
- ✅ Localization: Complete (EN + DE)
- ✅ ESLint: Clean
- ✅ All PR comments resolved

### Files Changed in This Session
- `src/v2/services/marketAnalysis/extractor.ts` - Cache key includes API key
- `src/v2/services/marketAnalysis/transformer.ts` - Division by zero checks
- `src/v2/services/marketAnalysis/repository.ts` - Removed ! operators
- `src/v2/services/marketAnalysis/__tests__/transformer.test.ts` - Added 4 edge case tests
- `src/v2/pages/market/MarketAnalysisPanel.vue` - Made world reactive, full i18n
- `src/v2/localisation/messages.ts` - Added 40+ translation keys
- `api/market-details.ts` - DELETED (unused)

---

## ✅ PREVIOUS (Nov 27, 2025): Market Analysis - API Format Mismatch Resolved

**ROOT CAUSE: API Response Format Was Completely Different**

### Problem Identified
User provided actual API response showing the data format was completely different from expectations:
- ❌ Expected: `{ mats: [ { id, lp, avg7d, history: [{t, v, p}] } ] }`
- ✅ Actual: `{ materials: [ { matId, matName, currentPrice, avgPrice, priceHistory: [{date, avgPrice, qtySold}] } ] }`

Console logs showed:
```
[Market Analysis] API Response: { totalMaterials: 0, ... }
[Market Analysis] Repository: { rawMaterialsCount: 0, ... }
[Market Analysis] Transformed: { opportunitiesCount: 0, ... }
```

Data was loading but `materials` field was being ignored because code looked for `mats` field!

### Solution Implemented

**1. Updated Type Definitions** ✅
- Created new `MaterialDetailsRaw` interface matching actual API format
- Added `PriceHistoryEntry` with `date`, `avgPrice`, `qtySold`, `qtyRemaining`
- Changed `MarketDetailsApiResponse.mats` → `materials`

**2. Updated Extractor** ✅
- Changed `apiResponse.mats` → `apiResponse.materials`
- Updated console logging to show `matId`, `matName`, `currentPrice`

**3. Rewrote Transformer** ✅
- `calculatePriceTrend`: Uses `currentPrice` and `avgPrice` instead of `lp`/`avg7d`
- `calculateMarketDemand`: Uses `avgQtySoldDaily` directly, sums `qtySold` from history
- `calculateMarketSaturation`: Uses `totalQtyAvailable` / `avgQtySoldDaily` for days-of-supply logic
- All calculations adapted to new data structure

**4. Created Test Fixtures** ✅
- New file: `src/v2/services/marketAnalysis/__tests__/testFixtures.ts`
- Helper functions: `createRisingTrendMaterial()`, `createHighDemandMaterial()`, etc.
- All fixtures match actual API format

**5. Rewrote All Tests** ✅
- `transformer.test.ts`: 30 tests using new fixtures
- `extractor.test.ts`: 12 tests using new fixtures
- `repository.test.ts`: 18 tests using new fixtures
- **Total: 60 market analysis tests passing**

### Files Modified

**Core Logic:**
- `src/v2/services/marketAnalysis/types.ts` - Complete type rewrite
- `src/v2/services/marketAnalysis/extractor.ts` - Changed field access
- `src/v2/services/marketAnalysis/transformer.ts` - All calculation logic rewritten

**Tests:**
- `src/v2/services/marketAnalysis/__tests__/testFixtures.ts` - NEW
- `src/v2/services/marketAnalysis/__tests__/transformer.test.ts` - Rewritten
- `src/v2/services/marketAnalysis/__tests__/extractor.test.ts` - Rewritten
- `src/v2/services/marketAnalysis/__tests__/repository.test.ts` - Rewritten

### Test Results

```bash
docker compose exec web npm run type-check
# ✅ No TypeScript errors

docker compose exec web npm test --run
# ✅ 96/96 tests passing
#    - 60 market analysis tests
#    - 36 other V2 tests
```

### API Format Mapping

| API Field | Old Expected | New Type Property |
|-----------|--------------|-------------------|
| `materials` | `mats` | ✅ Fixed |
| `matId` | `id` | ✅ Fixed |
| `matName` | N/A | ✅ Added |
| `currentPrice` | `lp` | ✅ Fixed |
| `avgPrice` | `avg7d` | ✅ Fixed |
| `avgQtySoldDaily` | N/A | ✅ Added |
| `totalQtyAvailable` | N/A | ✅ Added |
| `priceHistory[]` | `history[]` | ✅ Fixed |
| `priceHistory[].date` | `history[].t` | ✅ Fixed |
| `priceHistory[].avgPrice` | `history[].p` | ✅ Fixed |
| `priceHistory[].qtySold` | `history[].v` | ✅ Fixed |
| `orders[]` | N/A | ✅ Added |

### What Changed in Calculations

**Price Trend:**
- Before: `current = lp ?? avg1d ?? avg7d`
- After: `current = currentPrice`, `avg7d = avgPrice`

**Demand:**
- Before: `volume7d = sum(history[].v)`
- After: `volume7d = sum(priceHistory[].qtySold)`, uses `avgQtySoldDaily`

**Saturation:**
- Before: Used `ask`/`bid` spread
- After: Uses `totalQtyAvailable / avgQtySoldDaily` for days-of-supply

### Next Steps

**User should now:**
1. Refresh browser (Ctrl+F5) to clear any cached code
2. Go to Market Analysis tab
3. Click "Refresh"
4. **Console should show:**
   ```
   [Market Analysis] API Response: { totalMaterials: 250, world: 'g2', sampleMaterial: {matId: 1, matName: 'Iron Ore', ...} }
   [Market Analysis] Repository: { rawMaterialsCount: 250, ... }
   [Market Analysis] Transformed: { opportunitiesCount: 250, ... }
   [MarketAnalysisPanel] filteredOpportunities changed: { count: 250, ... }
   ```
5. **Table should populate with ~250 materials!**

---

## 🔍 PREVIOUS: Market Analysis - Debug Logging Added

**DEBUGGING: Data loads but table shows nothing**

### Problem Reported
User waited 5 minutes (rate limit cooldown), API call succeeded (HTTP 200), but:
- ✅ No error in console
- ✅ No error message displayed
- ❌ Table shows nothing / appears empty
- ❌ Stats show 0 for everything

### Debug Logging Added

Added comprehensive console logging throughout the data pipeline to identify where data is lost:

**Files Modified:**
- `src/v2/services/marketAnalysis/extractor.ts` - Logs API response with material count
- `src/v2/services/marketAnalysis/repository.ts` - Logs before/after transformation
- `src/v2/composables/useMarketAnalysis.ts` - Logs data received in composable
- `src/v2/pages/market/MarketAnalysisPanel.vue` - Watches filteredOpportunities changes

**Expected Console Output:**
```
[Market Analysis] API Response: { totalMaterials: 250, world: 'g2', sampleMaterial: {...} }
[Market Analysis] Repository: { rawMaterialsCount: 250, world: 'g2', forceRefresh: true }
[Market Analysis] Transformed: { opportunitiesCount: 250, sampleOpportunity: {...} }
[Market Analysis] Composable received: { dataLength: 250, options: {...}, forceRefresh: true }
[MarketAnalysisPanel] filteredOpportunities changed: { count: 250, sample: {...} }
```

### Next Steps for User

1. **Open Browser DevTools Console** (F12)
2. **Go to Market Analysis Tab**
3. **Click "Refresh" Button**
4. **Check Console Output** - Look for the `[Market Analysis]` logs
5. **Report Findings:**
   - How many materials at each step?
   - Where does the count drop to 0?
   - Any errors or warnings?

### Possible Issues to Check

1. **API Response Format Changed**
   - Expected: `{ mats: [ { id, lp, avg7d, history, ... } ] }`
   - Check: `apiResponse.mats` is an array

2. **Transformation Fails Silently**
   - Check: All materials have required fields (id, lp or avg7d, history)
   - Fallback values might create "no-data" entries

3. **Filter Removes All Data**
   - Check: Default filters might be too restrictive
   - Filters: `minOpportunityScore`, `demandLevels`, `trendDirections`

4. **World Mismatch**
   - Check: User's API key world matches `getWorld()` selection
   - G1 key can't access G2 data and vice versa

5. **Cache Returns Empty Array**
   - Check: Previous failed request cached empty array
   - Solution: Force refresh or clear cache

### Quick Fix to Try

If logs show data at API level but not at UI level, try clearing cache:

```typescript
import { clearMarketDetailsCache } from '../../services/marketAnalysis'

// In component:
function hardRefresh() {
  clearMarketDetailsCache()
  fetch(true)
}
```

---

## ✅ PREVIOUS: Market Analysis Feature - API Key Integration & Error Handling Fixed

**BUGFIX: 429 Rate Limit Error resolved + Better Error Messages**

### Problem Identified
User reported "API error: 429" with no details when accessing Market Analysis tab. Investigation revealed:
- Market Analysis endpoint was calling API without API key
- 429 = "Too Many Requests" - API rate limits unauthenticated requests heavily
- Error messages lacked detail for debugging

### Solution Implemented

1. **API Key Integration** ✅
   - Updated `extractor.ts` to require `apiKey` parameter
   - Repository now fetches API key from `apiKeyManager.getApiKey()`
   - Throws clear error if no API key configured: "API key is required. Please configure it in the Config tab."
   - API calls now include key: `/public/exchange/mat-details?apikey=KEY`

2. **Enhanced Error Messages** ✅
   - Generic error: `API error 500: Internal Server Error`
   - Rate limit (429): `API error 429: Too Many Requests - Rate limit exceeded. Please wait a moment before refreshing.`
   - Auth errors (401/403): `API error 401: Unauthorized - Invalid or missing API key. Please check your configuration.`
   - Users now see actionable error messages with HTTP status codes

3. **Test Coverage Updated** ✅
   - All 49 market analysis tests still passing
   - Added API key mocking to repository tests using `vi.mock()`
   - Extractor tests updated to include API key parameter
   - All 85 tests across V2 passing

### Technical Changes

**Files Modified:**
- `src/v2/services/marketAnalysis/extractor.ts` - Added apiKey param, better error messages
- `src/v2/services/marketAnalysis/repository.ts` - Fetch API key, validate presence
- `src/v2/services/marketAnalysis/__tests__/extractor.test.ts` - Updated test calls
- `src/v2/services/marketAnalysis/__tests__/repository.test.ts` - Added API key mocking

**Before:**
```typescript
// No API key sent
const url = `${baseUrl}/public/exchange/mat-details`
const response = await fetch(url)
// Error: "API error: 429 Too Many Requests" - no context
```

**After:**
```typescript
// API key included
const url = new URL(`${baseUrl}/public/exchange/mat-details`)
url.searchParams.set('apikey', apiKey)
const response = await fetch(url.toString())

// Enhanced error with actionable message
if (response.status === 429) {
  throw new Error('API error 429: Too Many Requests - Rate limit exceeded. Please wait a moment before refreshing.')
}
```

### How to Use

1. **Configure API Key**: Go to Config tab, enter your Galactic Tycoons API key
2. **Access Market Analysis**: Click "📊 Market Analysis" tab
3. **Data Loads**: Should now load successfully with valid API key
4. **Error Handling**: If issues occur, detailed error message shows what went wrong

### Test Results

```bash
docker compose exec web npm test -- --run
# ✅ 85/85 tests passing

docker compose exec web npm run type-check  
# ✅ No TypeScript errors
```

### Cache Behavior

- 1-minute cache prevents hitting rate limits
- Cache respects world selection (g1/g2)
- Force refresh bypasses cache but risks rate limit
- Stale cache returned if API fails (graceful degradation)

---

## ✅ PREVIOUS (Nov 27, 2025): Market Analysis Feature - Complete V2 Implementation

[Previous content about initial V2 implementation preserved above]
