import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android native receipt v2 contract", () => {
  it("publishes account generation only through authenticated enrollment", () => {
    const enroll = source("app/api/android/native-authority/enroll/route.ts");
    const heartbeat = source("app/api/android/native-authority/heartbeat/route.ts");

    expect(enroll).toContain("accountGeneration");
    expect(enroll).toContain("account_generation: body.accountGeneration");
    expect(enroll).toContain("receipt_v2: false");
    expect(heartbeat).toContain("account_generation");
    expect(heartbeat).toContain("heartbeat.accountGeneration !== row.account_generation");
    expect(heartbeat).not.toContain("account_generation: heartbeat.accountGeneration");
  });

  it("parses legacy heartbeat clients fail-open and receipt-v2 clients with generation", () => {
    const contracts = source("lib/android/contracts.ts");
    expect(contracts).toContain("receiptV2: boolean");
    expect(contracts).toContain("accountGeneration: number");
    expect(contracts).toContain("body.receiptV2 === true");
    expect(contracts).toContain("Number.isInteger(body.accountGeneration)");
  });

  it("persists truthful receipt readiness without allowing heartbeat to advance generation", () => {
    const heartbeat = source("app/api/android/native-authority/heartbeat/route.ts");
    expect(heartbeat).toContain("receipt_v2: heartbeat.receiptV2");
    expect(heartbeat).toContain('select("credential_hash, authority_id, account_generation")');
  });
});
