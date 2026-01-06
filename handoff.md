# Handoff Document

## Most Recent Work (2026-01-06)

### Always-On Planning Mode - Transparent Production Planning

**Context:**
Refactored the planning mode concept to be always-on and transparent. Users no longer need to toggle planning mode - all manual changes automatically count as "planned production", while only API imports update "current production".

**Changes Made:**

1. **Planning Mode is Now Always Active (Transparent)**
   - No toggle button needed - planning mode runs in the background
   - All manual edits (tech levels, buildings, recipes) automatically affect "planned production"
   - Only API imports via "Refresh" buttons update "current production"
   - Users see side-by-side comparison: Current (from API) vs Planned (their workspace)

2. **Technology Panel Improvements**
   - **Current Tech Level**: Display-only text (no inputs) - shows API data
     - Format: "Current: 5" with bonus display
   - **Planned Tech Level**: Editable input - your working state
     - Highlights with blue border when different from current
     - Format: Input field with bonus display
   - **Manual Refresh Button**: Added next to "Company data last updated"
     - Calls same sync function as Config > API Sync Status > Company Data
     - Shows refresh icon (🔄) and loading state (⏳)
     - Timestamp syncs across both locations

3. **Code Simplification**
   - Removed complex isPlanningActive conditionals
   - Simplified state management - planned state is the default workspace
   - Current state is read-only snapshot from API
   - Planning state types already include `startingBonus` field

**Technical Details:**
- `current.technology` = Read-only from API (via `useWorldData().current`)
- `state.value.levels` = Editable planned levels (via `usePlayerTechnology()`)
- `refreshEntry('company')` = Manually triggers Company Data sync
- Planning mode state management stays in `worldData` for future features

**Testing:**
- ✅ Type-check passes
- ✅ Application runs on http://localhost:5173
- ✅ Current levels display correctly (text only)
- ✅ Planned levels editable with blue highlight when changed
- ✅ Refresh button triggers company data sync

**Git:**
- Branch: `71-planning-mode`
- Commits:
  - `ad95b8e` - "feat: implement planning mode for technology levels"
  - `aaa742b` - "refactor: make planning mode always-on and transparent"
- Status: Committed and pushed to remote

---

## Previous Work Summary

### Base Summary Enhancements (2026-01-06)
- Created `baseSummaryMetrics.ts` service for calculation logic
- Removed Export Net Profit price trend (shared same costs as Net Profit)
- Extracted business logic from view components
- Simplified BaseSummaryCard from ~245 to ~160 lines

### Technology Names in Production (2026-01-06)
- Added specialization names to recipe requirements
- Shows "Metallurgy require technology level 1" instead of just "require technology level 1"

### Workforce Productivity Warnings (2026-01-05)
- Added warnings with lost profit calculations
- Extracted logic to `lostProfit.ts` service

---

## Architecture Patterns Used

### Always-On Planning Mode Pattern
- Planning state is the default workspace (what users edit)
- Current state is read-only baseline from API
- No mode switching needed - transparent to user
- Future: Can add undo/redo, change tracking, etc.

### Service Layer Pattern
- Business logic in service modules
- View components focus on presentation
- Pure, testable functions

### Repository Pattern
- Configuration via dedicated services
- Single source of truth for data access

---

## Next Steps / Open Tasks

### Remaining Planning Mode Work
1. **PlayerConfigPanel Integration**
   - Use current vs planned state for base calculations
   - Pass correct state to child components
   
2. **Side-by-Side Views in ConfiguredBase**
   - Show Materials Balance: Current | Planned
   - Show Worker Consumption: Current | Planned
   - Calculate both production states simultaneously

3. **Building & Recipe Changes**
   - Ensure building/recipe edits update planned state
   - Keep current state untouched except via API sync

### Future Enhancements
- Add change indicators (e.g., badge showing "3 changes from current")
- Consider adding undo/redo functionality
- Tooltips explaining Current vs Planned

