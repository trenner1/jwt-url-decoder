Type: grilling
Status: resolved

## Question

How strict should JWT matching be, to avoid false positives from random
base64-looking text in a URL (hashes, session ids, etc.) that isn't
actually a token — structural match only, or structural match plus decode
validation?

## Answer

Structural match + decode validation. A hit only counts if the first two
segments successfully base64url-decode to valid JSON, and the header JSON
contains at minimum an `alg` key (the one field every real JWT header has).

Rationale: cheap check (attempt decode, look for `alg`) that meaningfully
cuts false positives from dot-delimited base64-ish strings that aren't
JWTs, with no network calls or issuer knowledge needed. Keeps the badge
count trustworthy — the whole point of the badge is "at a glance, is there
a real token here."
