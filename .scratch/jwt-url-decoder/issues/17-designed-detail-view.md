# 17 — Designed single-token detail view

**What to build:** Replace the minimal raw-JSON panel view from ticket 16
with the actual designed layout — the winning variant from the UI
prototype. See [spec.md](../spec.md) ("UI layout — list and detail
views") and [panel-ui-prototype](../issues/13-panel-ui-prototype.md) for
the full decision record; the prototype itself (including the two
non-winning variants) is preserved on the throwaway `prototype/panel-ui`
git branch, commit `a6a60f6`, for visual reference.

**Blocked by:** 16 (sidepanel-open-minimal-view).

- [ ] A full-width colored status banner is the first thing shown,
      reflecting the token's `status` — e.g. "Valid · expires in 53m"
      (green), "Expiring soon · ..." (amber), "Expired · 1h ago" (red).
- [ ] Humanized claims (`alg`, `iss`, `aud`, `sub`) render as a wrapped
      row of chips beneath the banner — not a table or list.
- [ ] A single dark, terminal-styled block below the chips contains one
      labeled line each for `header ▸`, `payload ▸`, and `signature ▸`
      (pretty-printed JSON for the first two, the raw signature segment
      for the third).
- [ ] Hovering a line in the terminal block reveals a per-line copy
      button; the block's toolbar has one "copy raw token" button that
      copies the whole token string.
- [ ] Visually matches the winning prototype variant's structure
      (banner → chips → terminal block) closely enough to be recognizable
      as the same design when compared side by side.
