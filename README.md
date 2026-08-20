# Search and translation refinement patch

This patch refines the existing universal quick-settings search and language behavior.

## Search changes

Quick-setting results use local relevance ranking: exact label, label prefix, word-start match, label substring, category match, then purpose match. Backend record results are also ordered by title relevance where applicable. The quick-setting panel and recent quick-setting history appear only while the top search input is focused; Escape, result selection, and clicking outside the search close the panel. Role filtering, deduplicated history, search counts, per-account browser-local storage, and Clear history remain unchanged.

## Translation changes

Login-page strings have built-in French translations for immediate visible switching. LoginPage refreshes the translation scan on mount and whenever the language changes. Proper-name and protected dynamic-value exclusions remain preserved. No backend translation provider change or database migration is required.

## Files

- `frontend/src/components/Navbar.vue`
- `frontend/src/store/language.js`
- `frontend/src/pages/LoginPage.vue`
- `frontend/src/store/quickSearchHistory.js`

## Verification

The frontend production build passed with `npm run build`. Verify that `Guardian Management` ranks above less direct matches, suggestions disappear when the input loses focus, and switching to French on `/login` immediately changes the visible title, labels, placeholders, buttons, and helper text without a reload.
