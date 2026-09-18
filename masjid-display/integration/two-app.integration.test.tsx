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
const PRODUCTION_PUBLIC_APP_URL = "https://prayer.example.test/";

let dropDisplayFeed = false;
let displayFeedRequests = 0;

function setVisibility(value: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value,
  });
}

function runAdminTestAction(action: "start" | "stop") {
  const repoRoot = path.resolve(process.cwd(), "..");

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

function expireTestModeInDatabase() {
  const container = process.env.SUPABASE_DB_CONTAINER;
  if (!container) throw new Error("SUPABASE_DB_CONTAINER is required");

  execFileSync(
    "docker",
    [
      "exec",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      "update public.masjid_display_test_state set expires_at = now() - interval '1 second', updated_at = now() where id = '1';",
    ],
    {
      encoding: "utf8",
      stdio: "pipe",
    },
  );
}

function RuntimeHarness() {
  const vm = useDisplayRuntime();
  return (
    <>
      <DisplayShell vm={vm} />
      <output data-testid="runtime-public-app-url" hidden>
        {vm.publicAppUrl ?? ""}
      </output>
    </>
  );
}

async function waitForProductionRuntime() {
  await waitFor(() => expect(screen.getByTestId("prayerapp-qr")).toBeInTheDocument(), {
    timeout: 15_000,
  });
  const lkg = loadLkg();
  expect(lkg).not.toBeNull();
  expect(screen.getByTestId("runtime-public-app-url")).toHaveTextContent(
    PRODUCTION_PUBLIC_APP_URL,
  );
  return lkg!;
}

integrationDescribe("live Prayerapp + Masjid Display integration", () => {
  beforeEach(() => {
    localStorage.clear();
    dropDisplayFeed = false;
    displayFeedRequests = 0;
    setVisibility("visible");

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
      runAdminTestAction("stop");
    } finally {
      cleanup();
      vi.unstubAllGlobals();
      setVisibility("visible");
    }
  });

  it(
    "preserves Feed 200 -> ETag -> 304 semantics through the live TV proxy",
    async () => {
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
    },
    15_000,
  );

  it(
    "keeps validated LKG across disconnect, reconnect, and visible wake refresh",
    async () => {
      render(<RuntimeHarness />);

      const initialLkg = await waitForProductionRuntime();
      const revision = initialLkg.snapshot.snapshotRevision;

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
      expect(loadLkg()?.snapshot.snapshotRevision).toBe(revision);
    },
    20_000,
  );

  it(
    "drives the renderer through the authenticated Admin Test Mode path without LKG pollution",
    async () => {
      render(<RuntimeHarness />);

      const initialLkg = await waitForProductionRuntime();
      const revision = initialLkg.snapshot.snapshotRevision;

      runAdminTestAction("start");

      await waitFor(
        () => expect(screen.getByTestId("test-mode-badge")).toBeInTheDocument(),
        { timeout: 7_000 },
      );
      expect(screen.getByTestId("test-mode-badge")).toHaveTextContent(
        "TEST MODE / وضع الاختبار",
      );
      expect(
        screen.getByTestId("prayer-state-prayer-approaching"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("prayerapp-qr")).toBeInTheDocument();
      expect(screen.getByTestId("runtime-public-app-url")).toHaveTextContent(
        PRODUCTION_PUBLIC_APP_URL,
      );
      expect(loadLkg()?.snapshot.snapshotRevision).toBe(revision);

      const firstCountdown = screen.getByTestId("state-countdown").textContent;
      await waitFor(
        () =>
          expect(screen.getByTestId("state-countdown").textContent).not.toBe(
            firstCountdown,
          ),
        { timeout: 3_500 },
      );
      expect(loadLkg()?.snapshot.snapshotRevision).toBe(revision);

      runAdminTestAction("stop");

      await waitFor(
        () => expect(screen.queryByTestId("test-mode-badge")).not.toBeInTheDocument(),
        { timeout: 7_000 },
      );
      expect(screen.queryByTestId("prayer-state-prayer-approaching")).not.toBeInTheDocument();
      expect(screen.getByTestId("prayerapp-qr")).toBeInTheDocument();
      expect(screen.getByTestId("runtime-public-app-url")).toHaveTextContent(
        PRODUCTION_PUBLIC_APP_URL,
      );
      expect(loadLkg()?.snapshot.snapshotRevision).toBe(revision);
    },
    30_000,
  );

  it(
    "expires an Admin-started Test Mode directive through the public control path",
    async () => {
      render(<RuntimeHarness />);

      const initialLkg = await waitForProductionRuntime();
      const revision = initialLkg.snapshot.snapshotRevision;

      runAdminTestAction("start");
      await waitFor(
        () => expect(screen.getByTestId("test-mode-badge")).toBeInTheDocument(),
        { timeout: 7_000 },
      );

      expireTestModeInDatabase();

      await waitFor(
        () => expect(screen.queryByTestId("test-mode-badge")).not.toBeInTheDocument(),
        { timeout: 7_000 },
      );

      const control = await nativeFetch(`${TV_BASE_URL}/api/test-control`);
      expect(control.status).toBe(200);
      await expect(control.json()).resolves.toEqual({ active: false });
      expect(screen.getByTestId("prayerapp-qr")).toBeInTheDocument();
      expect(screen.getByTestId("runtime-public-app-url")).toHaveTextContent(
        PRODUCTION_PUBLIC_APP_URL,
      );
      expect(loadLkg()?.snapshot.snapshotRevision).toBe(revision);
    },
    20_000,
  );
});
