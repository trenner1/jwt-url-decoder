# Research: chrome.sidePanel Per-Tab Behavior

## Q1: Can `chrome.sidePanel` show different content per tab via `setOptions({tabId, path, enabled})`, so switching tabs shows that tab's own panel content rather than one global panel state?

**Answer:** Yes. `sidePanel.setOptions()` takes an optional `tabId`; when provided, the options apply only to that tab, creating a tab-specific panel instance that is distinct from the global/default panel. When `tabId` is omitted, the options instead change the *default* behavior applied to any tab that doesn't have its own tab-specific settings.

- The `PanelOptions.tabId` field is documented as: "If specified, the side panel options will only apply to the tab with this id. If omitted, these options set the default behavior (used for any tab that doesn't have specific settings). Note: if the same path is set for this tabId and the default tabId, then the panel for this tabId will be a different instance than the panel for the default tabId." — [chrome.sidePanel API reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), `setOptions`/`PanelOptions` section.
- The official "Site-specific side panel" example on the same reference page enables/disables and points a *specific tab* at its own panel path by always passing `tabId` into `setOptions()`, driven off `chrome.tabs.onUpdated`:
  ```javascript
  chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    if (!tab.url) return;
    const url = new URL(tab.url);
    if (url.origin === GOOGLE_ORIGIN) {
      await chrome.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: true });
    } else {
      await chrome.sidePanel.setOptions({ tabId, enabled: false });
    }
  });
  ```
  — [chrome.sidePanel API reference, "Site-specific side panel" example](https://developer.chrome.com/docs/extensions/reference/api/sidePanel).
- `getOptions()` mirrors this: it also accepts an optional `tabId`, and "if omitted, returns the default options" — confirming the same global-vs-per-tab split for reads as for writes. — [chrome.sidePanel API reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), `getOptions` section.
- Chromium's own implementation confirms this at the code level: `SidePanelGetOptionsFunction::RunFunction()` converts the request's `tab_id` into `std::optional<int>`, defaulting to `std::nullopt` (i.e. "no tab" / default/global options) when the caller omits it — [`chrome/browser/extensions/api/side_panel/side_panel_api.cc`](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/extensions/api/side_panel/side_panel_api.cc). The presence of separate per-tab and per-window/global code paths in this same file (distinct handling for a tab-scoped open vs. a window-scoped/global open) mirrors the tabId-vs-default split described in the public docs.

This directly confirms the architecture assumption in [issue 10](../issues/10-slideout-mechanism-sidepanel.md): the extension can call `sidePanel.setOptions({ tabId, path, enabled: true })` per tab (e.g. once JWTs are found on that tab) so each tab's panel shows that tab's own decoded results, while tabs with no tokens found can have `enabled: false` set for their tabId and fall back to no panel or a default "nothing found" page.

## Q2: Does `sidePanel.open()` require a user gesture / must it be called synchronously from within a click listener, or can it be invoked from a background service worker asynchronously after the gesture?

**Answer:** `sidePanel.open()` requires an active user gesture at the moment it is called — the doc states it plainly, and the Chromium implementation enforces it as a hard runtime check that raises a specific error if it's missing. It does not have to be the extension's `action.onClicked` specifically (any listener callback carrying an active user gesture qualifies, e.g. a context-menu click), but a service worker cannot call it "whenever it wants" out of nowhere — it must be invoked while the browser still considers a user gesture active for that call.

- The reference doc states directly: `sidePanel.open()` "Opens the side panel for the extension. This may only be called in response to a user action." — [chrome.sidePanel API reference, `open()` method](https://developer.chrome.com/docs/extensions/reference/api/sidePanel). `open()` itself is available from **Chrome 116+** (the base `sidePanel` namespace is Chrome 114+) per the same reference page's per-member availability notices.
- Chromium's implementation shows this is an explicit, enforced check, not just documentation guidance. `SidePanelOpenFunction::RunFunction()` contains:
  ```cpp
  if (!user_gesture()) {
    return RespondNow(
      Error("`sidePanel.open()` may only be called in "
            "response to a user gesture."));
  }
  ```
  — [`chrome/browser/extensions/api/side_panel/side_panel_api.cc`](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/extensions/api/side_panel/side_panel_api.cc). `user_gesture()` reflects the `ExtensionFunction`'s recorded gesture state for that specific invocation (extension API calls carry a gesture flag propagated from the originating user-initiated event), not merely "was the extension recently clicked."
- The `action.onClicked` event itself is documented only as "Fired when an action icon is clicked. This event will not fire if the action has a popup," with no explicit statement in the doc about gesture propagation into async chains — [chrome.action API reference, `onClicked` event](https://developer.chrome.com/docs/extensions/reference/api/action). Because the docs don't spell out how long/how far the gesture flag survives through `await`s or `runtime.sendMessage` hops, and the Chromium check is a boolean `user_gesture()` evaluated at call time, the safe reading — consistent with both primary sources — is: call `sidePanel.open()` as early and directly as possible inside the gesture-bearing listener (e.g. the first line of `action.onClicked`'s callback, or a context-menu `onClicked` callback), rather than after unrelated async work, deferred timers, or a message round-trip through content scripts.
- Practical implication for this extension: because there is no default popup and the panel is opened on the toolbar-icon click (per [issue 03](../issues/03-trigger-badge-click.md)), `chrome.action.onClicked.addListener` is a valid gesture-bearing entry point per the doc's "in response to a user action" requirement, and `sidePanel.open({ tabId })` should be the first call made in that listener.

## Q3: Does the panel automatically close, hide, or reset content when the user switches to a different tab? Does the extension need to listen for `tabs.onActivated` to keep panel content in sync?

**Answer:** The panel does not "reset content" on tab switch by itself in the sense of clearing extension state, but its *visibility* does change automatically based on per-tab `enabled` state, and its *content* only follows the newly active tab if the extension has set that tab's `path`/`enabled` options ahead of time (typically via `tabs.onActivated`, `tabs.onUpdated`, or proactively whenever a tab's scan results change). The panel is not inherently "per-tab aware" on its own — the extension is responsible for keeping tab-specific options in sync.

- The manifest/overview doc states the panel "remains open when navigating between tabs, if set to do so," and can be "available only on specific websites" — [Create a side panel guide](https://developer.chrome.com/docs/extensions/develop/ui/create-a-side-panel). This confirms persistence-across-tabs is a configurable behavior, not automatic content-per-tab switching.
- The reference doc's own "Switch to a different panel" example shows the intended pattern is exactly `tabs.onActivated`-driven re-sync: it sets a default ("welcome") panel on install, then on every tab activation checks the *current* options for that tab via `getOptions({ tabId })` and swaps `setOptions()` to a different path if needed:
  ```javascript
  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const { path } = await chrome.sidePanel.getOptions({ tabId });
    if (path === welcomePage) {
      chrome.sidePanel.setOptions({ path: mainPage });
    }
  });
  ```
  — [chrome.sidePanel API reference, "Switch to a different panel" example](https://developer.chrome.com/docs/extensions/reference/api/sidePanel). This is the closest official confirmation that the extension — not the browser — owns keeping panel content aligned with the active tab, and that `tabs.onActivated` is the documented mechanism to do it.
- `tabs.onActivated` itself is documented as: "Fires when the active tab in a window changes. Note that the tab's URL may not be set at the time this event fired, but you can listen to onUpdated events so as to be notified when a URL is set," delivering `{ tabId, windowId }` — [chrome.tabs API reference, `onActivated` event](https://developer.chrome.com/docs/extensions/reference/api/tabs).
- The `OpenOptions.tabId` semantics also matter for what happens on switch: "If the corresponding tab has a tab-specific side panel, the panel will only be open for that tab. If there is not a tab-specific panel, the global panel will be open in the specified tab and any other tabs without a currently-open tab-specific panel." — [chrome.sidePanel API reference, `open()`/`OpenOptions` section](https://developer.chrome.com/docs/extensions/reference/api/sidePanel). In other words: if a tab has never had `setOptions({tabId, ...})` called for it, activating that tab falls back to whatever the *global* default panel/options are (which could be a different tab's leftover global state), rather than automatically showing "no results."
- Visibility does change automatically in one specific case: a tab whose `enabled` is `false` will not show the panel when it becomes active — "When a user temporarily switches to a tab where the side panel is not enabled, the side panel will be hidden." — [chrome.sidePanel API reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel).
- Practical implication for this extension: yes, it needs `tabs.onActivated` (and/or the existing `webNavigation`/scan hooks per [issue 08](../issues/08-spa-navigation-rescan.md)) to call `sidePanel.setOptions({ tabId, path, enabled })` per tab as soon as that tab's scan results are known, and to explicitly set `enabled: false` (or point at an empty-state path) for tabs with no found tokens — otherwise switching to a token-free tab could show stale global panel state left over from a different tab.

## Q4: What manifest fields/permissions are required, and what's the minimum Chrome version?

**Answer:** Two manifest additions are required — the `"sidePanel"` permission string, and a `"side_panel"` manifest key with a `default_path` — plus MV3. The API is available from **Chrome 114+**; specific newer members (`open()`, `onOpened`, `onClosed`, `close()`) require later versions.

- Permission: "To use the Side Panel API, add the `"sidePanel"` permission in the extension manifest file" — [chrome.sidePanel API reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel).
- Manifest key: the `side_panel` manifest key is described as "Identifies an HTML file to display in a [sidePanel]," with the `default_path` sub-field pointing at the extension's side panel HTML page — [Manifest file format reference, `side_panel` key](https://developer.chrome.com/docs/extensions/reference/manifest). Example from the docs:
  ```json
  {
    "side_panel": {
      "default_path": "sidepanel.html"
    },
    "permissions": ["sidePanel"]
  }
  ```
  — [chrome.sidePanel API reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel).
- Version/availability: the reference page's top-of-page availability banner reads "Chrome 114+ MV3+" for the `sidePanel` namespace overall — [chrome.sidePanel API reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel). Individual members are versioned separately on the same page: `open()` requires **Chrome 116+**, `onOpened` requires **Chrome 141+**, `onClosed` and `close()` require **Chrome 142+** — [chrome.sidePanel API reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel). `setOptions()` and `getOptions()` are covered by the base 114+ availability since no later per-member version is called out for them on the reference page.
- No additional host permissions are implied by the Side Panel API itself; the extension's existing `<all_urls>` host permission (per [issue 07](../issues/07-permissions-all-urls.md)) is unrelated to `sidePanel` and remains driven by the badge-detection requirement, not by side-panel display.

## Sources

- [chrome.sidePanel API reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) — `setOptions`, `getOptions`, `open`, `PanelOptions.tabId`, `OpenOptions.tabId`, Availability banner, "Site-specific side panel" example, "Switch to a different panel" example, Permissions section, manifest example.
- [chrome.action API reference — `onClicked` event](https://developer.chrome.com/docs/extensions/reference/api/action)
- [chrome.tabs API reference — `onActivated` event](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [Create a side panel — Chrome for Developers guide](https://developer.chrome.com/docs/extensions/develop/ui/create-a-side-panel)
- [Manifest file format reference — `side_panel` key](https://developer.chrome.com/docs/extensions/reference/manifest)
- [Chromium source: `chrome/browser/extensions/api/side_panel/side_panel_api.cc`](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/extensions/api/side_panel/side_panel_api.cc) — `SidePanelOpenFunction::RunFunction()` user-gesture check, `SidePanelGetOptionsFunction::RunFunction()` tabId-to-`std::optional<int>` handling.
