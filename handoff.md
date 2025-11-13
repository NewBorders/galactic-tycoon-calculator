Summary of recent changes (Nov 13, 2025) — COMPLETED

Summary of recent changes (Nov 13, 2025) — Number formatting improvements

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
