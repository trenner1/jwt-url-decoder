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

- [ ] Regex-scans the raw URL string (not query/path/fragment parsed
      separately) for the `<base64url>.<base64url>.<base64url>` shape,
      anywhere in the string, and can find more than one match in a
      single URL.
- [ ] For each structural match, discards it unless both the header and
      payload segments base64url-decode to valid JSON **and** the header
      JSON contains an `alg` key — near-miss strings (hashes, session
      ids, etc.) that merely look like the shape must not appear in the
      output.
- [ ] For each surviving match, returns a `DecodedToken` containing: the
      original raw token substring, a guessed `type` from the URL param
      name it was found under (e.g. `access_token`, `id_token`, with a
      generic fallback label), the decoded `header`/`payload` objects,
      the raw `signature` segment, and a computed `status` of `valid` /
      `expiring` / `expired` derived from `exp`.
- [ ] Humanizes `exp`/`iat`/`nbf` into both an absolute date and a
      relative countdown/elapsed string (e.g. "expires in 12m", "expired
      3h ago"); surfaces `iss`/`aud`/`sub`/`alg` plainly. No issuer-
      specific claim knowledge and no signature verification of any kind.
- [ ] Covered by a test suite exercising: tokens in query string,
      fragment, and path position within one URL; multiple tokens in a
      single URL; one valid, one expiring-soon, and one already-expired
      token (all three `status` values); and deliberately near-miss
      non-JWT strings confirmed to be excluded.
