import { execFileSync } from "node:child_process";
import path from "node:path";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DisplayShell } from "../components/DisplayShell";
import { loadLkg } from "../lib/lkg";
import { useDisplayRuntime } from "../lib/runtime/use-display-runtime";

const integrationDescribe =
  process.env.TWO_APP_INTEGRATION === "1" ? describe : describe.skip;
const TV_BASE_URL = process.env.TV_BASE_URL ?? "http://127.0.0.1:3001";
const nativeFetch = globalThis.fetch.bind(globalThis);

let dropDisplayFeed = false;
let displayFeedRequests = 0;

function setVisibility(value: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value,
  });
}

function setTestMode(active: boolean) {
  const repoRoot = path.resolve(process.cwd(), "..");
  const action = active ? "start" : "stop";

  execFileSync(
    "npx",
    [
      "vitest",
      "run",
      "app/admin/masjid-display-test/live-action.integration.test.tsx",
      "--reporter=verbose",
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        PLAN4_ADMIN_ACTION: action,
      },
      encoding: "utf8",
      stdio: "pipe",
    },
  );
}

function RuntimeHarness() {
  return <DisplayShell vm={useDisplayRuntime()} />;
}

integrationDescribe("live Prayerapp + Masjid Display integration", () => {
  beforeEach(() => {
    localStorage.clear();
    dropDisplayFeed = false;
    displayFeedRequests = 0;
    setVisibility("visible");
    setTestMode(false);

    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const raw =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        const url = new URL(raw, TV_BASE_URL);

        if (url.pathname === "/api/display-feed") {
          displayFeedRequests += 1;
          if (dropDisplayFeed) {
            throw new TypeError("simulated display-feed disconnect");
          }
        }

        return nativeFetch(url, init);
      },
    );
  });

  afterEach(() => {
    try {
      setTestMode(false);
    } finally {
      cleanup();
      vi.unstubAllGlobals();
      setVisibility("visible");
    }
  });

  it("preserves Feed ETag semantics through the live TV proxy", async () => {
    const first = await nativeFetch(`${TV_BASE_URL}/api/display-feed`);
    expect(first.status).toBe(200);

    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();
    await expect(first.json()).resolves.toMatchObject({ schemaVersion: 1 });

    const conditional = await nativeFetch(`${TV_BASE_URL}/api/display-feed`, {
      headers: { "if-none-match": etag! },
    });

    expect(conditional.status).toBe(304);
    expect(conditional.headers.get("etag")).toBe(etag);
    expect(await conditional.text()).toBe("");
  });

  it("keeps LKG across disconnects and applies live Test Mode without polluting it", async () => {
    render(<RuntimeHarness />);

    await waitFor(() => expect(screen.getByTestId("prayerapp-qr")).toBeInTheDocument(), {
      timeout: 15_000,
    });

    const initialLkg = loadLkg();
    expect(initialLkg).not.toBeNull();
    const revision = initialLkg!.snapshot.snapshotRevision;
    expect(screen.getByTestId("prayerapp-qr")).toBeInTheDocument();

    dropDisplayFeed = true;
    window.dispatchEvent(new Event("online"));

    await waitFor(() => expect(screen.getByText(/OFFLINE/i)).toBeInTheDocument(), {
      timeout: 5_000,
    });
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(revision);

    dropDisplayFeed = false;
    window.dispatchEvent(new Event("online"));

    await waitFor(() => expect(screen.queryByText(/OFFLINE/i)).not.toBeInTheDocument(), {
      timeout: 5_000,
    });
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(revision);

    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    const requestsBeforeVisibleWake = displayFeedRequests;

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(
      () => expect(displayFeedRequests).toBeGreaterThan(requestsBeforeVisibleWake),
      { timeout: 5_000 },
    );

    setTestMode(true);

    await waitFor(() => expect(screen.getByTestId("test-mode-badge")).toBeInTheDocument(), {
      timeout: 6_000,
    });
    expect(screen.getByTestId("test-mode-badge")).toHaveTextContent(
      "TEST MODE / وضع الاختبار",
    );
    expect(screen.getByTestId("prayerapp-qr")).toBeInTheDocument();
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(revision);

    setTestMode(false);

    await waitFor(() => expect(screen.queryByTestId("test-mode-badge")).not.toBeInTheDocument(), {
      timeout: 6_000,
    });
    expect(screen.getByTestId("prayerapp-qr")).toBeInTheDocument();
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(revision);
  });
});
