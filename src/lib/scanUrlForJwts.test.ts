import { describe, expect, it } from "vitest";
import { scanUrlForJwts } from "./scanUrlForJwts";

// Fixture built the same way as the Wayfinder prototype's sample data:
// header/payload are real base64url-encoded JSON, signature is a random
// placeholder (unverified — this module never checks signatures).
function makeJwt(header: object, payload: object, signature = "sig") {
  const b64url = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${b64url(header)}.${b64url(payload)}.${signature}`;
}

describe("scanUrlForJwts", () => {
  it("finds a single JWT in a query string", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJwt(
      { alg: "RS256", typ: "JWT" },
      { iss: "https://idp.example.com", sub: "user-1", aud: "client-1", exp }
    );
    const url = `https://app.example.com/callback?access_token=${token}`;

    const result = scanUrlForJwts(url);

    expect(result).toHaveLength(1);
    expect(result[0].token).toBe(token);
    expect(result[0].header.alg).toBe("RS256");
    expect(result[0].payload.sub).toBe("user-1");
  });

  it("finds multiple JWTs across query, fragment, and path position", () => {
    const now = Math.floor(Date.now() / 1000);
    const idToken = makeJwt({ alg: "RS256" }, { sub: "id-1", exp: now + 3600 });
    const accessToken = makeJwt({ alg: "HS256" }, { sub: "access-1", exp: now + 3600 });
    const pathToken = makeJwt({ alg: "RS256" }, { sub: "path-1", exp: now + 3600 });

    const url =
      `https://app.example.com/verify/${pathToken}/confirm` +
      `?id_token=${idToken}` +
      `#access_token=${accessToken}`;

    const result = scanUrlForJwts(url);

    const subs = result.map((r) => r.payload.sub);
    expect(subs).toEqual(
      expect.arrayContaining(["id-1", "access-1", "path-1"])
    );
    expect(result).toHaveLength(3);
  });

  it("excludes dot-delimited strings that merely look like a JWT", () => {
    // Three base64url-ish segments, but neither decodes to JSON with an
    // `alg` key — e.g. a hash or session id that happens to contain dots.
    const url =
      "https://app.example.com/track?sid=YWJjZGVm.Z2hpamts.bW5vcHFy";

    const result = scanUrlForJwts(url);

    expect(result).toHaveLength(0);
  });

  it("excludes a real-looking match whose header decodes but lacks an alg key", () => {
    const b64url = (obj: object) =>
      Buffer.from(JSON.stringify(obj)).toString("base64url");
    const headerWithoutAlg = b64url({ typ: "JWT" });
    const payload = b64url({ sub: "user-1" });
    const url = `https://app.example.com/?token=${headerWithoutAlg}.${payload}.sig`;

    const result = scanUrlForJwts(url);

    expect(result).toHaveLength(0);
  });

  it("exposes the raw signature segment", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeJwt(
      { alg: "RS256" },
      { sub: "user-1", exp: now + 3600 },
      "raw-signature-abc123"
    );
    const url = `https://app.example.com/?token=${token}`;

    const result = scanUrlForJwts(url);

    expect(result[0].signature).toBe("raw-signature-abc123");
  });

  it("guesses the token type from a recognized URL param name", () => {
    const now = Math.floor(Date.now() / 1000);
    const idToken = makeJwt({ alg: "RS256" }, { sub: "id-1", exp: now + 3600 });
    const accessToken = makeJwt({ alg: "RS256" }, { sub: "access-1", exp: now + 3600 });
    const unknownParam = makeJwt({ alg: "RS256" }, { sub: "unknown-1", exp: now + 3600 });

    const url =
      `https://app.example.com/?id_token=${idToken}` +
      `&access_token=${accessToken}` +
      `&weird_param=${unknownParam}`;

    const result = scanUrlForJwts(url);

    const bySub = (sub: string) => result.find((r) => r.payload.sub === sub);
    expect(bySub("id-1")?.type).toBe("id_token");
    expect(bySub("access-1")?.type).toBe("access_token");
    expect(bySub("unknown-1")?.type).toBe("token");
  });

  it.each([
    [3600, "valid", /expires in/],
    [300, "expiring", /expires in/],
    [-3600, "expired", /expired/],
  ])(
    "computes status %2$s and a relative expiry string for exp offset %1$i",
    (offsetSeconds, expectedStatus, expectedPattern) => {
      const now = Math.floor(Date.now() / 1000);
      const token = makeJwt({ alg: "RS256" }, { sub: "user-1", exp: now + (offsetSeconds as number) });
      const url = `https://app.example.com/?token=${token}`;

      const result = scanUrlForJwts(url);

      expect(result[0].status).toBe(expectedStatus);
      expect(result[0].relativeExpiry).toMatch(expectedPattern as RegExp);
    }
  );
});
