# Development Handoff

## Recent Work: Price Alerts Feature (Issue #34) - COMPLETED ✅

### Summary
Comprehensive Price Alerts system fully implemented with all requested features and UI improvements.

### What Was Completed

#### 1. Service Layer (`src/v2/services/priceAlerts/`)
- ✅ **types.ts**: Type definitions for AlertType, AlertStatus, PriceAlert interface
- ✅ **storage.ts**: LocalStorage persistence with world-specific keys (g1/g2)
- ✅ **alertManager.ts**: Core composable with:
  - CRUD operations (addAlert, removeAlert, toggleMute, resetAlert, getAlert)
  - Alert checking logic (checkAlerts)
  - Notification system (sound + browser notifications)
  - Auto-creation for low-stock materials
  - Sortable alerts
- ✅ **index.ts**: Public exports

#### 2. UI Components
- ✅ **PriceAlertsPanel.vue** (`src/v2/pages/price-alerts/`):
  - Top-level tab for managing all alerts
  - Stats dashboard (Total, Active, Triggered, Muted)
  - Searchable, sortable table
  - Row highlighting (green for buy alerts below target, orange for sell alerts above target)
  - Actions: Mute/Unmute, Reset, Delete
  - **NEW**: Material selector dropdown to create alerts for any material
  - **NEW**: Click on alert rows to edit them
  - **NEW**: Shared refresh timer with countdown (same as in Bases tab)
  - **NEW**: Refresh button with loading state
  
- ✅ **AlertOverlay.vue** (`src/v2/components/`):
  - Modal popup for quick alert creation/editing
  - Shows current & average prices
  - Toggle between Buy/Sell types
  - Target price input
  - Lists existing alerts with inline delete
  - Teleport to body for proper z-index

#### 3. Material Balance Integration
- ✅ **Bell Icons**: 🔔 icon integrated into "Unit Price" column
- ✅ **Conditional Styling**:
  - Blue bell (🔔💰) for existing buy alerts
  - Orange bell (🔔📈) for existing sell alerts
  - Gray bell for no alerts
- ✅ **Click to Create**: Bell icon opens AlertOverlay with current/average prices

#### 4. Localizations
- ✅ English and German translations for all Price Alerts UI elements in `messages.ts`
- ✅ Added `priceAlertsDescription` translation

#### 5. App Integration
- ✅ Added "Price Alerts" tab to AppV2.vue navigation (between Market and Config)
- ✅ Imported and conditionally rendered PriceAlertsPanel
- ✅ **Market Analysis Integration**: Alert checking runs every 5 minutes during auto-refresh
- ✅ **Auto-Alert Creation**: Automatically creates/unmutes buy alerts when stock coverage < timeframe threshold

#### 6. Price System Enhancement
- ✅ Added `getMarketEntry` helper to `useMaterialPricing` for accessing current/average prices
- ✅ Price format unified: all prices in dollars (not cents)

#### 7. UI/UX Improvements
- ✅ **Smart Row Highlighting**: 
  - Buy alerts highlight green when current price ≤ target (good deal!)
  - Sell alerts highlight orange when current price ≥ target (good time to sell!)
  - Works immediately on creation, not just when triggered
- ✅ **Unified Refresh Timer**: Price refresh timer shared between Bases and Price Alerts tabs
- ✅ **Material Selector**: Dropdown in Price Alerts tab to create alerts for any material
- ✅ **Click to Edit**: Click any alert row to open edit overlay

### What Still Needs To Be Done

#### Optional Enhancements
1. **Sound Files**:
   - Add actual `alert-buy.mp3` and `alert-sell.mp3` to `public/sounds/`
   - Currently only README with suggestions exists
   - System will fail silently without sounds (no crash)

2. **Testing**:
   - Integration tests for alert workflow
   - Test alert persistence across world switches
   - Test browser notification permissions
   - Test auto-alert creation with low stock scenarios
   - Test Market Analysis alert checking

3. **Refinements**:
   - Add "last triggered" timestamp display in PriceAlertsPanel
   - Consider adding bulk operations (delete all, mute all)
   - Add export/import functionality for alerts
   - Add badge counter on bell icons showing number of alerts per material

### Technical Notes

- **Module Imports**: Use direct imports (`../../services/priceAlerts/alertManager`) instead of barrel exports for TypeScript compatibility
- **Price Format**: All prices stored in dollars (not cents), unlike some other parts of the app
- **World-Specific Storage**: Alert storage keys include world (g1/g2) to prevent confusion
- **Alert Logic**:
  - Buy alerts trigger when current price ≤ target
  - Sell alerts trigger when current price ≥ target
  - Triggered alerts stay triggered until manually reset
  - Muted alerts don't trigger notifications but keep tracking
- **Auto-Alert Behavior**:
  - Watches material balance for negative-balance materials
  - Creates buy alert when `(daysCoverage * 24) < timeframeHours`
  - Uses average price as target
  - Unmutes existing alert if already present
- **Smart Highlighting**:
  - Row highlighting is condition-based, not status-based
  - Green = buy opportunity (price at or below target)
  - Orange = sell opportunity (price at or above target)
  - Works for both triggered and non-triggered alerts

### Files Modified/Created
- `src/v2/AppV2.vue` - Added alerts tab
- `src/v2/services/priceAlerts/*` - New service layer (4 files)
- `src/v2/services/gamedata/prices.ts` - Added getMarketEntry helper
- `src/v2/pages/price-alerts/PriceAlertsPanel.vue` - New panel with material selector, edit-on-click, shared refresh timer
- `src/v2/pages/market/MarketAnalysisPanel.vue` - Added alert checking to auto-refresh
- `src/v2/pages/player-config/components/SummaryCalculationsSection.vue` - Bell icons in unit price column, conditional styling, auto-alert creation
- `src/v2/components/AlertOverlay.vue` - New modal component
- `src/v2/localisation/messages.ts` - Added translations
- `public/sounds/README.md` - Documentation for sound files

### Testing Commands
```bash
# Type check (✅ passing)
docker compose exec web npm run type-check

# Lint
docker compose exec web npm run lint

# Dev server
docker compose exec web npm run dev

# Integration tests (when added)
docker compose exec web npm run test
```

### How to Test the Feature
1. Start dev server: `docker compose up` and `docker compose exec web npm run dev`
2. Open http://localhost:5173/v2/ in browser

**In Bases Tab:**
3. Navigate to "Player Config" tab and configure a base
4. Look at Material Balance table - bell icons are in "Unit Price" column
5. Icons show different colors/symbols:
   - Gray 🔔 = no alert
   - Blue 🔔💰 = buy alert exists
   - Orange 🔔📈 = sell alert exists
6. Click bell icon to create/edit alert
7. Watch for green/orange row highlighting based on current vs target price

**In Price Alerts Tab:**
8. Navigate to "🔔 Price Alerts" tab
9. See refresh countdown timer (same as Bases tab)
10. Use material dropdown to create alert for any material
11. Click any alert row to edit it
12. Watch rows turn green (buy alert below target) or orange (sell alert above target)
13. Test sorting, search, mute, reset, delete actions

**Auto-Alerts:**
14. Set low stock with high consumption in Bases
15. Watch for auto-created buy alerts in Price Alerts tab

### Completed Improvements (Latest Session)
- ✅ Shared refresh timer between Bases and Price Alerts tabs (no duplication)
- ✅ Bell icons moved to "Unit Price" column instead of separate column
- ✅ Conditional bell icon styling (blue for buy, orange for sell, gray for none)
- ✅ Material selector in Price Alerts tab to create alerts for any material
- ✅ Click alert rows to edit them
- ✅ Smart row highlighting: green for buy opportunities, orange for sell opportunities
- ✅ Highlighting works immediately on creation, not just when triggered

### Next Steps
1. Add actual sound files (optional, see public/sounds/README.md)
2. Add integration tests
3. Consider adding badge counters on bell icons
4. Consider adding bulk operations
