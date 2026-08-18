# VO₂ Breathe — PWA v2

This is the second development build of VO₂ Breathe.

## New in v2
- Personal profile / onboarding
- Persistent VO₂ milestone history
- Workout logging and history
- 1.5-mile run and Rockport field-test calculators
- Adaptive 4-week training plan with completion tracking
- Five guided breathing protocols
- Drift-resistant breathing timer and animation
- Optional Web Audio phase cues
- Screen Wake Lock where the browser supports it
- Breathing session history and weekly consistency
- Optional comfortable-exhale-pause tracking
- Progress dashboard
- Offline PWA shell
- iPhone Home Screen PNG icon
- Migration of the original prototype's saved VO₂ value when available

## Update your GitHub Pages site
Replace the files in the root of `vo2-breathe` with the files in this package.

GitHub Pages is already configured, so after the commit the existing site URL should refresh automatically.

If your installed Home Screen copy appears stale, open the site once in Safari, refresh, and then reopen the Home Screen app.

## Data
This development build stores profile and fitness data in browser localStorage on the device. It does not send health data to a server.

Native Apple Health / HealthKit sync will be part of the later iOS build.

## Health positioning
Field-test VO₂ results are estimates. Breathing protocols are designed for control/recovery/performance support. The app does not claim breathing exercises alone will increase VO₂ max.
