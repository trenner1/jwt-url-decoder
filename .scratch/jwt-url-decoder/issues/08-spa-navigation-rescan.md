Type: grilling
Status: resolved

## Question

Many OAuth/SSO flows land on client-side-routed SPAs where the URL changes
via `history.pushState`/`replaceState` without a full page reload. Should
the extension re-scan on those changes too, or only on full page loads?

## Answer

Full page load + SPA navigation. Watch for in-tab URL changes (e.g. via
`webNavigation.onHistoryStateUpdated`) in addition to normal
navigation-committed events, and re-scan whenever the URL changes.

Rationale: this is actually the highest-value case. OAuth implicit-flow
redirects that dump `#access_token=...` into the URL frequently land on SPA
shells (Firebase Auth, Auth0's SPA SDK, etc.) that immediately
`replaceState` the URL to strip the token. Scanning only on full navigation
would race that cleanup and could miss the token entirely on some apps.
