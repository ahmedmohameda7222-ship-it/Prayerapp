import { describe, expect, it } from "vitest";
import { validateAdditionalJumuah } from "@/lib/admin-jumuah-validation";

const friday = {
  id: "prayer-2026-08-28",
  date: "2026-08-28",
  dhuhr: "12:18",
};

describe("additional Jumuah server validation", () => {
  it("accepts an additional service strictly after Primary", () => {
    expect(validateAdditionalJumuah({
      date: friday.date,
      prayerTime: "13:30",
      primaryPrayer: friday,
      existing: [],
    })).toBeNull();
  });

  it("rejects a service equal to Primary", () => {
    expect(validateAdditionalJumuah({
      date: friday.date,
      prayerTime: "12:18",
      primaryPrayer: friday,
      existing: [],
    })).toBe("not-after-primary");
  });

  it("rejects a service earlier than Primary", () => {
    expect(validateAdditionalJumuah({
      date: friday.date,
      prayerTime: "12:00",
      primaryPrayer: friday,
      existing: [],
    })).toBe("not-after-primary");
  });

  it("rejects a duplicate additional service time", () => {
    expect(validateAdditionalJumuah({
      date: friday.date,
      prayerTime: "13:30",
      primaryPrayer: friday,
      existing: [{ id: "existing", prayerTime: "13:30" }],
    })).toBe("duplicate-time");
  });

  it("ignores the row currently being edited when checking duplicates", () => {
    expect(validateAdditionalJumuah({
      date: friday.date,
      prayerTime: "13:30",
      primaryPrayer: friday,
      existing: [{ id: "existing", prayerTime: "13:30" }],
      editingId: "existing",
    })).toBeNull();
  });

  it("rejects a non-Friday selected date", () => {
    expect(validateAdditionalJumuah({
      date: "2026-08-27",
      prayerTime: "13:30",
      primaryPrayer: { ...friday, date: "2026-08-27" },
      existing: [],
    })).toBe("not-friday");
  });

  it("rejects a missing authoritative prayer-times row", () => {
    expect(validateAdditionalJumuah({
      date: friday.date,
      prayerTime: "13:30",
      primaryPrayer: undefined,
      existing: [],
    })).toBe("missing-primary");
  });

  it("rejects malformed prayer times", () => {
    expect(validateAdditionalJumuah({
      date: friday.date,
      prayerTime: "25:61",
      primaryPrayer: friday,
      existing: [],
    })).toBe("invalid-time");
  });
});
