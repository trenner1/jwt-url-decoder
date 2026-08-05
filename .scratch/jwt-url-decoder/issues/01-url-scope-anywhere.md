Type: grilling
Status: resolved

## Question

Where in the URL should the extension look for JWTs — query string only,
path segments, fragment, or the raw URL string regardless of structural
position?

## Answer

Scan the raw URL string anywhere, via a regex for the
`<base64url>.<base64url>.<base64url>` pattern, rather than parsing
query/path/fragment separately.

Rationale: one regex pass is simpler to implement and is a strict superset
of scanning query+path+fragment individually — it catches OAuth implicit
flow tokens in the fragment, tokens in query params, and tokens embedded in
path segments, all in one step. False positives from the structural match
alone are filtered by decode validation (see
[match-validation](11-match-validation.md)).
