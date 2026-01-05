# Project Handoff

## Recent Work: Single Source of Truth Refactoring (Warehouse Stocks)

### Context
User identified an architectural problem: We had **two separate data sources** for warehouse stocks:
1. `worldData.current.warehouseStocks` - Global state (Record<materialId, quantity>)
2. `base.stock` - Per-base state (Record<materialId, quantity>)

This violated the Single Source of Truth principle and caused confusion.

### Problem Analysis
- The API returns warehouse-specific data (one warehouse per base)
- `worldData.warehouseStocks` could only hold data for ONE warehouse at a time
- When refreshing Warehouse-2, Warehouse-1 data was overwritten
- syncService updated BOTH global warehouseStocks AND base.stock (via callbacks)
- Components read from global warehouseStocks, which often contained stale/wrong data
- Previous fix (passing base.stock to components) only masked the architectural issue

### Solution Implemented
**Removed `worldData.warehouseStocks` entirely** and made `base.stock` the single source of truth:

1. **Type Changes**:
   - Removed `warehouseStocks: Record<number, number>` from `CurrentState` interface
   - Added documentation comment explaining warehouse stocks are now in PlayerBase.stock

2. **Service Changes**:
   - **syncService.ts**: Removed `updateCurrent({ warehouseStocks })` line (kept only callback)
   - **worldData/storage.ts**: Removed warehouseStocks initialization from `createEmptyWorldData()`
   - **worldData/index.ts**: Removed warehouseStocks sync timestamp update

3. **Composable Changes**:
   - **useGlobalSummary.ts**: 
     - Removed `warehouseStocks` parameter
     - Changed to read from `base.stock` directly for each base
     - Updated materialsRunningOut calculation to use `const baseStock = base.stock ?? {}`
     - Updated workforce productivity to use `baseStock`

4. **Component Changes**:
   - **GlobalSummary.vue**: Removed warehouseStocks computed ref and parameter
   - **MaterialsBalancePage.vue**: Removed warehouseStocks computed ref and parameter
   - **MaterialsShortagePage.vue**: Removed warehouseStocks computed ref and parameter
   - **GlobalSummaryPage.vue**: Removed warehouseStocks computed ref and parameter
   - **PlayerConfigPanel.vue**: Removed warehouseStocks computed ref
   - **ConfiguredBase.vue**: Added nullish coalescing `:warehouse-stocks="base.stock ?? {}"`

5. **Test Changes**:
   - **storage.test.ts**: Removed warehouseStocks assertion from createEmptyWorldData test
   - **integration.test.ts**: Removed warehouse stocks update test scenario

6. **Import Cleanup**:
   - Removed unused `useWorldData` imports from all affected files
   - Removed unused `useWorldData` from syncService.ts

### Benefits
- ✅ Single source of truth for warehouse stocks (base.stock)
- ✅ No more global state that gets overwritten
- ✅ Clearer data flow: API → syncService → callbacks → base.stock → components
- ✅ No architectural confusion about which data to use
- ✅ Easier to debug (only one place to look)

### Data Flow (After Refactoring)
```
API (warehouse endpoint)
  ↓
syncService.refreshEntry('warehouse-X')
  ↓
Calls callback: onWarehouseStockLoaded(warehouseId, stocks)
  ↓
playerBases.updateStockForWarehouse(warehouseId, stocks)
  ↓
Finds all bases with matching warehouseId
  ↓
Updates base.stock for each matching base
  ↓
Components read from base.stock directly
```

### Testing Status
- ✅ Type-check passes (npm run type-check)
- ✅ All warehouse stock tests updated
- ⚠️ Lint warnings exist but are pre-existing (not introduced by this change)
- 🧪 Integration tests needed: Manual verification required for warehouse refresh functionality

### Commit
- Branch: `71-planning-mode`
- Commit: `0912343` - "refactor: remove worldData.warehouseStocks, use base.stock as single source of truth"
- PR: #72 (Planning mode)

### Next Steps for Testing
1. Start app: `docker compose up`
2. Navigate to Player Config > Bases > Materials Balance
3. Click "Refresh Stock" button
4. Verify:
   - Stock values update correctly
   - Timestamp updates correctly
   - Both manual refresh and auto-refresh (5 min) work
   - Materials Running Out section shows correct days
   - Workforce productivity shows correct status

### Related Files Changed
- `src/v2/services/worldData/types.ts` (removed warehouseStocks from CurrentState)
- `src/v2/services/worldData/storage.ts` (removed from createEmptyWorldData)
- `src/v2/services/worldData/index.ts` (removed sync timestamp update)
- `src/v2/services/syncService.ts` (removed updateCurrent call)
- `src/v2/composables/useGlobalSummary.ts` (refactored to use base.stock)
- `src/v2/pages/GlobalSummaryPage.vue` (removed warehouseStocks)
- `src/v2/pages/MaterialsBalancePage.vue` (removed warehouseStocks)
- `src/v2/pages/MaterialsShortagePage.vue` (removed warehouseStocks)
- `src/v2/pages/player-config/PlayerConfigPanel.vue` (removed warehouseStocks)
- `src/v2/pages/player-config/components/GlobalSummary.vue` (removed import)
- `src/v2/pages/player-config/components/ConfiguredBase.vue` (added ?? {})
- `src/v2/services/worldData/__tests__/storage.test.ts` (updated test)
- `src/v2/services/worldData/__tests__/integration.test.ts` (removed test case)

---

*Generated: 2026-01-05*
