# Map: JWT URL Decoder Chrome Extension

**Destination reached** — assembled as [spec.md](spec.md), labeled
`ready-for-agent`.

## Destination

A spec for a Chrome extension (Manifest V3) that finds JWTs anywhere in the
current tab's URL, decodes and humanizes their claims, and surfaces them via
an automatic toolbar badge + Chrome Side Panel detail view — fully local, no
persistence, no network calls.

## Notes

- Domain: Chrome extension (MV3), JWT structure (`header.payload.signature`,
  base64url-encoded), Chrome extension APIs (`action` badge, `sidePanel`,
  `webNavigation`, `tabs`).
- Default ticket type for anything not already sharp: `/grilling`, one
  question at a time, recommendation-first.
- Locked constraints — don't relitigate without an explicit scope change:
  no signature verification, no issuer-specific claim knowledge, no
  telemetry, no network calls, no `chrome.storage` use for token content.
- Once the frontier is clear, hand off to `/to-spec` to assemble the final
  spec document from this map's decisions.

## Decisions so far

- [Scan the whole URL, not just query/path/fragment](issues/01-url-scope-anywhere.md) — regex-scan the raw URL string for the 3-segment base64url pattern; superset of scanning query/path/fragment separately.
- [Decode + humanize standard claims, nothing issuer-specific](issues/02-decode-depth-generic-claims.md) — decode header+payload, humanize `exp`/`iat`/`nbf`/`iss`/`aud`/`sub`/`alg`; no issuer-aware annotation, no signature verification.
- [Automatic badge, click-to-open panel](issues/03-trigger-badge-click.md) — badge lights up passively when JWTs are found; slide-out only opens on click.
- [Multiple tokens: list view → detail view](issues/04-multi-token-list-view.md) — list all found tokens first, drill into detail; auto-skip to detail when there's exactly one.
- [Detail view: structured highlights + raw JSON + copy utilities](issues/05-detail-view-content.md) — humanized claims section, raw header/payload JSON, copy-to-clipboard, raw signature segment shown.
- [Fully local, zero persistence, zero network calls](issues/06-privacy-no-persistence.md) — locked security constraint; every scan is fresh, nothing written to disk or sent anywhere.
- [`<all_urls>` host permission](issues/07-permissions-all-urls.md) — required for passive badge detection across all pages; behavior stays scoped by the no-persistence/no-network constraint.
- [Re-scan on SPA navigation, not just full page loads](issues/08-spa-navigation-rescan.md) — watch `webNavigation.onHistoryStateUpdated` so implicit-flow tokens aren't missed on SPA shells that immediately clean the URL.
- [Non-goals for v1](issues/09-non-goals.md) — no options page, no token history/log, no token editing/re-signing, no non-JWT formats, no non-Chrome browsers.
- [Slide-out is the Chrome Side Panel API, not a page overlay](issues/10-slideout-mechanism-sidepanel.md) — `chrome.sidePanel`, not a content-script-injected overlay; avoids host-page CSS/z-index collisions.
- [Matching requires decode validation, not just structural shape](issues/11-match-validation.md) — a hit must base64url-decode to JSON with an `alg` key in the header, not just match the dot-delimited shape.
- [chrome.sidePanel supports the per-tab architecture this design assumes](issues/12-sidepanel-per-tab-feasibility.md) — confirmed via official docs + Chromium source: `setOptions({tabId, ...})` gives genuinely separate per-tab panels, `open()` requires an active user gesture (enforced, not just advised), and the extension must listen for `tabs.onActivated` itself since the panel doesn't auto-sync on tab switch.
- [Panel UI: status banner + claim chips + terminal-style raw block](issues/13-panel-ui-prototype.md) — Variant C won over a card-stack/accordion layout and a compact-table/tabs layout; list view uses color-bordered pills, detail view leads with a colored validity banner, claims shown as wrapped chips, raw header/payload/signature in one terminal-style block with per-line hover-copy. Badge style (dot vs. count) left as a soft default of dot — no strong preference surfaced.

## Not yet specified

- Exact manifest.json permission list and file/module layout — mechanical
  once the decisions above are locked; folds into the final spec write-up,
  not a decision in its own right.
- Performance/UX handling for pages with an unusually large number of
  matches — the prototype didn't stress-test this; low-stakes enough to
  leave as an implementation judgment call rather than a ticket.

## Out of scope

(none yet)
