# VO₂ Breathe PWA v7.8

Fix:
- v7.7 accidentally pinned the Soft Wave with `transform: scale(.82) !important`.
- That CSS rule overrode the JavaScript requestAnimationFrame scaling.
- v7.8 removes that override so the Soft Wave can animate again.
- Keeps the approved v7.7 Soft Wave design and the larger 82% -> 114% breathing range.
- All other interactions remain unchanged.
