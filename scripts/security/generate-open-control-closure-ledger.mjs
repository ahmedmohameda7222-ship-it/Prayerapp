import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const matrixPath = resolve(
  root,
  "docs/security/prelaunch/2026-09-02/approved-open-control-matrix.json",
);
const ledgerPath = resolve(
  root,
  "docs/security/prelaunch/2026-09-02/open-control-closure-ledger.json",
);

const EXPECTED_COUNTS = { FAIL: 54, NOT_VERIFIED: 270, TOTAL: 324 };
const BRANCH = "security/prelaunch-remediation-2026-09-02";
const GENERATED_AT = "2026-09-02T17:12:14Z";
const INDEPENDENT_REVIEWER = "independent security reviewer";

const evidenceOwners = new Map([
  [
    "Exact-head release evidence",
    "implementation: release evidence assembler; approval: user; verification: independent reviewer",
  ],
  [
    "Production Supabase schema/config/log evidence",
    "implementation: Supabase evidence preparer; approval: user; verification: independent reviewer",
  ],
  [
    "Documented runbook/model plus exercised evidence",
    "implementation: operations/security documentation owner; verification: independent reviewer",
  ],
  [
    "Automated test + durable audit-log evidence",
    "implementation: admin audit remediation engineer; verification: independent reviewer",
  ],
  [
    "RED→GREEN automated regression + live/black-box evidence",
    "implementation: web/API remediation engineer; verification: independent reviewer",
  ],
  [
    "CI scan/SBOM artifact",
    "implementation: CI/security supply-chain engineer; verification: independent reviewer",
  ],
  [
    "GitHub ruleset/config evidence",
    "implementation: repository governance preparer; approval: user; verification: independent reviewer",
  ],
  [
    "Signed artifact/static analysis/device evidence",
    "implementation: Android remediation engineer; approval: user; verification: independent reviewer",
  ],
  [
    "Authorized DAST evidence + retest",
    "implementation: DAST evidence preparer; approval: user; verification: independent reviewer",
  ],
]);

const codeConfigOwnersByWave = new Map([
  [0, "implementation: security inventory/evidence engineer; verification: independent reviewer"],
  [1, "implementation: auth/authorization evidence engineer; verification: independent reviewer"],
  [3, "implementation: repository/secrets governance evidence engineer; verification: independent reviewer"],
  [4, "implementation: Android security verification engineer; verification: independent reviewer"],
  [5, "implementation: production hosting security evidence engineer; verification: independent reviewer"],
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectedIds() {
  return Array.from(
    { length: EXPECTED_COUNTS.TOTAL },
    (_, index) => `OPEN-${String(index + 1).padStart(3, "0")}`,
  );
}

function ownerFor(control) {
  if (control.required_evidence === "Code/config review plus reproducible verification evidence") {
    const owner = codeConfigOwnersByWave.get(control.wave);
    if (!owner) {
      throw new Error(
        `${control.id}: unmapped code/config ownership wave ${String(control.wave)}`,
      );
    }
    return owner;
  }

  const owner = evidenceOwners.get(control.required_evidence);
  if (!owner) {
    throw new Error(
      `${control.id}: unmapped required_evidence class ${JSON.stringify(control.required_evidence)}`,
    );
  }
  return owner;
}

function validateMatrix(matrix) {
  assert(Array.isArray(matrix.controls), "matrix.controls must be an array");
  assert(matrix.controls.length === EXPECTED_COUNTS.TOTAL, "matrix must contain exactly 324 controls");

  const ids = matrix.controls.map((control) => control.id);
  assert(new Set(ids).size === EXPECTED_COUNTS.TOTAL, "matrix control IDs must be unique");
  assert(
    JSON.stringify([...ids].sort()) === JSON.stringify(expectedIds().sort()),
    "matrix must contain every control ID OPEN-001 through OPEN-324 exactly once",
  );

  const fail = matrix.controls.filter((control) => control.audit_status === "FAIL").length;
  const notVerified = matrix.controls.filter(
    (control) => control.audit_status === "NOT VERIFIED",
  ).length;
  assert(fail === EXPECTED_COUNTS.FAIL, `matrix FAIL count must be ${EXPECTED_COUNTS.FAIL}`);
  assert(
    notVerified === EXPECTED_COUNTS.NOT_VERIFIED,
    `matrix NOT VERIFIED count must be ${EXPECTED_COUNTS.NOT_VERIFIED}`,
  );
  assert(
    JSON.stringify(matrix.audit_open_counts) === JSON.stringify(EXPECTED_COUNTS),
    "matrix audit_open_counts do not match the binding 54/270/324 counts",
  );

  for (const control of matrix.controls) ownerFor(control);
}

function buildLedger(matrix) {
  validateMatrix(matrix);

  return {
    repository: matrix.repository,
    audit_sha: matrix.audit_sha,
    production_supabase: matrix.production_supabase,
    production_web: matrix.production_web,
    audit_open_counts: EXPECTED_COUNTS,
    generated_at: GENERATED_AT,
    branch: BRANCH,
    head: matrix.audit_sha,
    controls: matrix.controls.map((control) => ({
      id: control.id,
      wave: control.wave,
      wave_name: control.wave_name,
      section: control.section,
      section_title: control.section_title,
      original_status: control.audit_status,
      control: control.control,
      target_status: control.target_status,
      required_evidence: control.required_evidence,
      implementation_owner: ownerFor(control),
      closure_evidence_type: control.required_evidence,
      applicable_remediation_wave: control.wave,
      current_disposition: "OPEN",
      evidence_refs: [],
      reviewer: INDEPENDENT_REVIEWER,
      closure_rule: control.closure_rule,
    })),
  };
}

const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
const generated = `${JSON.stringify(buildLedger(matrix), null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = readFileSync(ledgerPath, "utf8").replace(/\r\n/gu, "\n");
  if (current !== generated) {
    console.error("open-control-closure-ledger.json is stale; regenerate it with this script");
    process.exitCode = 1;
  }
} else {
  writeFileSync(ledgerPath, generated, "utf8");
}
