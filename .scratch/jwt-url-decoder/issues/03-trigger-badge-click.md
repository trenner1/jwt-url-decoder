Type: grilling
Status: resolved

## Question

How does the extension detect and surface JWTs — fully automatic slide-out,
automatic badge + click-to-open, or manual scan on demand?

## Answer

Automatic badge + click-to-open. The extension passively detects JWTs on
every page and shows a badge on the toolbar icon; the Side Panel only opens
when the user clicks the icon.

Rationale: a slide-out that auto-opens on every matching page would be
disruptive on OAuth callback pages, where JWTs in URLs are extremely
common. A badge is passive and informative at a glance; click-to-open puts
the user in control. Pure manual-scan-on-demand loses the "did this page
have a token" ambient signal.
