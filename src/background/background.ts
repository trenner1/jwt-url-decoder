import { scanUrlForJwts } from "../lib/scanUrlForJwts";

const BADGE_TEXT = "•";
const BADGE_COLOR = "#4F46E5";
const PANEL_PATH = "panel.html";

function ignoreClosedTabErrors(promise: Promise<void>): void {
  promise.catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("No tab with id")) {
      console.error("chrome API call failed", err);
    }
  });
}

ignoreClosedTabErrors(chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR }));

export function updateBadgeForTab(tabId: number, url: string | undefined): void {
  const tokens = scanUrlForJwts(url ?? "");
  const text = tokens.length > 0 ? BADGE_TEXT : "";
  ignoreClosedTabErrors(chrome.action.setBadgeText({ text, tabId }));
}

function enablePanelForTab(tabId: number): void {
  ignoreClosedTabErrors(
    chrome.sidePanel.setOptions({ tabId, path: PANEL_PATH, enabled: true }),
  );
}

function handleNavigation(
  details: chrome.webNavigation.WebNavigationTransitionCallbackDetails,
): void {
  if (details.frameId !== 0) return;
  updateBadgeForTab(details.tabId, details.url);
  enablePanelForTab(details.tabId);
}

chrome.webNavigation.onCommitted.addListener(handleNavigation);
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation);

chrome.tabs.onActivated.addListener(({ tabId }) => {
  enablePanelForTab(tabId);
});

chrome.action.onClicked.addListener(({ id }) => {
  if (id !== undefined) ignoreClosedTabErrors(chrome.sidePanel.open({ tabId: id }));
});
