# Handoff Summary

## Recent Work
- Added configurable production weights per recipe so multiple outputs can share a building using sliders; engine now scales runs and workforce demand accordingly.
- Propagated recipe share data through state, reports, and UI (summary cards, daily calculations) and updated localisation.
- Highlighted stock coverage in red when existing stock does not cover the selected summary window.
- Corrected production engine to keep throughput unchanged when weighting queues and to pause buildings when every recipe weight is set to zero.

## Notes
- `npm run lint` currently fails because of longstanding issues in legacy `v1` files (`@typescript-eslint/no-explicit-any` and similar). No new lint errors introduced in the modified `v2` codepath.
