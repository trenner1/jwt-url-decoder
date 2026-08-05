Type: research
Status: resolved

## Question

Does Chrome's Side Panel API (`chrome.sidePanel`, Manifest V3, Chrome 114+)
support the per-tab behavior this extension's architecture assumes? This
ticket exists because
[slideout-mechanism-sidepanel](10-slideout-mechanism-sidepanel.md) locked
in the Side Panel API as the slide-out mechanism, but its per-tab
behavior needs to be confirmed against primary sources before the spec can
state the architecture with confidence.

Specifically confirm, citing official Chrome extension docs / source:

- Can panel content differ per tab (via `sidePanel.setOptions({tabId,
  path, enabled})`), so switching tabs shows that tab's own found tokens
  rather than a single global panel state?
- Does `sidePanel.open()` require a user gesture (e.g. must be called
  directly from an `action.onClicked` listener), or can it be called from
  a background service worker asynchronously after that gesture?
- Does the panel automatically close, hide, or reset when the user
  switches to a different tab, and if so, does the extension need to
  re-sync content on `tabs.onActivated`?
- Minimum Chrome version and required manifest fields/permissions
  (`"sidePanel"` permission, `default_path`, etc.) for the behavior above.

## Answer

Confirmed against official Chrome docs and Chromium source: the Side Panel
API supports everything the architecture assumes. `sidePanel.setOptions({
tabId, path, enabled })` creates a genuinely separate per-tab panel instance
(omitting `tabId` only changes the global default), so each tab can show
its own decoded tokens. `sidePanel.open()` does require an active user
gesture — Chromium enforces this with a hard `user_gesture()` check, not
just doc guidance — so it must be called as early as possible inside a
gesture-bearing listener like `action.onClicked`, not after async work.
The panel does not auto-sync content on tab switch; the extension must
listen for `tabs.onActivated` (per the official "Switch to a different
panel" example) to re-apply the correct per-tab options, otherwise a
newly-active tab can show stale global state. Manifest requirements are
the `"sidePanel"` permission plus a `"side_panel": { "default_path": ... }`
key; the base API needs Chrome 114+, with `open()` requiring 116+. Full
findings with citations: [research/sidepanel-per-tab-behavior.md](research/sidepanel-per-tab-behavior.md).
