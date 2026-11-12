// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const origin = "https://example.test";
const prayerSnapshot = {
  schemaVersion: 1, timezone: "Europe/Berlin", fetchedAt: "2026-11-12T15:00:00.000Z",
  iqamaDelays: { fajr: 20, dhuhr: 10, asr: 10, maghrib: 5, isha: 10 },
  rows: [{
    date: "2026-11-13", fajr: "05:32", sunrise: "07:18",
    dhuhr: "12:04", asr: "14:19", maghrib: "16:40", isha: "18:22",
  }],
};

// Node's synthetic Response has type "default"; a same-origin browser
// fetch intercepted by a Service Worker has type "basic".
function browserResponse(response: Response): Response {
  Object.defineProperty(response, "type", { value: "basic", configurable: true });
  const clone = response.clone.bind(response);
  Object.defineProperty(response, "clone", {
    value: () => browserResponse(clone()),
  });
  return response;
}

function createWorker(fetchImpl: (request: Request) => Promise<Response>) {
  const listeners = new Map<string, (event: unknown) => void>();
  const stores = new Map<string, Map<string, Response>>();
  const key = (request: string | Request) => new URL(typeof request === "string" ? request : request.url, origin).href;
  const caches = {
    open: vi.fn(async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name)!;
      return {
        match: async (request: string | Request) => entries.get(key(request))?.clone(),
        put: async (request: string | Request, response: Response) => { entries.set(key(request), response.clone()); },
        add: async (request: string) => {
          const response = await fetchImpl(new Request(key(request)));
          if (!response.ok) throw new Error("precache failed");
          entries.set(key(request), response.clone());
        },
        keys: async () => [...entries.keys()].map(url => new Request(url)),
        delete: async (request: Request) => entries.delete(key(request)),
      };
    }),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (request: string | Request) => {
      for (const entries of stores.values()) {
        const result = entries.get(key(request));
        if (result) return result.clone();
      }
      return undefined;
    },
  };
  const worker = {
    location: { origin }, clients: { claim: async () => undefined },
    skipWaiting: async () => undefined,
    addEventListener: (name: string, handler: (event: unknown) => void) => listeners.set(name, handler),
  };
  runInNewContext(readFileSync(join(process.cwd(), "public/sw.js"), "utf8"), {
    self: worker, caches, fetch: fetchImpl,
    URL, Request, Response, AbortController, Buffer, setTimeout, clearTimeout,
  });
  async function request(path: string, headers?: HeadersInit) {
    let response: Promise<Response> | undefined;
    const incoming = new Request(origin + path, { headers });
    if (!path.startsWith("/api/")) {
      // FetchEvent navigation requests have mode=navigate (not constructible
      // through Node's Request constructor), so model it explicitly.
      Object.defineProperty(incoming, "mode", { value: "navigate" });
    }
    listeners.get("fetch")?.({
      request: incoming,
      respondWith: (result: Promise<Response>) => { response = result; },
    });
    return response ? await response : null;
  }
  async function seedOfflinePage() {
    const cache = await caches.open("deggendorf-prayer-shell-v19");
    await cache.put("/offline.html", new Response("<h1>Offline prayers</h1>", {
      headers: { "content-type": "text/html" },
    }));
  }
  return { request, caches, stores, seedOfflinePage };
}

describe("public PWA and Android TWA offline read-only cache", () => {
  it("stores a verified public prayer schedule online then serves it after network loss", async () => {
    let online = true;
    const network = vi.fn(async () => {
      if (!online) throw new Error("no-network");
      return browserResponse(Response.json(prayerSnapshot, { headers: { "cache-control": "public, max-age=0, must-revalidate" } }));
    });
    const worker = createWorker(network);
    const path = "/api/offline/prayer-schedule";
    const first = await worker.request(path);
    expect(first?.status).toBe(200);
    online = false;
    const cached = await worker.request(path);
    expect(cached?.status).toBe(200);
    expect(await cached?.json()).toEqual(prayerSnapshot);
  });

  it("never stores malformed, expired or error responses as verified offline prayers", async () => {
    let online = true;
    const worker = createWorker(async () => {
      if (!online) throw new Error("no-network");
      return browserResponse(Response.json({ ...prayerSnapshot, rows: [{ ...prayerSnapshot.rows[0], fajr: "99:99" }] },
        { headers: { "cache-control": "public, max-age=0, must-revalidate" } }));
    });
    const path = "/api/offline/prayer-schedule";
    expect((await worker.request(path))?.status).toBe(200);
    online = false;
    expect((await worker.request(path))?.status).toBe(503);
  });

  it("displays bundled offline prayer dashboard rather than a network error on uncached navigation", async () => {
    const worker = createWorker(async () => { throw new Error("no-network"); });
    await worker.seedOfflinePage();
    const result = await worker.request("/events");
    expect(result?.status).toBe(200);
    expect(await result?.text()).toContain("Offline prayers");
  });

  it("prioritizes the dedicated offline yearly dashboard for offline home launches over stale cached SSR", async () => {
    const worker = createWorker(async () => { throw new Error("no-network"); });
    await worker.seedOfflinePage();
    const pages = await worker.caches.open("deggendorf-prayer-pages-v19");
    await pages.put("/", new Response("<h1>Stale old home</h1>", {
      headers: { "content-type": "text/html" },
    }));
    const result = await worker.request("/");
    expect(result?.status).toBe(200);
    expect(await result?.text()).toContain("Offline prayers");
  });

  it("uses the offline public dashboard during a server-side 503, not just a disconnected network", async () => {
    const worker = createWorker(async () => new Response("Unavailable", { status: 503 }));
    await worker.seedOfflinePage();
    const response = await worker.request("/");
    expect(response?.status).toBe(200);
    expect(await response?.text()).toContain("Offline prayers");
  });

  it("does not intercept account, admin, private or authenticated API requests", async () => {
    const worker = createWorker(async () => Response.json(prayerSnapshot));
    expect(await worker.request("/api/account/delete")).toBeNull();
    expect(await worker.request("/account")).toBeNull();
    expect(await worker.request("/admin")).toBeNull();
    expect(await worker.request("/api/offline/prayer-schedule", { authorization: "Bearer secret" })).toBeNull();
  });
});
