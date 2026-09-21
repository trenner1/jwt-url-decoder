import { describe, expect, it, vi } from "vitest";

type RecordedCall = { name: string; args: unknown };
type Listener = (event: never) => void;

function b64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function jwt(exp = Math.floor(Date.now() / 1000) + 3600): string {
  return `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({ sub: "user-1", exp })}.sig`;
}

function stubChrome() {
  const calls: RecordedCall[] = [];
  const listeners: Record<string, Listener[]> = {
    committed: [],
    history: [],
    activated: [],
    clicked: [],
  };

  const record = (name: string) => (args: unknown) => {
    calls.push({ name, args });
    return Promise.resolve();
  };
  const collect = (key: string) => ({
    addListener: (fn: Listener) => listeners[key].push(fn),
  });

  const chrome = {
    action: {
      setBadgeText: record("setBadgeText"),
      setBadgeBackgroundColor: record("setBadgeBackgroundColor"),
      onClicked: collect("clicked"),
    },
    sidePanel: {
      setOptions: record("setOptions"),
      open: record("open"),
    },
    webNavigation: {
      onCommitted: collect("committed"),
      onHistoryStateUpdated: collect("history"),
    },
    tabs: {
      onActivated: collect("activated"),
    },
  };

  return { chrome, calls, listeners };
}

async function loadWorker() {
  const stub = stubChrome();
  (globalThis as unknown as { chrome: unknown }).chrome = stub.chrome;
  vi.resetModules();
  await import("./background");

  const fire = (key: string, event: unknown) => {
    for (const listener of stub.listeners[key]) {
      (listener as (e: unknown) => void)(event);
    }
  };
  const argsFor = (name: string) =>
    stub.calls.filter((call) => call.name === name).map((call) => call.args);

  return { ...stub, fire, argsFor };
}

describe("background worker badge wiring", () => {
  it("sets a dot badge scoped to the navigating tab when the URL carries a JWT", async () => {
    const worker = await loadWorker();

    worker.fire("committed", {
      tabId: 7,
      frameId: 0,
      url: `https://app.example.com/cb?id_token=${jwt()}`,
    });

    expect(worker.argsFor("setBadgeText")).toEqual([{ text: "•", tabId: 7 }]);
  });

  it("clears the badge on a URL with no JWT", async () => {
    const worker = await loadWorker();

    worker.fire("committed", {
      tabId: 7,
      frameId: 0,
      url: "https://app.example.com/dashboard",
    });

    expect(worker.argsFor("setBadgeText")).toEqual([{ text: "", tabId: 7 }]);
  });

  it("ignores navigation in subframes", async () => {
    const worker = await loadWorker();

    worker.fire("committed", {
      tabId: 7,
      frameId: 3,
      url: `https://ads.example.com/cb?id_token=${jwt()}`,
    });

    expect(worker.argsFor("setBadgeText")).toEqual([]);
    expect(worker.argsFor("setOptions")).toEqual([]);
  });

  it("re-scans on in-tab history updates so SPA redirects are not missed", async () => {
    const worker = await loadWorker();

    worker.fire("history", {
      tabId: 9,
      frameId: 0,
      url: `https://spa.example.com/#access_token=${jwt()}`,
    });

    expect(worker.argsFor("setBadgeText")).toEqual([{ text: "•", tabId: 9 }]);
  });

  it("keeps badge state per tab rather than global", async () => {
    const worker = await loadWorker();

    worker.fire("committed", {
      tabId: 1,
      frameId: 0,
      url: `https://app.example.com/cb?id_token=${jwt()}`,
    });
    worker.fire("committed", {
      tabId: 2,
      frameId: 0,
      url: "https://app.example.com/plain",
    });

    expect(worker.argsFor("setBadgeText")).toEqual([
      { text: "•", tabId: 1 },
      { text: "", tabId: 2 },
    ]);
  });

  it("sets the badge colour once globally instead of per navigation", async () => {
    const worker = await loadWorker();

    worker.fire("committed", {
      tabId: 1,
      frameId: 0,
      url: `https://app.example.com/cb?id_token=${jwt()}`,
    });

    const colours = worker.argsFor("setBadgeBackgroundColor");
    expect(colours).toHaveLength(1);
    expect(colours[0]).not.toHaveProperty("tabId");
  });
});

describe("background worker side panel wiring", () => {
  it("gives each navigating tab its own panel options", async () => {
    const worker = await loadWorker();

    worker.fire("committed", {
      tabId: 7,
      frameId: 0,
      url: `https://app.example.com/cb?id_token=${jwt()}`,
    });

    expect(worker.argsFor("setOptions")).toEqual([
      { tabId: 7, path: "panel.html", enabled: true },
    ]);
  });

  it("re-applies panel options for a newly activated tab", async () => {
    const worker = await loadWorker();

    worker.fire("activated", { tabId: 42, windowId: 1 });

    expect(worker.argsFor("setOptions")).toEqual([
      { tabId: 42, path: "panel.html", enabled: true },
    ]);
  });

  it("opens the panel as the very first call in the click handler", async () => {
    const worker = await loadWorker();
    worker.calls.length = 0;

    worker.fire("clicked", { id: 12 });

    expect(worker.calls[0]).toEqual({ name: "open", args: { tabId: 12 } });
  });

  it("does not open a panel for a tab with no id", async () => {
    const worker = await loadWorker();
    worker.calls.length = 0;

    worker.fire("clicked", { id: undefined });

    expect(worker.argsFor("open")).toEqual([]);
  });
});
