Type: grilling
Status: resolved

## Question

What are the hard constraints on data handling, given JWTs often carry PII
or session-sensitive claims — fully local with no persistence, local with
session-scoped persistence (`chrome.storage.session`), or durable
persistence (`chrome.storage.local`) across sessions?

## Answer

Fully local, no persistence, no network calls, no telemetry. Every scan is
fresh from the current page state; nothing is ever written to
`chrome.storage` for token content, and nothing leaves the device.

This is a locked security constraint, not just an implementation default —
it should be stated explicitly in the spec (non-goal: no external requests,
no storage APIs used for token content). Persistence can be reconsidered
later if a real need shows up, but is not part of this destination.
