import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DisplayShell } from "../components/DisplayShell";
import { loadLkg } from "../lib/lkg";
import { resolveFridayState } from "../lib/state/friday-state";
import { isFridayIso, localDateIso, zonedDateTime } from "../lib/time";
import { validateFeedV1 } from "../lib/validate-feed";
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
    cleanup();
    vi.unstubAllGlobals();
    setVisibility("visible");
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
    "derives Primary Friday from Dhuhr when no optional extra Jumuah records exist",
    async () => {
      const response = await nativeFetch(`${TV_BASE_URL}/api/display-feed`);
      expect(response.status).toBe(200);

      const feed = validateFeedV1(await response.json());

      const today = localDateIso(new Date(), feed.timezone);
      const friday = feed.prayers.schedule.find(
        (day) => day.date >= today && isFridayIso(day.date),
      );
      expect(friday).toBeDefined();
      if (!friday) throw new Error("Integration seed must cover the next Friday");
      // The nearest Friday intentionally has no optional services even though
      // the second Friday will contain two locally seeded additional services.
      expect(feed.prayers.additionalJumuah.filter((service) => service.date === friday.date))
        .toHaveLength(0);

      const primaryInstant = zonedDateTime(friday.date, friday.dhuhr, feed.timezone);
      expect(
        resolveFridayState(feed, new Date(primaryInstant.getTime() - 30 * 60_000)),
      ).toEqual({
        kind: "FRIDAY_MODE",
        serviceId: `primary:${friday.date}`,
        serviceIndex: 0,
      });
    },
    15_000,
  );

  it(
    "propagates second and third published Friday prayers from the actual Web feed to TV states",
    async () => {
      const response = await nativeFetch(`${TV_BASE_URL}/api/display-feed`);
      expect(response.status).toBe(200);
      const feed = validateFeedV1(await response.json());
      const today = localDateIso(new Date(), feed.timezone);
      const firstFriday = feed.prayers.schedule.find(
        (day) => day.date >= today && isFridayIso(day.date),
      );
      expect(firstFriday).toBeDefined();
      if (!firstFriday) throw new Error("Missing first Friday in local integration schedule");

      const nextFriday = feed.prayers.schedule.find(
        (day) => day.date > firstFriday.date && isFridayIso(day.date),
      );
      expect(nextFriday).toBeDefined();
      if (!nextFriday) throw new Error("Missing following Friday in local integration schedule");
      expect(nextFriday.dhuhr).toBe("13:00");

      const additional = feed.prayers.additionalJumuah
        .filter((service) => service.date === nextFriday.date);
      expect(additional.map((service) => service.prayerTime))
        .toEqual(["14:00", "15:00"]);

      const atPrimary = zonedDateTime(nextFriday.date, nextFriday.dhuhr, feed.timezone);
      expect(resolveFridayState(feed, new Date(atPrimary.getTime() - 30 * 60_000)))
        .toEqual({
          kind: "FRIDAY_MODE",
          serviceId: `primary:${nextFriday.date}`,
          serviceIndex: 0,
        });

      expect(resolveFridayState(
        feed,
        zonedDateTime(nextFriday.date, "13:55", feed.timezone),
      )).toEqual({ kind: "FRIDAY_MODE", serviceId: additional[0].id, serviceIndex: 1 });

      expect(resolveFridayState(
        feed,
        zonedDateTime(nextFriday.date, "14:05", feed.timezone),
      )).toEqual({ kind: "JUMUAH_NOW", serviceId: additional[0].id, serviceIndex: 1 });

      expect(resolveFridayState(
        feed,
        zonedDateTime(nextFriday.date, "14:55", feed.timezone),
      )).toEqual({ kind: "FRIDAY_MODE", serviceId: additional[1].id, serviceIndex: 2 });
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


});
