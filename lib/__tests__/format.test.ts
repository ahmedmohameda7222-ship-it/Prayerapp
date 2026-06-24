import { describe, it, expect } from "vitest";
import { to12Hour, formatCurrency, percent } from "@/lib/format";

describe("format utilities", () => {
  it("to12Hour converts 24h to 12h", () => {
    expect(to12Hour("13:30")).toBe("1:30 PM");
    expect(to12Hour("00:00")).toBe("12:00 AM");
    expect(to12Hour("12:00")).toBe("12:00 PM");
    expect(to12Hour("23:45")).toBe("11:45 PM");
    expect(to12Hour("09:15")).toBe("9:15 AM");
  });

  it("formatCurrency formats EUR with German locale", () => {
    const result = formatCurrency(1500);
    expect(result).toContain("1.500");
    expect(result).toContain("€");
  });

  it("percent calculates percentage correctly", () => {
    expect(percent(50, 100)).toBe(50);
    expect(percent(75, 100)).toBe(75);
    expect(percent(0, 100)).toBe(0);
    expect(percent(150, 100)).toBe(100);
    expect(percent(10, 0)).toBe(0);
  });
});
