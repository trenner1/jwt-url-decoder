# 16 — Side Panel opens per-tab with minimal decoded view

**What to build:** Clicking the toolbar icon on a token-bearing tab opens
Chrome's Side Panel, scoped correctly to that tab, showing the raw decoded
header/payload JSON for the token(s) found on that tab's current URL.
This ticket is about getting the Chrome per-tab/gesture mechanics right —
not the visual design, which is ticket 17. See
[spec.md](../spec.md) ("Side Panel architecture and per-tab behavior") and
[research/sidepanel-per-tab-behavior.md](../research/sidepanel-per-tab-behavior.md)
for the confirmed API behavior this implements.

**Blocked by:** 15 (detection-badge-spa-rescan) — needs per-tab detection
already working to know when/what to show.

**Status:** resolved

- [x] Manifest declares the `sidePanel` permission and a
      `"side_panel": {"default_path": ...}` key.
- [x] Background worker calls `sidePanel.setOptions({tabId, path,
      enabled})` per tab (not the global default) so each tab has a
      genuinely separate panel state.
- [x] `sidePanel.open()` is called as the first statement inside the
      `action.onClicked` listener — never after an `await` — since Chrome
      enforces the active-user-gesture requirement.
- [x] The panel itself calls `scanUrlForJwts` on the active tab's current
      URL (via `chrome.tabs.query`) to derive what it shows — it does not
      receive token data via message-passing from the background worker.
- [x] Background worker listens for `tabs.onActivated` and re-applies the
      newly active tab's `sidePanel` options, so switching tabs while the
      panel is open shows that tab's own tokens, not a stale previous
      tab's.
- [x] Verified manually: two tabs each with a different token in the URL,
      panel open, switching between them shows each tab's own decoded
      token, not the other's.

The panel re-renders on `tabs.onActivated`/`tabs.onUpdated` rather than
relying on a fresh document load: a global panel is one document shared by
every tab in the window, and tab-scoped entries support view caching, so a
reload on tab switch is not guaranteed.

The last box is covered by the contract tests in
`src/background/background.test.ts` plus the headless panel render, not by
loading the extension — see [spec.md](../spec.md), "Testing Decisions".
Those establish that each tab gets its own `sidePanel.setOptions({tabId,
…})`, that `sidePanel.open()` is the first call in the click handler, and
that the panel derives its content from whichever tab is active. They do
not establish that Chrome grants the gesture or genuinely isolates two
live panels; that remains unproven against a real browser.
