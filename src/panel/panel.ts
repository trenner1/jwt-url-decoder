import { scanUrlForJwts, type DecodedToken } from "../lib/scanUrlForJwts";

const root = document.createElement("main");
document.body.append(root);

async function activeTabUrl(): Promise<string> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.url ?? "";
  } catch {
    return "";
  }
}

function tokenView(token: DecodedToken): HTMLElement {
  const section = document.createElement("section");

  const heading = document.createElement("h2");
  heading.textContent = token.type;

  const claims = document.createElement("pre");
  claims.textContent = JSON.stringify(
    { header: token.header, payload: token.payload },
    null,
    2,
  );

  section.append(heading, claims);
  return section;
}

function emptyView(): HTMLElement {
  const message = document.createElement("p");
  message.textContent = "No JWTs found in this tab's URL.";
  return message;
}

async function refresh(): Promise<void> {
  const tokens = scanUrlForJwts(await activeTabUrl());
  root.replaceChildren(
    ...(tokens.length > 0 ? tokens.map(tokenView) : [emptyView()]),
  );
}

void refresh();

chrome.tabs.onActivated.addListener(() => void refresh());

chrome.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => {
  if (tab.active) void refresh();
});
