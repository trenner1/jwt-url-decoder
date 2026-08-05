Type: grilling
Status: resolved

## Question

What happens when multiple JWTs are found on one page (e.g. an
`access_token` and `id_token` both in the fragment) — list then detail,
stacked detail for all, or first-match only?

## Answer

List view → detail view, with an auto-skip straight to detail when exactly
one token is found. The list shows a short identifying snippet per token
(and a guessed type from its param name where available); tapping one
drills into its decoded detail.

Rationale: scales cleanly from 1 to N tokens, keeps the initial view
scannable, avoids a long scroll of stacked JSON for multi-token pages, and
doesn't cost the common single-token case an extra click.
