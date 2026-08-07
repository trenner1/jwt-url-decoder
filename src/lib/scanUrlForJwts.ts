export type TokenStatus = "valid" | "expiring" | "expired";
export type TokenType = "id_token" | "access_token" | "token";

export interface DecodedToken {
  token: string;
  type: TokenType;
  header: Record<string, unknown> & { alg: string };
  payload: Record<string, unknown>;
  signature: string;
  status: TokenStatus;
  relativeExpiry: string;
}

const JWT_PATTERN = /[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const EXPIRING_SOON_SECONDS = 600; // < 10 minutes left counts as "expiring"

const KNOWN_PARAM_TYPES = new Set<TokenType>(["id_token", "access_token"]);
const FALLBACK_TYPE: TokenType = "token";

// Uses atob rather than Buffer — this module runs in a Chrome extension
// service worker and in the Side Panel (browser contexts), neither of
// which has Node's Buffer.
function base64UrlDecodeJson(segment: string): Record<string, unknown> | null {
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function isKnownParamType(paramName: string): paramName is TokenType {
  return (KNOWN_PARAM_TYPES as Set<string>).has(paramName);
}

function guessTypeFromUrl(url: string, token: string): TokenType {
  const paramPattern = new RegExp(`([A-Za-z0-9_]+)=${escapeRegExp(token)}`);
  const match = url.match(paramPattern);
  const paramName = match?.[1];
  return paramName && isKnownParamType(paramName) ? paramName : FALLBACK_TYPE;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDuration(seconds: number): string {
  const abs = Math.abs(seconds);
  if (abs < 3600) return `${Math.round(abs / 60)}m`;
  if (abs < 86400) return `${Math.round(abs / 3600)}h`;
  return `${Math.round(abs / 86400)}d`;
}

function computeStatusAndRelativeExpiry(exp: unknown): {
  status: TokenStatus;
  relativeExpiry: string;
} {
  if (typeof exp !== "number") {
    return { status: "valid", relativeExpiry: "" };
  }
  const now = Math.floor(Date.now() / 1000);
  const diff = exp - now;
  const duration = formatDuration(diff);

  if (diff < 0) return { status: "expired", relativeExpiry: `expired ${duration} ago` };
  if (diff < EXPIRING_SOON_SECONDS) return { status: "expiring", relativeExpiry: `expires in ${duration}` };
  return { status: "valid", relativeExpiry: `expires in ${duration}` };
}

export function scanUrlForJwts(url: string): DecodedToken[] {
  const matches = url.match(JWT_PATTERN) ?? [];
  const results: DecodedToken[] = [];

  for (const token of matches) {
    const [headerSeg, payloadSeg, signature] = token.split(".");
    const header = base64UrlDecodeJson(headerSeg);
    const payload = base64UrlDecodeJson(payloadSeg);
    if (!header || !payload || typeof header.alg !== "string") continue;

    const { status, relativeExpiry } = computeStatusAndRelativeExpiry(payload.exp);

    results.push({
      token,
      type: guessTypeFromUrl(url, token),
      header: header as DecodedToken["header"],
      payload,
      signature,
      status,
      relativeExpiry,
    });
  }

  return results;
}
