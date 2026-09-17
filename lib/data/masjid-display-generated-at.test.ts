import { describe, expect, it, vi } from "vitest";
import { getAzkarSourceRevisionTimestamps } from "./azkar";
import { getMasjidDisplayGeneratedAt } from "./masjid-display-generated-at";

vi.mock("server-only", () => ({}));

const SOURCE_TIMESTAMP = "2026-06-01T10:00:00.000Z";
const CURRENT_AZKAR_ITEM_ID = "morning-praise-allah-alone";
const CURRENT_AZKAR_SOURCE_REVISION = "2026-08-22T21:46:19.000Z";

describe("Azkar generatedAt source revisions", () => {
  it("uses an explicit deterministic source timestamp for represented hardcoded Azkar", () => {
    expect(getAzkarSourceRevisionTimestamps([CURRENT_AZKAR_ITEM_ID])).toEqual([
      CURRENT_AZKAR_SOURCE_REVISION,
    ]);
  });

  it("is stable for unchanged represented Azkar source revisions", async () => {
    const revisions = getAzkarSourceRevisionTimestamps([CURRENT_AZKAR_ITEM_ID]);
    const sources = {
      sourceTimestamps: [SOURCE_TIMESTAMP],
      azkarRevisionTimestamps: revisions,
    };

    const first = await getMasjidDisplayGeneratedAt(sources, "2026-05-31T22:00:00.000Z");
    const second = await getMasjidDisplayGeneratedAt(sources, "2026-05-31T22:00:00.000Z");

    expect(first).toBe(CURRENT_AZKAR_SOURCE_REVISION);
    expect(second).toBe(first);
  });

  it("changes deterministically when the represented selected Azkar source revision changes", async () => {
    const baseSources = {
      sourceTimestamps: [SOURCE_TIMESTAMP],
      azkarRevisionTimestamps: [CURRENT_AZKAR_SOURCE_REVISION],
    };
    const changedRevision = "2026-09-18T08:15:00.000Z";

    const original = await getMasjidDisplayGeneratedAt(baseSources, "2026-05-31T22:00:00.000Z");
    const changed = await getMasjidDisplayGeneratedAt(
      { ...baseSources, azkarRevisionTimestamps: [changedRevision] },
      "2026-05-31T22:00:00.000Z",
    );

    expect(original).toBe(CURRENT_AZKAR_SOURCE_REVISION);
    expect(changed).toBe(changedRevision);
  });

  it("does not include an unrelated unselected Azkar item revision", () => {
    expect(getAzkarSourceRevisionTimestamps([CURRENT_AZKAR_ITEM_ID])).toHaveLength(1);
  });
});

describe("getMasjidDisplayGeneratedAt", () => {
  it("uses the latest captured represented source timestamp even when it predates the local-day fallback", async () => {
    const generatedAt = await getMasjidDisplayGeneratedAt(
      {
        sourceTimestamps: [SOURCE_TIMESTAMP],
        azkarRevisionTimestamps: [],
      },
      "2026-09-15T00:00:00.000Z",
    );

    expect(Date.parse(generatedAt)).toBe(Date.parse(SOURCE_TIMESTAMP));
  });

  it("takes the maximum only across timestamps supplied by represented source reads", async () => {
    const generatedAt = await getMasjidDisplayGeneratedAt(
      {
        sourceTimestamps: [
          "2026-06-01T10:00:00.000Z",
          "2026-07-02T11:30:00.000Z",
          "2026-06-15T08:00:00.000Z",
        ],
        azkarRevisionTimestamps: [],
      },
      "2026-09-15T00:00:00.000Z",
    );

    expect(generatedAt).toBe("2026-07-02T11:30:00.000Z");
  });
});
