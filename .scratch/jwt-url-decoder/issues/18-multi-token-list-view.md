# 18 — Multi-token list view

**What to build:** When a page's URL has more than one JWT, the panel
shows a list view first instead of jumping straight to a single token's
detail; picking one drills into the detail view built in ticket 17. When
there's exactly one token, the list is skipped entirely. See
[spec.md](../spec.md) ("UI layout — list and detail views") and
[multi-token-list-view](../issues/04-multi-token-list-view.md) for the
decision record.

**Blocked by:** 17 (designed-detail-view) — the list routes into that
detail view.

**Status:** resolved

- [x] When `scanUrlForJwts` returns more than one token for the active
      tab's URL, the panel shows a list view: each token as a pill with a
      colored left border matching its `status` (green/amber/red), its
      guessed `type` label, and a truncated view of the raw token — no
      expiry text in the list itself.
- [x] Clicking a pill navigates to that token's full detail view from
      ticket 17.
- [x] When exactly one token is found, the panel skips the list and shows
      that token's detail view directly — verified this still holds
      after this ticket's changes (no regression from ticket 16/17's
      single-token behavior).
- [x] Verified manually on a URL with two tokens of different `status`
      values (e.g. one valid, one expired) that the list shows both with
      the correct distinct border colors.

The detail view gains an "← All tokens" button only when more than one
token was found, so the single-token case stays a dead end with nothing
to go back to.

A re-scan only resets the list/detail selection when the set of token
strings actually changed. `tabs.onUpdated` fires for non-URL changes too,
and resetting unconditionally would throw the user out of a detail view
they were reading.
