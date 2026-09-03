import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type LedgerControl = {
  id: string;
  original_status: string;
  implementation_owner: string | null;
  closure_evidence_type: string | null;
  applicable_remediation_wave: number | null;
  current_disposition: string | null;
  evidence_refs: unknown[];
  reviewer: string | null;
};

type Ledger = {
  audit_open_counts: {
    FAIL: number;
    NOT_VERIFIED: number;
    TOTAL: number;
  };
  controls: LedgerControl[];
};

const ledgerPath = join(
  process.cwd(),
  "docs/security/prelaunch/2026-09-02/open-control-closure-ledger.json",
);

const loadLedger = () => JSON.parse(readFileSync(ledgerPath, "utf8")) as Ledger;

const nonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

describe("prelaunch open-control closure ledger", () => {
  it("preserves the authoritative 324-control audit population and continuous IDs", () => {
    const ledger = loadLedger();
    const ids = ledger.controls.map((control) => control.id);
    const expectedIds = Array.from(
      { length: 324 },
      (_, index) => `OPEN-${String(index + 1).padStart(3, "0")}`,
    );

    expect(ledger.controls).toHaveLength(324);
    expect(new Set(ids).size).toBe(324);
    expect([...ids].sort()).toEqual([...expectedIds].sort());

    const failCount = ledger.controls.filter((control) => control.original_status === "FAIL").length;
    const notVerifiedCount = ledger.controls.filter(
      (control) => control.original_status === "NOT VERIFIED",
    ).length;

    expect(failCount).toBe(54);
    expect(notVerifiedCount).toBe(270);
    expect(ledger.audit_open_counts).toEqual({ FAIL: 54, NOT_VERIFIED: 270, TOTAL: 324 });
  });

  it("assigns every control an implementation owner, independent reviewer, evidence type, wave, and disposition", () => {
    const ledger = loadLedger();

    for (const control of ledger.controls) {
      expect(nonEmptyString(control.implementation_owner), `${control.id} implementation_owner`).toBe(true);
      expect(nonEmptyString(control.reviewer), `${control.id} reviewer`).toBe(true);
      expect(control.reviewer?.toLowerCase(), `${control.id} reviewer independence`).toContain("independent");
      expect(nonEmptyString(control.closure_evidence_type), `${control.id} closure_evidence_type`).toBe(true);
      expect(Number.isInteger(control.applicable_remediation_wave), `${control.id} applicable_remediation_wave`).toBe(true);
      expect(
        (control.applicable_remediation_wave ?? -1) >= 0 &&
          (control.applicable_remediation_wave ?? 7) <= 6,
        `${control.id} applicable_remediation_wave range`,
      ).toBe(true);
      expect(nonEmptyString(control.current_disposition), `${control.id} current_disposition`).toBe(true);
    }
  });

  it("does not silently mark PASS or N/A without independent closure evidence", () => {
    const ledger = loadLedger();

    for (const control of ledger.controls) {
      const disposition = control.current_disposition?.trim().toUpperCase();
      if (disposition !== "PASS" && disposition !== "N/A") continue;

      expect(nonEmptyString(control.reviewer), `${control.id} reviewer`).toBe(true);
      expect(control.reviewer?.toLowerCase(), `${control.id} reviewer independence`).toContain("independent");
      expect(Array.isArray(control.evidence_refs), `${control.id} evidence_refs`).toBe(true);
      expect(control.evidence_refs.length, `${control.id} closure evidence`).toBeGreaterThan(0);
      expect(
        control.evidence_refs.every((reference) => nonEmptyString(reference)),
        `${control.id} closure evidence refs`,
      ).toBe(true);
    }
  });
});
