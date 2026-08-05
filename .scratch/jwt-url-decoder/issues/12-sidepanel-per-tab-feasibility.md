Type: research
Status: claimed

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
