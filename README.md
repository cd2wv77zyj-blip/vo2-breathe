# VO₂ Breathe PWA v8.0.4

Field-test hotfix:
- Fixes the Rockport and 1.5-mile result error caused by obsolete Breathe-carousel DOM references.
- `renderProtocols()` now safely checks optional v8 elements before writing to them.
- Results are labeled "Field-test VO₂ estimate" to distinguish them from Apple Health cardio-fitness estimates.
- Rockport instructions emphasize that the protocol must be an exact brisk 1-mile walk.
- No formula changes were made: the published Rockport and 1.5-mile equations remain intact.
- No tab-swipe work was attempted in this build.
