import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

type AdhanWindowClient = {
  focused: boolean;
  visibilityState: "visible" | "hidden";
  url: string;
  postMessage: ReturnType<typeof vi.fn>;
};

function createWindowClient(
  focused: boolean,
  visibilityState: "visible" | "hidden",
  path = "/",
): AdhanWindowClient {
  return { focused, visibilityState, url: `https://example.test${path}`, postMessage: vi.fn() };
}

function runPrayerPush(clients: AdhanWindowClient[], kind: "adhan" | "prayer-reminder" = "adhan") {
  const listeners = new Map<string, (event: {
    data?: { json: () => unknown };
    waitUntil: (promise: Promise<unknown>) => void;
  }) => void>();
  const showNotification = vi.fn(async () => undefined);
  const worker = {
    location: { origin: "https://example.test" },
    addEventListener: (type: string, callback: (event: never) => void) => {
      listeners.set(type, callback as (event: {
        data?: { json: () => unknown };
        waitUntil: (promise: Promise<unknown>) => void;
      }) => void);
    },
    registration: { showNotification },
    clients: { matchAll: vi.fn(async () => clients) },
  };
  const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
  runInNewContext(source, { self: worker, URL, Date });

  let completion: Promise<unknown> | null = null;
  const expiresAt = new Date(Date.now() + 120_000).toISOString();
  const payload = {
    title: "Prayer reminder",
    body: "Prayer is due",
    kind,
    tag: "prayer-2026-11-08-fajr",
    prayer: "fajr",
    date: "2026-11-08",
    eventId: "event-fajr-001",
    dueAt: new Date().toISOString(),
    expiresAt,
    url: "/#prayer-times",
  };
  const onPush = listeners.get("push");
  if (!onPush) throw new Error("Missing push event handler");
  onPush({
    data: { json: () => payload },
    waitUntil: (promise) => { completion = promise; },
  });
  if (!completion) throw new Error("Push handler did not extend event lifetime");

  return { completion, showNotification, payload };
}

describe("Service Worker Adhan delivery across open tabs", () => {
  it("sends ADHAN_DUE only to the focused client when several tabs are open", async () => {
    const hidden = createWindowClient(false, "hidden");
    const focused = createWindowClient(true, "visible");
    const otherVisible = createWindowClient(false, "visible");
    const { completion, showNotification, payload } = runPrayerPush([hidden, otherVisible, focused]);
    await completion;

    expect(showNotification).toHaveBeenCalledOnce();
    expect(focused.postMessage).toHaveBeenCalledOnce();
    expect(focused.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "ADHAN_DUE",
      tag: payload.tag,
      prayer: "fajr",
    }));
    expect(hidden.postMessage).not.toHaveBeenCalled();
    expect(otherVisible.postMessage).not.toHaveBeenCalled();
  });

  it("uses one visible client when no client is focused", async () => {
    const hidden = createWindowClient(false, "hidden");
    const firstVisible = createWindowClient(false, "visible");
    const secondVisible = createWindowClient(false, "visible");
    const { completion } = runPrayerPush([hidden, firstVisible, secondVisible]);
    await completion;

    expect(firstVisible.postMessage).toHaveBeenCalledOnce();
    expect(hidden.postMessage).not.toHaveBeenCalled();
    expect(secondVisible.postMessage).not.toHaveBeenCalled();
  });

  it("never picks a focused admin tab that has no public audio runtime", async () => {
    const admin = createWindowClient(true, "visible", "/admin/events");
    const publicApp = createWindowClient(false, "visible", "/prayer-times");
    const { completion, showNotification } = runPrayerPush([admin, publicApp]);
    await completion;

    expect(showNotification).toHaveBeenCalledOnce();
    expect(publicApp.postMessage).toHaveBeenCalledOnce();
    expect(admin.postMessage).not.toHaveBeenCalled();
  });

  it("does not send audio commands when only admin tabs are open", async () => {
    const admin = createWindowClient(true, "visible", "/admin");
    const { completion, showNotification } = runPrayerPush([admin]);
    await completion;

    expect(showNotification).toHaveBeenCalledOnce();
    expect(admin.postMessage).not.toHaveBeenCalled();
  });

  it("still displays the system notification when no browser tab is open", async () => {
    const { completion, showNotification } = runPrayerPush([]);
    await completion;

    expect(showNotification).toHaveBeenCalledOnce();
  });

  it("never broadcasts Adhan audio for pre-prayer reminders", async () => {
    const focused = createWindowClient(true, "visible");
    const { completion, showNotification } = runPrayerPush([focused], "prayer-reminder");
    await completion;

    expect(showNotification).toHaveBeenCalledOnce();
    expect(focused.postMessage).not.toHaveBeenCalled();
  });
});
