# JWT URL Decoder

A Chrome extension that notices when there's a JWT in your address bar and
decodes it for you, on the spot, without sending it anywhere.

(JWT is pronounced "jot". That's why the folder is named the way it is.)

## The problem it solves

You're debugging an OAuth redirect. The callback URL comes back with
`#id_token=eyJhbGciOi...` and about four hundred more characters. You want to
know what's inside it, so you do what everyone does: triple-click the token,
copy it, open jwt.io, paste.

Two things just happened. You broke your flow to go read a string that was
already on your screen. And you pasted a live credential, possibly carrying a
real person's claims or an internal session, into a text box on someone else's
server.

This extension does the same decode, in a side panel, locally.

## Install

Not on the Web Store, so you build it and load it unpacked. Building needs
Node 20.19 or newer (22 and 24 both work), and running it needs Chrome 116 or
later, which is when `sidePanel.open()` arrived.

```bash
git clone https://github.com/trenner1/jwt-url-decoder.git
cd jwt-url-decoder
npm install
npm run build
```

That produces `dist/background.js` and `dist/panel.js`. The build step is not
optional: `dist/` is gitignored, and Chrome runs those bundles rather than the
TypeScript sources.

Recent npm versions warn that esbuild's install script was blocked. You can
ignore it. esbuild resolves its binary from the platform package anyway, and
the build works.

Then:

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the repository root, the folder with `manifest.json` in it, not
   `dist/`

If your Chrome is managed by an employer, Developer mode may be disabled by
policy. That's between you and your admin console.

## Check that it works

Don't test this by pasting a real token into anything. Generate a throwaway
URL with one valid and one expired token:

```bash
node -e 'const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");const n=Math.floor(Date.now()/1e3);const t=(h,p)=>`${b(h)}.${b(p)}.sig${Math.random().toString(36).slice(2,10)}`;console.log(`https://example.com/callback?id_token=${t({alg:"RS256",typ:"JWT"},{iss:"https://idp.example.com",aud:"client-abc",sub:"user-1",exp:n+3600})}#access_token=${t({alg:"HS256",typ:"JWT"},{iss:"https://auth.example.com",aud:"api://pay",sub:"svc",exp:n-3600})}`)'
```

Open that URL. You should get a dot on the toolbar icon, and clicking it should
give you a two-item list with one green pill and one red one.

Worth knowing: modern OAuth keeps tokens out of URLs on purpose. The
authorization-code flow hands you an opaque `?code=`, not a JWT. So signing
into most things won't trigger the badge, and that isn't a bug. Where JWTs do
still show up in URLs: password-reset and email-verification links, Supabase
auth redirects, older implicit-flow apps, and signed dashboard embeds.

After changing any source file, re-run `npm run build` and hit the reload icon
on the extension card.

## What it does

A dot appears on the toolbar icon the moment the current tab's URL contains a
JWT. Nothing opens on its own and nothing is announced. The badge just goes on,
per tab, and goes off again when you navigate somewhere boring.

Click the icon and a side panel opens showing:

- **A status banner** in green, amber, or red: "Valid · expires in 53m",
  "Expiring soon · expires in 4m", "Expired · 1h ago". This is the thing you
  actually wanted to know, so it's the first thing you see.
- **Claim chips** for `alg`, `iss`, `aud`, and `sub`, so you don't have to
  remember which one is the audience.
- **The raw truth**: pretty-printed header and payload JSON plus the raw
  signature segment, in a terminal-styled block. Hover any line for a copy
  button, or grab the whole token from the toolbar.

If a URL has more than one token (implicit flows love returning both an
`id_token` and an `access_token`), you get a list first, each pill colour-coded
by expiry, and you drill into whichever one you care about. One token skips the
list entirely, because a list of one is a rude thing to do to somebody.

## What it deliberately does not do

**It does not verify signatures.** Nothing here tells you a token is authentic.
A tampered token and a pristine one look identical to this extension. That's
not laziness: verifying `RS256`/`ES256` needs the issuer's JWKS, and verifying
`HS256` needs the shared secret, neither of which a browser extension has any
business holding. If you need to know a token is *valid*, you need the service
that issued it. This tells you what a token *says*.

It also has no opinion about your identity provider: no Auth0-specific or
Firebase-specific claim dictionaries, just the standard registered claims.

Not in this version: an options page, token history, editing or re-signing
tokens, formats that aren't JWTs, and browsers that aren't Chrome.

## Privacy

This is the entire point, so it's worth being precise.

- **No network calls.** Not for decoding, not for telemetry, not for anything.
- **No storage.** The extension never writes token content to `chrome.storage`,
  local storage, or disk. Every scan is recomputed from the URL you're looking
  at right now; close the panel and it's gone.
- **No message passing of token data.** The panel decodes the active tab's URL
  itself rather than being handed decoded tokens.

It does request the `<all_urls>` host permission, which is the scariest-looking
line in the manifest. It needs it because a passive badge has to be able to see
every tab's URL, and `activeTab` only grants access after you click, which would
defeat the entire feature. The broad *grant* is offset by the narrow
*behaviour* above: reading the URL is all it ever does with it.

Other permissions: `webNavigation` (to know when a tab's URL changed, including
client-side route changes) and `sidePanel` (to show the panel). Notably absent
is `clipboardWrite`: the copy buttons ride the user gesture of their own click,
so the permission isn't needed.

## How it's put together

```
manifest.json          MV3 manifest
panel.html/.css        side panel document and styles
src/lib/               scanUrlForJwts, the whole detection pipeline
src/background/        service worker: badge + per-tab panel wiring
src/panel/             list and detail rendering
```

Everything interesting lives in one pure function, `scanUrlForJwts(url)`, which
takes a URL string and returns decoded tokens. It has no `chrome.*` dependency,
which is why it's the part that's thoroughly unit tested. The service worker and
the panel are both thin wrappers that call it and draw the result.

A match has to earn it: three base64url segments in a row isn't enough. The
first two must actually base64url-decode to JSON, and the header must contain an
`alg` key. Without that filter, every session ID with a couple of dots in it
would light up the badge.

```bash
npm test        # vitest
npm run typecheck
npm run build   # esbuild, both bundles into dist/
```

## Where the design decisions live

`.scratch/jwt-url-decoder/` has the full paper trail: the map that scoped the
project, the assembled spec, and eighteen decision records explaining why the
slide-out is Chrome's Side Panel API instead of an injected overlay, why the
badge is a dot instead of a count, and why there's no signature verification.
If you're wondering "why is it like that", the answer is probably in there.
