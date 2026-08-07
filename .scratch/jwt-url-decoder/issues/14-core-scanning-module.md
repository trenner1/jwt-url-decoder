# 14 — Core JWT scanning module (`scanUrlForJwts`)

**What to build:** A pure function, `scanUrlForJwts(url: string) →
DecodedToken[]`, with no dependency on any `chrome.*` API — the single
seam the rest of the extension (background service worker and Side Panel
UI) will call. Given a URL string, it finds every JWT anywhere in it,
discards structural near-misses that don't actually decode to valid
tokens, and returns a humanized, ready-to-render record for each real
match. See [spec.md](../spec.md) ("Core seam: `scanUrlForJwts(url)`") for
the full decision record this implements.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Regex-scans the raw URL string (not query/path/fragment parsed
      separately) for the `<base64url>.<base64url>.<base64url>` shape,
      anywhere in the string, and can find more than one match in a
      single URL.
- [x] For each structural match, discards it unless both the header and
      payload segments base64url-decode to valid JSON **and** the header
      JSON contains an `alg` key — near-miss strings (hashes, session
      ids, etc.) that merely look like the shape must not appear in the
      output.
- [x] For each surviving match, returns a `DecodedToken` containing: the
      original raw token substring, a guessed `type` from the URL param
      name it was found under (e.g. `access_token`, `id_token`, with a
      generic fallback label), the decoded `header`/`payload` objects,
      the raw `signature` segment, and a computed `status` of `valid` /
      `expiring` / `expired` derived from `exp`.
- [x] Humanizes `exp` into a relative countdown/elapsed string (e.g.
      "expires in 12m", "expired 3h ago"); surfaces `iss`/`aud`/`sub`/`alg`
      plainly via the raw `payload`/`header` objects. No issuer-specific
      claim knowledge and no signature verification of any kind.

      Scoped down from the original wording during implementation: an
      absolute-date string and `iat`/`nbf` humanization were dropped since
      the locked UI design (ticket 17 — status banner + claim chips +
      terminal block) never renders them. `iat`/`nbf` remain available
      raw via `payload.iat`/`payload.nbf` for the terminal block's raw
      JSON display; add dedicated humanization later if a future UI
      change actually surfaces them.
- [x] Covered by a test suite exercising: tokens in query string,
      fragment, and path position within one URL; multiple tokens in a
      single URL; one valid, one expiring-soon, and one already-expired
      token (all three `status` values); and deliberately near-miss
      non-JWT strings confirmed to be excluded.

## Implementation notes

- `Buffer` (Node-only) was avoided in favor of `atob`-based base64url
  decoding, since this module runs in a Chrome extension service worker
  and in the Side Panel — neither has Node's `Buffer` global.
- Code: `src/lib/scanUrlForJwts.ts`. Tests: `src/lib/scanUrlForJwts.test.ts`
  (10 tests, all passing). Typechecked clean with `npm run typecheck`.
- `/code-review` pass (commit f5983d3) applied two standards fixes
  (`type` given its own `TokenType` union; a duplicated test helper
  hoisted) and one spec fix (added a test proving each token gets an
  independent `status` within a single multi-token URL, not just across
  separate URLs). The `alg`-must-be-a-string check was flagged as
  stricter than the ticket's literal wording but left as-is — RFC 7515
  mandates `alg` is a string, so this is the spec-conformant read, not a
  bug.
