# VO₂ Breathe PWA v8.0.2

Tab-swipe hotfix.

- Replaces the prior screen-level swipe recognizer with a document-level recognizer.
- Horizontal gestures are captured before nested library rows / scroll containers can swallow them.
- A swipe must move at least 55 px and be clearly more horizontal than vertical before changing tabs.
- Once the gesture is clearly horizontal, page scrolling is suppressed for the remainder of that gesture.
- The Breathe protocol detail deck keeps its own internal swipe handling.
- Bottom navigation remains tap-first.
- Breathe Home behavior from v8.0.1 is unchanged.
- No protocol, timing, Soft Wave, training-plan, category, or sensor-layout changes.
