Status: ready-for-agent

# Spec: JWT URL Decoder Chrome Extension

Assembled from the [JWT URL Decoder Chrome Extension map](map.md) —
all 13 decision tickets resolved. See individual tickets in `issues/` for
full rationale behind each decision referenced below.

## Problem Statement

Developers and engineers working with OAuth/SSO flows constantly encounter
JWTs embedded in URLs — in query parameters (`?token=...`), in redirect
fragments (`#access_token=...`, `#id_token=...`), and occasionally in path
segments. When one shows up, the only way to see what's actually inside it
today is to manually select the token text, copy it, and paste it into an
external decoder like jwt.io — a context switch that breaks flow, and one
that many engineers are uncomfortable doing at all when the token carries
real user PII or internal session claims they don't want leaving the
device. There's also no passive signal that a URL even contains a token
worth looking at — you only find out by noticing the token text yourself.

## Solution

A Chrome extension that passively watches the current tab's URL. The
moment it finds one or more JWTs anywhere in that URL, it lights up a
badge on the toolbar icon. Clicking the icon opens Chrome's built-in Side
Panel, showing each found token decoded and humanized — validity status,
key claims, raw JSON, and copy-to-clipboard — entirely on-device, with no
network calls and nothing ever written to persistent storage.

## User Stories

1. As a backend engineer debugging an OAuth redirect, I want to see a
   badge appear the instant a token lands in the URL, so that I don't have
   to eyeball the address bar for `eyJ...`-looking text.
2. As a frontend engineer testing an SSO integration, I want to click the
   extension icon and immediately see what's in the `id_token` without
   leaving the page, so that I can verify the right claims came back.
3. As a developer investigating an "unauthorized" bug report, I want to
   see at a glance whether the token in the URL is expired, so that I can
   rule out (or confirm) stale-token issues in seconds.
4. As an engineer working with a page that has both an `access_token` and
   an `id_token` in the fragment, I want to see both listed separately, so
   that I can inspect each on its own.
5. As an engineer inspecting a single-token page, I want the panel to jump
   straight to that token's detail view, so that I don't have to click
   through an unnecessary list of one.
6. As a security-conscious developer, I want assurance that the extension
   never sends token contents anywhere or writes them to disk, so that I
   can use it on tokens carrying real user data without worrying about
   exposure.
7. As a developer, I want to see standard claims like issuer, audience,
   and subject labeled in plain language, so that I don't have to
   remember what `iss`/`aud`/`sub` mean.
8. As a developer, I want to see a token's expiry as a relative,
   human-readable countdown ("expires in 12m" / "expired 3h ago") rather
   than a raw Unix timestamp, so that I can judge freshness instantly.
9. As a developer, I want to see the algorithm (`alg`) the token claims to
   use, so that I can spot anomalies like `alg: none` at a glance.
10. As a developer, I want the raw, pretty-printed header and payload JSON
    available below the humanized summary, so that I can check fields the
    summary doesn't surface.
11. As a developer, I want to copy the whole token to my clipboard with
    one click, so that I can paste it into a `curl` command or another
    tool.
12. As a developer, I want to copy just the header or just the payload
    JSON, so that I can share a redacted snippet without the signature.
13. As a developer, I want to see the raw signature segment displayed for
    reference, so that I can eyeball whether it's present/well-formed
    without the extension attempting (and failing) to verify it.
14. As a developer working on a single-page app that uses the OAuth
    implicit flow, I want the extension to catch the token even though the
    app immediately strips it from the URL via `history.replaceState`, so
    that I'm not racing the app's own cleanup.
15. As a developer navigating between multiple client-side routes in an
    SPA, I want the badge to update correctly as the URL changes without a
    full page reload, so that stale state doesn't linger from a previous
    route.
16. As a developer on a page with no JWTs in the URL, I want the badge to
    simply show nothing, so that the extension stays out of my way on the
    vast majority of pages I visit.
17. As a developer, I want the extension to ignore URL substrings that
    merely look like a JWT (three dot-separated base64url-ish segments)
    but aren't — e.g. hashes or session IDs — so that the badge count
    stays trustworthy.
18. As a developer switching between browser tabs that each have different
    tokens in their URLs, I want each tab's badge and panel to reflect
    that tab's own tokens, not another tab's, so that I don't misread one
    tab's session as another's.
19. As a developer, I want a visual distinction (e.g. color) between a
    valid token, one expiring soon, and an already-expired one, so that I
    can triage at a glance without reading the countdown text.
20. As a developer inspecting a token issued by an unfamiliar provider, I
    want the extension to still show me the standard claims correctly
    even without any provider-specific knowledge, so that the tool works
    uniformly regardless of issuer.
21. As a privacy-conscious user, I want to be able to reason about exactly
    what permissions the extension needs and why, so that I can decide
    whether to install it.
22. As a developer, I want the extension to work the same way on every
    site I visit without per-site setup, so that it's zero-friction to
    adopt.

## Implementation Decisions

### Core seam: `scanUrlForJwts(url)`

The entire detection pipeline is one pure function,
`scanUrlForJwts(url: string) → DecodedToken[]`, with no dependency on any
`chrome.*` API. It is the single seam both the background service worker
and the Side Panel UI call — neither re-implements any piece of matching,
decoding, or humanization independently. Its pipeline, per
[url-scope-anywhere](issues/01-url-scope-anywhere.md) and
[match-validation](issues/11-match-validation.md):

1. Regex-scan the raw URL string (not query/path/fragment parsed
   separately) for the `<base64url>.<base64url>.<base64url>` shape,
   anywhere in the string.
2. For each structural match, attempt to base64url-decode the first two
   segments to JSON. Discard the match unless both decode successfully
   **and** the header JSON contains an `alg` key — this is the
   false-positive filter that keeps the badge count trustworthy.
3. For each surviving match, compute a humanized view per
   [decode-depth-generic-claims](issues/02-decode-depth-generic-claims.md):
   `exp`/`iat`/`nbf` → absolute date + relative countdown text (e.g.
   "expires in 12m", "expired 3h ago"); `iss`/`aud`/`sub` → labeled
   plainly; `alg` → surfaced as-is. No issuer-specific claim knowledge
   (no Auth0/Firebase/Cognito-specific dictionaries) and no signature
   verification of any kind — this holds even for tokens signed with
   `alg: none` or algorithms the tool can't verify anyway.
4. Attach a `status` of `valid` / `expiring` / `expired` derived from
   `exp`, driving the color treatment in the UI (see below).

Each `DecodedToken` carries: the original raw token substring, its guessed
`type` (from the URL param name it was found under, e.g. `access_token`,
`id_token`, falling back to a generic label when the param name isn't
recognized), decoded `header`/`payload` objects, the raw `signature`
segment, and the computed `status`/relative-expiry text.

### Trigger and badge behavior

Per [trigger-badge-click](issues/03-trigger-badge-click.md): detection is
fully passive — the background service worker calls `scanUrlForJwts` on
every tab URL change (see re-scan triggers below) and sets a badge on that
tab's toolbar icon if one or more tokens are found. The Side Panel never
opens automatically; it only opens when the user clicks the extension
icon. Badge style is a **dot**, not a numeric count — the prototype
surfaced no strong preference either way (see
[panel-ui-prototype](issues/13-panel-ui-prototype.md)), and a dot is the
simpler default absent one.

### Re-scan triggers

Per [spa-navigation-rescan](issues/08-spa-navigation-rescan.md), the
background worker re-runs `scanUrlForJwts` on **both**: normal
navigation-committed events (full page loads) and in-tab URL changes with
no reload, via `webNavigation.onHistoryStateUpdated`. This is required
because implicit-flow redirects frequently land on SPA shells (Firebase
Auth, Auth0's SPA SDK, etc.) that immediately `replaceState` the URL to
strip the token — scanning only on full navigation would race that
cleanup and could miss the token.

### Side Panel architecture and per-tab behavior

Per [slideout-mechanism-sidepanel](issues/10-slideout-mechanism-sidepanel.md)
and confirmed by
[sidepanel-per-tab-feasibility](issues/12-sidepanel-per-tab-feasibility.md)
(full citations in
[research/sidepanel-per-tab-behavior.md](research/sidepanel-per-tab-behavior.md)),
the slide-out is Chrome's native Side Panel API (`chrome.sidePanel`), not
a content-script-injected overlay — this avoids any CSS/z-index collision
with arbitrary host pages and avoids injecting UI into every page visited.

Architecture implications confirmed by the research:

- The background worker calls `sidePanel.setOptions({tabId, path,
  enabled})` per tab, giving each tab a genuinely separate panel state —
  not one global panel shared across tabs.
- `sidePanel.open()` requires an active user gesture, enforced by
  Chromium itself (a hard check, not just a documentation guideline), so
  it must be called as the first statement inside the `action.onClicked`
  listener — never after any `await`.
- The panel does **not** auto-sync its content when the user switches
  tabs; the extension must listen for `tabs.onActivated` itself and
  re-apply that tab's `scanUrlForJwts` result, or a newly active tab can
  show a stale previous tab's tokens.
- Manifest requirements: `"permissions": ["sidePanel"]` plus a
  `"side_panel": {"default_path": "..."}` key. Base API needs Chrome
  114+; `open()` specifically needs Chrome 116+.
- The panel itself re-derives its content by calling `scanUrlForJwts` on
  the active tab's current URL directly (via `chrome.tabs.query`) rather
  than receiving decoded token data via message-passing from the
  background worker — there is no shared mutable state to keep in sync
  beyond the per-tab `sidePanel` options themselves, consistent with the
  no-persistence constraint below.

### Permissions

Per [permissions-all-urls](issues/07-permissions-all-urls.md): host
permission `<all_urls>`, plus the `sidePanel` and `webNavigation` API
permissions. `<all_urls>` is required because the passive badge needs to
see every tab's URL, which is incompatible with `activeTab` (grants access
only on explicit interaction) and with a user-configurable allowlist
(adds setup friction that defeats "works everywhere with no setup"). The
broad host grant is deliberately offset by the strict no-persistence,
no-network behavioral constraint below — the spec (and any Chrome Web
Store listing) should state plainly that the broad *grant* doesn't imply
broad *behavior*.

### Privacy and persistence constraint

Per [privacy-no-persistence](issues/06-privacy-no-persistence.md): this
is a locked security property, not just a default. The extension never
calls any network API, never uses `chrome.storage` (session or local) to
persist token content, and never sends telemetry. Every scan is
recomputed fresh from the current page state via `scanUrlForJwts` — there
is no cache or history of previously seen tokens anywhere.

### UI layout — list and detail views

Resolved by prototype in
[panel-ui-prototype](issues/13-panel-ui-prototype.md) (three structurally
different variants built and compared; full prototype preserved on the
throwaway `prototype/panel-ui` git branch, commit `a6a60f6`, not on
`master`). The winning layout:

- **List view** (shown when more than one token is found; skipped
  straight to detail when there's exactly one, per
  [multi-token-list-view](issues/04-multi-token-list-view.md)): each token
  rendered as a pill with a colored left border reflecting its `status`
  (green = valid, amber = expiring soon, red = expired), showing its
  guessed type label and a truncated view of the raw token. No expiry
  text in the list — that's reserved for the detail view.
- **Detail view**, top to bottom:
  1. A full-width colored status banner as the primary, first-glance
     affordance — e.g. "Valid · expires in 53m", "Expired · 1h ago" —
     colored to match the same green/amber/red status.
  2. Humanized claims (`alg`, `iss`, `aud`, `sub`) rendered as a wrapped
     row of chips, not a table or list.
  3. A single dark, terminal-styled block containing one labeled line
     each for `header ▸`, `payload ▸`, and `signature ▸` (raw,
     pretty-printed JSON for the first two; the raw signature segment for
     the third), per
     [detail-view-content](issues/05-detail-view-content.md). Each line
     reveals a copy button on hover; the block's toolbar also has one
     "copy raw token" button that copies the whole token string.

Handling for pages with an unusually large number of matched tokens was
not stress-tested by the prototype and is left as an implementation
judgment call rather than a specified behavior — reasonable defaults
(e.g. a scrollable list) apply without needing a design decision here.

## Testing Decisions

- **`scanUrlForJwts(url)` is the primary, near-exclusive unit-tested
  seam.** It's a pure function — no `chrome.*` dependency — so it can be
  tested directly with plain URL strings in, and asserted against the
  returned `DecodedToken[]` shape (matched substring, decoded
  header/payload, computed `status`, and relative-expiry text) out. Good
  tests here assert on that returned data — the function's external
  behavior — never on the internals of the regex or the decode
  implementation.
- Test cases should cover: JWTs in query string, fragment, and path
  position (all in one URL scan, since matching is position-agnostic);
  multiple tokens in a single URL; a valid, an expiring-soon, and an
  already-expired token (to exercise all three `status` values); and
  deliberately near-miss non-JWT strings (dot-delimited base64-ish text
  that fails decode or lacks an `alg` key) to confirm they're correctly
  excluded.
- The background service worker's use of `chrome.tabs`, `webNavigation`,
  and `sidePanel`, and the Side Panel UI's rendering of a `DecodedToken[]`
  into the list/detail layout, are both thin orchestration around
  `scanUrlForJwts` — glue code, not logic-bearing. They are not unit
  tested; verify manually by loading the unpacked extension in Chrome and
  exercising the user stories above against real OAuth/SSO redirect URLs.
- This is a greenfield repository with no existing test suite or
  conventions to follow as prior art. If integration-level testing is
  wanted later, Chrome's own guidance points to Puppeteer with
  `--load-extension`, but that's not required for v1.

## Out of Scope

Per [non-goals](issues/09-non-goals.md), and reaffirmed by
[decode-depth-generic-claims](issues/02-decode-depth-generic-claims.md):

- Signature verification of any kind (client-side HMAC verification has
  no secret to verify against; RS/ES verification would require JWKS
  fetching and key caching — out of scope for an inspection-only tool).
- Issuer-specific claim knowledge or annotation (no Auth0/Firebase/Cognito
  claim dictionaries or heuristics).
- An options/settings page (e.g. per-domain enable/disable, badge color
  configuration).
- Token history or a log of previously seen tokens across page visits
  (would also violate the no-persistence constraint).
- Editing or re-signing tokens (a "JWT debugger" feature, distinct from
  inspection).
- Non-JWT token formats — opaque bearer tokens, PASETO, session cookies,
  or anything that isn't structurally three dot-separated base64url
  segments.
- Firefox, Edge, or any non-Chrome browser support. Chrome-only,
  Manifest V3.

## Further Notes

- Full decision history, including rejected alternatives and rationale
  for each choice above, lives in the tickets under `issues/` — this spec
  summarizes them but the tickets are the primary source.
- The three-variant UI prototype (including the two variants that did
  *not* win — a card-stack/accordion layout and a compact-table/tabs
  layout) is preserved on the `prototype/panel-ui` branch if any of their
  individual pieces are worth revisiting.
- Full citations for the `chrome.sidePanel` per-tab behavior findings are
  in [research/sidepanel-per-tab-behavior.md](research/sidepanel-per-tab-behavior.md).
- Exact `manifest.json` layout and the extension's file/module
  organization are mechanical once the decisions above are implemented —
  not specified further here, left to the implementing agent/developer.
