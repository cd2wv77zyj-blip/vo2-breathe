# VO₂ Breathe — PWA v7.1 Forced Refresh

This package contains the same v7 design-spec UI, but the JavaScript and CSS filenames are changed to:
- `app-v7-1.js`
- `styles-v7-1.css`

This intentionally breaks the old PWA asset cache so iOS must request the new interface.

## Important upload step
Upload every file in this ZIP to the repository root.

You can leave the old `app.js` and `styles.css` files in the repo; this build no longer references them.

After GitHub Pages updates:
1. Open the site in Safari.
2. Reload once.
3. Close the installed Home Screen app completely.
4. Open it again.

If the Home Screen copy still shows the old interface, remove the Home Screen app and add it again from Safari. Your local browser data may be affected by deleting site data, so do not clear Safari website data unless necessary.
