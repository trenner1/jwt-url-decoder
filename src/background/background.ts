import { scanUrlForJwts } from "../lib/scanUrlForJwts";

const BADGE_TEXT = "•";
const BADGE_COLOR = "#4F46E5";

// Set once, globally (no tabId): a tab-scoped setBadgeText call always uses
// this as its color unless a tab-scoped color is set too, which we never do.
// Avoids a redundant per-navigation IPC call to re-set an unchanging color.
ignoreClosedTabErrors(chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR }));

function ignoreClosedTabErrors(promise: Promise<void>): void {
  promise.catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("No tab with id")) {
      console.error("chrome.action call failed", err);
    }
  });
}

// Every scan is computed fresh from the event's `url` field. No chrome.storage,
// no network calls, no persistence of any kind — this is a hard privacy
// constraint for the extension, not a style preference.
export function updateBadgeForTab(tabId: number, url: string | undefined): void {
  const tokens = scanUrlForJwts(url ?? "");

  if (tokens.length > 0) {
    ignoreClosedTabErrors(chrome.action.setBadgeText({ text: BADGE_TEXT, tabId }));
  } else {
    ignoreClosedTabErrors(chrome.action.setBadgeText({ text: "", tabId }));
  }
}

function handleNavigation(
  details: chrome.webNavigation.WebNavigationTransitionCallbackDetails,
): void {
  if (details.frameId !== 0) return;
  updateBadgeForTab(details.tabId, details.url);
}

chrome.webNavigation.onCommitted.addListener(handleNavigation);
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation);
