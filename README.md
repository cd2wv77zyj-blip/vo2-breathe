# VO₂ Breathe — PWA v3

## New in v3
- Uses the exact user-selected VO₂ app icon
- Apple Health connection is prompted from onboarding and Today
- Data model now treats Apple Health as the preferred future source
- If Apple Health supplies VO₂ max, the app will not ask for a manual baseline
- Apple Watch live-session UI is scaffolded for heart rate
- Post-session HRV display is scaffolded for the native HealthKit build
- Stronger, explicitly unlocked Web Audio phase cues
- Inhale haptic feature detection in the PWA; full iPhone/Watch haptics are reserved for the native build
- Existing v2 local data migrates forward

## Platform note
A PWA cannot request HealthKit authorization. The Connect Apple Health controls in this build preview the native onboarding flow and explain that limitation. The later iOS build will replace the stub with real HealthKit authorization.

Apple Watch heart rate can be collected at high frequency during an active native HKWorkoutSession. Respiratory rate and HRV are HealthKit data types, but should not be presented as guaranteed real-time breathing-session measurements. The native app will query available post-session HRV data and show it when present.
