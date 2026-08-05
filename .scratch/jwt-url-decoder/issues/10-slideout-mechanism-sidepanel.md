Type: grilling
Status: resolved

## Question

How should the "slide-out" panel actually be implemented — a
content-script-injected overlay `<div>` sliding in from the edge of the
webpage, or the Chrome Side Panel API (`chrome.sidePanel`, Chrome 114+)
docked to the browser's own UI?

## Answer

Chrome Side Panel API.

Rationale: sidesteps an entire category of problems (CSS/z-index collisions
with arbitrary host pages, content-script injection overhead on every
page) for a tool whose job is inspection, not page modification. It
composes cleanly with the badge+click trigger
([trigger-badge-click](03-trigger-badge-click.md)) and list→detail view
([multi-token-list-view](04-multi-token-list-view.md)) already decided.
The "slide-out" framing from the original ask is satisfied by the panel
sliding in from the side when opened — it doesn't require being a
page-overlay to deliver that feel.

Open feasibility questions about per-tab behavior of `chrome.sidePanel`
are tracked separately — see
[sidepanel-per-tab-feasibility](12-sidepanel-per-tab-feasibility.md).
