Type: grilling
Status: resolved

## Question

What should the detail view actually display for a decoded token —
minimal (raw header/payload JSON only), structured (JSON plus humanized
highlights), or structured plus copy/raw-signature utilities?

## Answer

Structured + raw token utilities:

- Highlights section: humanized standard claims (expiry countdown, alg,
  issuer, audience, subject) — see
  [decode-depth-generic-claims](02-decode-depth-generic-claims.md)
- Raw pretty-printed header and payload JSON below the highlights
- Copy-to-clipboard, both per-field and for the whole token
- Raw (undecoded) signature segment shown for reference

Rationale: the humanized highlights are the core "tells you what it is"
value. Raw JSON serves the power-user/debugging case. Copy-to-clipboard is
nearly free to add and is the single most common thing someone does with a
token they're inspecting (paste into jwt.io, a curl command, etc.).
