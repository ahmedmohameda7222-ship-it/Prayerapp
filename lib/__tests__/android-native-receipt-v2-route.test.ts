import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashNativeCredential } from "@/lib/android/native-credentials";

const mocks = vi.hoisted(() => ({ client: null as unknown }));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => mocks.client,
}));

import { POST as RECEIPT } from "@/app/api/android/native-authority/receipt/route";

const installationId = "62a9084e-710a-4aa5-b918-d9f398fb6f67";
const authorityId = "8e5f7ac6-7a84-4d3e-946a-e4f91be50a7c";
const userId = "7a34b15a-1da7-4f3b-ab2d-a2f899de9a6b";
const credential = "a".repeat(43);
const credentialHash = hashNativeCredential(credential);
const eventId = `p2:${"1".repeat(64)}`;

type QueryResult = { data: unknown; error: { message: string } | null };

function query(result: QueryResult | ((updates: unknown[]) => QueryResult)) {
  const filters: Array<[string, unknown]> = [];
  const upserts: unknown[] = [];
  const builder = {
    filters,
    upserts,
    select: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push([column, value]);
      return builder;
    }),
    is: vi.fn((column: string, value: unknown) => {
      filters.push([column, value]);
      return builder;
    }),
    upsert: vi.fn((value: unknown) => {
      upserts.push(value);
      return builder;
    }),
    maybeSingle: vi.fn(async () => typeof result === "function" ? result(upserts) : result),
  };
  return builder;
}

function request(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request("https://donaumoschee.vercel.app/api/android/native-authority/receipt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Native ${credential}`,
      "X-Native-Installation-Id": installationId,
      "X-Native-Authority-Id": authorityId,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function validBody(accountGeneration = 3) {
  return {
    eventId,
    kind: "reminder",
    deliveredAt: "2026-08-23T12:00:00.000Z",
    accountGeneration,
  };
}

describe("native delivery receipt v2 ingestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a current generation receipt idempotently", async () => {
    const lookup = query({
      data: {
        authority_id: authorityId,
        credential_hash: credentialHash,
        user_id: userId,
        account_generation: 3,
        receipt_v2: true,
      },
      error: null,
    });
    const insert = query({ data: { event_id: eventId }, error: null });
    mocks.client = { from: vi.fn().mockReturnValueOnce(lookup).mockReturnValueOnce(insert) };

    const response = await RECEIPT(request(validBody()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(lookup.filters).toEqual(expect.arrayContaining([
      ["installation_id", installationId],
      ["authority_id", authorityId],
      ["revoked_at", null],
    ]));
    expect(insert.upserts[0]).toEqual(expect.objectContaining({
      installation_id: installationId,
      user_id: userId,
      event_id: eventId,
      kind: "reminder",
      account_generation: 3,
      delivered_at: "2026-08-23T12:00:00.000Z",
    }));
  });

  it("rejects a stale account generation before writing a receipt", async () => {
    const lookup = query({
      data: {
        authority_id: authorityId,
        credential_hash: credentialHash,
        user_id: userId,
        account_generation: 4,
        receipt_v2: true,
      },
      error: null,
    });
    const from = vi.fn().mockReturnValueOnce(lookup);
    mocks.client = { from };

    const response = await RECEIPT(request(validBody(3)));

    expect(response.status).toBe(409);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("rejects receipt ingestion until the current installation advertises receipt v2", async () => {
    const lookup = query({
      data: {
        authority_id: authorityId,
        credential_hash: credentialHash,
        user_id: userId,
        account_generation: 3,
        receipt_v2: false,
      },
      error: null,
    });
    const from = vi.fn().mockReturnValueOnce(lookup);
    mocks.client = { from };

    const response = await RECEIPT(request(validBody()));

    expect(response.status).toBe(409);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed canonical receipt identities before database access", async () => {
    const from = vi.fn();
    mocks.client = { from };

    const response = await RECEIPT(request({ ...validBody(), eventId: "legacy-event" }));

    expect(response.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
});
