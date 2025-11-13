Summary of recent changes (Nov 13, 2025) — COMPLETED

Goal
- Support producing the same recipe multiple times (queue multiplicity). This makes "queue time share" and runs reflect when you produce a recipe more than once in the queue (e.g., 2× Iron + 1× Glass).
- Implement UI controls so users can adjust recipe counts and see live calculations.
- Add comprehensive integration tests validating the queue calculations.
- Ensure code quality with TypeScript type-checks and refinements.

What I changed

1. Engine & types
   - `BaseAssignment.recipes` now supports `{ recipeId: number; count?: number }`.
   - `computeBaseReport` in `src/v2/services/production/engine.ts` now:
     * Respects `selection.count` and duplicates each recipe entry per count in the internal queue.
     * Aggregates identical recipes and multiplies `queueShare` by `count` so queue contributions reflect multiplicity.
     * Example: 2× Iron + 1× Glass produces 150+60=210min total queue, so Iron queueShare = 150/210 ≈ 0.7143.

2. Player state & API (`src/v2/services/playerBases.ts`)
   - `PlayerRecipe` now has optional `count` (default 1).
   - State hydration ensures counts are numeric and ≥ 1.
   - `addRecipe(baseId, recipeId)` now increments `count` when recipe already exists (previously prevented duplicates).
   - New API: `setRecipeCount(baseId, recipeInstanceId, count)` to set/remove (count=0 removes) recipes.

3. UI Components
   - **ProductionSection.vue**: Maps `count` into assignment, emits `updateRecipe`, allows repeated clicking to increment count.
   - **RecipeTile.vue**: 
     * Shows count controls (− / input / +) with tooltips and labels.
     * Input accepts manual entry; buttons support quick increment/decrement.
     * Displays "×N in queue" badge.
     * Improved styling: hover effects, transitions, semantic HTML.
   - **ConfiguredBase.vue**: Forwards `updateRecipe` events and persists.
   - **PlayerConfigPanel.vue**: Includes `setRecipeCount` and handles updateRecipe → persist flow.
   - **BaseSummaryCard.vue** & **DailyCalculationsSection.vue**: Pass `count` into assignment.

4. Integration tests (`src/v2/services/production/__tests__/queue-multiplicity.test.ts`)
   - Test 1: 1× Iron + 1× Glass validates baseline queue share (0.5556 / 0.4444).
   - Test 2: 2× Iron + 1× Glass validates adjusted queue share (0.7143 / 0.2857).
   - Test 3: Verifies queue shares change correctly when recipe counts change.
   - All 3 tests pass ✓

5. Dev tooling
   - Added vitest + @vitest/ui + jsdom for test execution.
   - Added `npm test` and `npm test:ui` scripts.

Testing & QA
- ✓ Type-check: All modified files pass type-checking.
- ✓ Tests: 3/3 integration tests passing.
- ✓ Lint: No new lint issues introduced.
- ✓ Formula validation: Queue share calculations match wiki formula when count=1 or 2.

How to try it
1. Start dev container: `docker compose up`
2. Launch app in your usual workflow.
3. Player Config → Add a recipe → Use − / input / + to adjust count.
4. Observe live production updates reflecting queue multiplicity.
5. Run tests: `npm test` (inside container)

Files changed
- `src/v2/services/production/types.ts` — Added `count?` to BaseAssignment.recipes
- `src/v2/services/production/engine.ts` — Implemented queue multiplicity aggregation & formula
- `src/v2/services/playerBases.ts` — Added count support & setRecipeCount API
- `src/v2/pages/player-config/components/ProductionSection.vue` — Map count, emit updateRecipe
- `src/v2/pages/player-config/components/RecipeTile.vue` — Enhanced UI with count controls
- `src/v2/pages/player-config/components/ConfiguredBase.vue` — Forward updateRecipe
- `src/v2/pages/player-config/PlayerConfigPanel.vue` — Integrate setRecipeCount
- `src/v2/pages/player-config/components/BaseSummaryCard.vue` — Pass count to assignment
- `src/v2/pages/player-config/components/DailyCalculationsSection.vue` — Pass count to assignment
- `src/v2/services/production/__tests__/queue-multiplicity.test.ts` — Integration tests
- `package.json` — Added vitest scripts
- `vitest.config.ts` — Test configuration
- `handoff.md` — This summary

Notes
- The formula from the wiki is theoretical and doesn't account for productivity/workforce factors, which the engine does apply. Test expectations reflect this (queue share validates correctly, output ratios are preserved).
- All pre-existing type-check errors remain unchanged (lib target issue, not introduced by this change).
- Ready for production or further iteration!
