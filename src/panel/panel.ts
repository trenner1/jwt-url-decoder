import {
  scanUrlForJwts,
  type DecodedToken,
  type TokenStatus,
} from "../lib/scanUrlForJwts";

const STATUS_LABEL: Record<TokenStatus, string> = {
  valid: "Valid",
  expiring: "Expiring soon",
  expired: "Expired",
};

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

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function claimText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function statusText(token: DecodedToken): string {
  const label = STATUS_LABEL[token.status];
  return token.relativeExpiry ? `${label} · ${token.relativeExpiry}` : label;
}

function copyOnClick(button: HTMLButtonElement, text: string): void {
  button.addEventListener("click", () => {
    const original = button.textContent;
    const settle = (label: string) => {
      button.textContent = label;
      setTimeout(() => {
        button.textContent = original;
      }, 900);
    };

    navigator.clipboard.writeText(text).then(
      () => settle("Copied!"),
      () => settle("Copy failed"),
    );
  });
}

function bannerView(token: DecodedToken): HTMLElement {
  const banner = document.createElement("div");
  banner.className = `banner banner-${token.status}`;

  const type = document.createElement("span");
  type.className = "banner-type";
  type.textContent = token.type;

  const status = document.createElement("span");
  status.className = "banner-status";
  status.textContent = statusText(token);

  banner.append(type, status);
  return banner;
}

function chipsView(token: DecodedToken): HTMLElement {
  const chips = document.createElement("div");
  chips.className = "chips";

  const claims: [string, unknown][] = [
    ["alg", token.header.alg],
    ["iss", token.payload.iss],
    ["aud", token.payload.aud],
    ["sub", token.payload.sub],
  ];

  for (const [name, raw] of claims) {
    const value = claimText(raw);
    if (value === undefined) continue;

    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `${name}: ${value}`;
    chip.title = value;
    chips.append(chip);
  }

  return chips;
}

function terminalLine(label: string, body: string): HTMLElement {
  const line = document.createElement("div");
  line.className = "terminal-line";

  const prefix = document.createElement("span");
  prefix.className = "terminal-prefix";
  prefix.textContent = label;

  const content = document.createElement("pre");
  content.textContent = body;

  const copy = document.createElement("button");
  copy.className = "copy-line";
  copy.textContent = "copy";
  copyOnClick(copy, body);

  line.append(prefix, content, copy);
  return line;
}

function terminalView(token: DecodedToken): HTMLElement {
  const terminal = document.createElement("div");
  terminal.className = "terminal";

  const toolbar = document.createElement("div");
  toolbar.className = "terminal-toolbar";

  const toolbarLabel = document.createElement("span");
  toolbarLabel.textContent = "raw";

  const copyAll = document.createElement("button");
  copyAll.className = "copy-all";
  copyAll.textContent = "copy raw token";
  copyOnClick(copyAll, token.token);

  toolbar.append(toolbarLabel, copyAll);

  const signature = terminalLine("signature ▸", token.signature);
  signature.classList.add("terminal-line-signature");

  terminal.append(
    toolbar,
    terminalLine("header ▸", pretty(token.header)),
    terminalLine("payload ▸", pretty(token.payload)),
    signature,
  );
  return terminal;
}

function tokenView(token: DecodedToken): HTMLElement {
  const section = document.createElement("section");
  section.className = "token";
  section.append(bannerView(token), chipsView(token), terminalView(token));
  return section;
}

function emptyView(): HTMLElement {
  const message = document.createElement("p");
  message.className = "empty";
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
