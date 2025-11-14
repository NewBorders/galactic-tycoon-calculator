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
