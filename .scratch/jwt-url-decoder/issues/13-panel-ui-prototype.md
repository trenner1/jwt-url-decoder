Type: prototype
Status: open

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
