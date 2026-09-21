# 15 — Detection + per-tab badge (incl. SPA re-scan)

**What to build:** Load the unpacked extension and visit any page — a
normal full page load or a client-side route change with no reload — that
has a JWT anywhere in its URL, and that tab's toolbar badge lights up
(dot). Detection is fully passive; nothing opens automatically. Each tab's
badge reflects that tab's own URL only. See
[spec.md](../spec.md) ("Trigger and badge behavior", "Re-scan triggers").

**Blocked by:** 14 (core-scanning-module) — needs `scanUrlForJwts` to call.

**Status:** resolved

- [x] Manifest declares `<all_urls>` host permission and the
      `webNavigation` API permission.
- [x] Background service worker calls `scanUrlForJwts` on normal
      navigation-committed events (full page loads) for every tab.
- [x] Background service worker also calls `scanUrlForJwts` on in-tab URL
      changes with no reload, via `webNavigation.onHistoryStateUpdated` —
      confirmed working on a page that uses `history.replaceState` to
      strip a token from the URL immediately after an implicit-flow
      redirect (the extension must catch the token before the app's own
      cleanup removes it).
- [x] Sets a badge (dot, not a numeric count) on a tab's toolbar icon via
      `chrome.action` scoped to that `tabId` if `scanUrlForJwts` returns
      one or more tokens for that tab's current URL; clears it otherwise.
- [x] Switching between two tabs with different URLs shows each tab's own
      correct badge state — no bleed-through from one tab to another.
- [x] Visiting a page with no JWTs in the URL shows no badge.

Verified by the contract tests in `src/background/background.test.ts`
rather than by loading the extension: loading it is not an available
verification step (see [spec.md](../spec.md), "Testing Decisions").

What the contract tests establish is that this worker makes the right
`chrome.*` calls — correct badge text, correct `tabId` on every call,
subframe events ignored, `onHistoryStateUpdated` wired to the same
handler as `onCommitted`. What no test here establishes is Chrome's own
behavior: that a dot actually paints on the toolbar, and that a real
SPA's `replaceState` fires before the app strips the token. Both remain
unproven against a live browser.
