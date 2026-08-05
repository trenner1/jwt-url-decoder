Type: grilling
Status: resolved

## Question

What should be explicitly ruled out of scope for v1, so it's written down
rather than assumed?

## Answer

Ruled out of scope for v1:

- Options/settings page (per-domain enable/disable, badge color config)
- Token history/log across page visits (also contradicts
  [privacy-no-persistence](06-privacy-no-persistence.md))
- Editing/re-signing tokens (a "JWT debugger" feature, distinct from
  inspection)
- Non-JWT token formats (opaque bearer tokens, PASETO, session cookies —
  anything not structurally a JWT)
- Firefox/Edge/other browser support (Chrome-only, Manifest V3)

None of these are needed to reach the destination (find JWTs anywhere in
the URL, decode+humanize, badge+click Side Panel, list→detail, fully
local, `<all_urls>`, SPA-aware). Locking them now keeps the spec tight and
leaves a clean place to reconsider them later without re-litigating scope.
