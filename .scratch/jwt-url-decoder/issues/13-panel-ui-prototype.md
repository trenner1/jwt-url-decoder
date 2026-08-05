Type: prototype
Status: resolved

## Question

What should the Side Panel's list view and detail view actually look
like? This is a "how should it look" question, best answered by raising
fidelity with a rough concrete UI prototype (via `/prototype`) rather than
more grilling.

Cover:

- Badge design: dot vs. count, color/treatment for 1 token vs. multiple
- List view: per-token snippet format (truncated token text, guessed type
  from param name where available)
- Detail view: layout of the humanized highlights section (expiry
  countdown formatting, `alg`/`iss`/`aud`/`sub` labels) vs. the raw
  header/payload JSON block
- Copy-to-clipboard affordances: per-field vs. whole-token, and where they
  sit in the layout
- Raw signature segment: how it's displayed relative to the rest

Depends conceptually on
[sidepanel-per-tab-feasibility](12-sidepanel-per-tab-feasibility.md) if
that ticket surfaces a per-tab UX wrinkle (e.g. a "which tab" affordance
needed) — not a hard block, but worth checking that ticket's answer before
finalizing the layout.

## Answer

Built three structurally different variants via `/prototype` (static
HTML/CSS/JS, three-way switcher, sample id_token/access_token/expired
tokens) plus an independent badge-style comparison strip (dot vs. numeric
count — left undecided, no strong preference surfaced either way, dot is
the simpler default). **Variant C won: status banner + claim chips +
terminal-style raw block.**

Winning layout:

- **List view**: each token as a pill with a colored left border (green
  valid / amber expiring / red expired), type label + truncated token —
  no expiry text in the list, that's reserved for the detail view's banner.
- **Detail view**: leads with a full-width colored status banner as the
  primary affordance (e.g. "Valid · expires in 53m", "Expired · 1h ago"),
  followed by humanized claims (`alg`/`iss`/`aud`/`sub`) as a wrapped row
  of chips rather than a list or table.
- **Raw data**: header/payload/signature shown in a single dark
  terminal-style block, one labeled line per segment (`header ▸`,
  `payload ▸`, `signature ▸`), with a hover-to-reveal copy button per line
  plus one "copy raw token" button in the block's toolbar.

Full three-variant prototype captured as a primary source on the throwaway
branch `prototype/panel-ui` (commit `a6a60f6`) — not kept on `master`,
per this repo's `/prototype` convention. Variants A (card stack +
accordion) and B (compact table + tabs) are preserved there if any of
their pieces are worth revisiting later.
