import { describe, expect, it } from "vitest";
import { legacyReceiptMatchesDueInstant } from "@/lib/android/prayer-event-id";

describe("legacy p2 native receipt compatibility", () => {
  const dueAtMs = Date.parse("2026-08-23T11:30:00.000Z");

  it("accepts a legacy receipt only when it was delivered near the current resolved instant", () => {
    expect(legacyReceiptMatchesDueInstant(
      "p2:" + "a".repeat(64),
      "2026-08-23T11:30:30.000Z",
      dueAtMs,
    )).toBe(true);

    expect(legacyReceiptMatchesDueInstant(
      "p2:" + "a".repeat(64),
      "2026-08-23T04:30:00.000Z",
      dueAtMs,
    )).toBe(false);
  });

  it("does not impose the legacy timestamp compatibility rule on p3 IDs", () => {
    expect(legacyReceiptMatchesDueInstant(
      "p3:" + "b".repeat(64),
      "2026-08-23T04:30:00.000Z",
      dueAtMs,
    )).toBe(true);
  });
});
