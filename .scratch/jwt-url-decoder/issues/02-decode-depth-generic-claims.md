Type: grilling
Status: resolved

## Question

How deep should "decode" go — raw base64url decode only, decode plus
generic humanization of standard claims, decode plus issuer-aware
annotation (Auth0, Firebase, Cognito, etc.), or decode plus signature
verification?

## Answer

Decode + generic claim interpretation. Humanize standard claims only:

- `exp`/`iat`/`nbf` → readable dates and relative countdowns (e.g.
  "expired 3h ago", "valid for 12m")
- `iss`/`aud`/`sub` → labeled plainly
- `alg` → named/explained

No issuer-specific knowledge (no Auth0/Firebase/Cognito claim dictionaries)
and no signature verification.

Rationale: standard-claim humanization delivers the core "tell me what this
is" value with no network calls and no security posture to defend.
Issuer-aware annotation is a real maintenance surface (heuristics, claim
dictionaries) that doesn't belong in v1. Signature verification is a
non-starter for HMAC client-side (no secret) and real complexity for
RS/ES algs (JWKS fetch, key caching) for a tool whose job is inspection,
not trust.
