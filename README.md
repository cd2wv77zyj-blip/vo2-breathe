# VO₂ Breathe PWA v8.0

Major Breathe-tab stabilization release.

## Rebuilt from the stable v7.12 breathing player
v8.0 intentionally uses the known-good v7.12 Soft Wave SVG and animation engine rather than patching the broken v7.13 detail player.

## Library
- Recover: green heart
- Perform: blue minimalist running person
- Focus: purple dartboard
- Train / Advanced: orange two-peaked mountains
- All 11 protocols are present, including BOLT Reset and Hypoxic Tolerance.

## Navigation
- Breathe opens to the category-organized library.
- Protocol rows open a detail/player screen.
- Back button reliably returns to the library.
- Main-tab swipe navigation works from the library, including when the gesture begins on a protocol row.
- Train and Today breath prescriptions deep-link directly into the selected exercise.

## Player fixes
- Exact v7.12 Soft Wave geometry restored.
- Smooth 82% → 114% inhale/exhale animation restored.
- Category colors tint the original Soft Wave without replacing its geometry.
- Recovery 5.5 displays 5.5 seconds rather than rounding to 6.
- Phase cards are protocol-specific.
- Session metadata is protocol-specific.
- Pause now actually pauses; Resume continues the same phase/session.
- HR and HRV cards are locked to a stable two-column layout.

## Existing behavior preserved
- 11-protocol science/fitness library from v7.12.
- 4–8 week training plans and breathing prescriptions.
- Today widget reordering.
- Forest Nebula icon.
- Settings / first-launch behavior.
- Main-tab swipe architecture.
