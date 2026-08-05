Type: grilling
Status: resolved

## Question

What permission scope should the extension request — `<all_urls>` host
permission, `activeTab`-only, or a user-configurable allowlist?

## Answer

`<all_urls>` host permission.

Rationale: the automatic-badge behavior
([trigger-badge-click](03-trigger-badge-click.md)) requires seeing the URL
of every page to know whether to light up the badge — incompatible with
`activeTab`, which only grants access on explicit user interaction. An
allowlist adds setup friction that contradicts the "automatic" badge
decision. The broad grant is offset by the behavioral scope already locked
in [privacy-no-persistence](06-privacy-no-persistence.md): nothing is
stored or transmitted regardless of how many pages are scanned. The spec
should call this out clearly for the Chrome Web Store listing/review.
