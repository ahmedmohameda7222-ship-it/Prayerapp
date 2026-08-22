import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashNativeCredential } from "@/lib/android/native-credentials";

const mocks = vi.hoisted(() => ({ client: null as unknown }));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => mocks.client,
}));

import { DELETE, POST } from "@/app/api/android/native-authority/heartbeat/route";

const installationId = "62a9084e-710a-4aa5-b918-d9f398fb6f67";
const authorityId = "8e5f7ac6-7a84-4d3e-946a-e4f91be50a7c";
const credential = "a".repeat(43);
const credentialHash = hashNativeCredential(credential);

type QueryResult = { data: unknown; error: { message: string } | null };

function query(result: QueryResult) {
  const filters: Array<[string, unknown]> = [];
  const builder = {
    filters,
    select: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push([column, value]);
      return builder;
    }),
    maybeSingle: vi.fn(async () => result),
  };
  return builder;
}

function heartbeatBody() {
  return {
    notificationPermission: true,
    notificationDeliveryEnabled: true,
    reminderChannelEnabled: true,
    adhanChannelEnabled: true,
    exactAlarmPermission: true,
    scheduleFresh: true,
    alarmScheduleInstalled: true,
    audioReady: true,
    engineHealthy: true,
    scheduleValidUntil: "2026-08-25T00:00:00.000Z",
  };
}

function nativeHeaders(includeAuthority = true) {
  return {
    Authorization: `Native ${credential}`,
    "X-Native-Installation-Id": installationId,
    ...(includeAuthority ? { "X-Native-Authority-Id": authorityId } : {}),
  };
}

describe("native authority route generation isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a heartbeat whose generation changes between validation and mutation", async () => {
    const lookup = query({ data: { authority_id: authorityId, credential_hash: credentialHash }, error: null });
    const mutation = query({ data: null, error: null });
    const from = vi.fn()
      .mockReturnValueOnce(lookup)
      .mockReturnValueOnce(mutation);
    mocks.client = { from };

    const response = await POST(new Request("https://donaumoschee.vercel.app/api/android/native-authority/heartbeat", {
      method: "POST",
      headers: nativeHeaders(),
      body: JSON.stringify(heartbeatBody()),
    }));

    expect(response.status).toBe(409);
    expect(lookup.filters).toContainEqual(["authority_id", authorityId]);
    expect(mutation.filters).toEqual(expect.arrayContaining([
      ["installation_id", installationId],
      ["authority_id", authorityId],
      ["credential_hash", credentialHash],
    ]));
  });

  it("allows a legacy client to revoke only the exact generation it read", async () => {
    const lookup = query({ data: { authority_id: authorityId, credential_hash: credentialHash }, error: null });
    const mutation = query({ data: { authority_id: authorityId }, error: null });
    const from = vi.fn()
      .mockReturnValueOnce(lookup)
      .mockReturnValueOnce(mutation);
    mocks.client = { from };

    const response = await DELETE(new Request("https://donaumoschee.vercel.app/api/android/native-authority/heartbeat", {
      method: "DELETE",
      headers: nativeHeaders(false),
    }));

    expect(response.status).toBe(200);
    expect(lookup.filters).toEqual([["installation_id", installationId]]);
    expect(mutation.filters).toEqual(expect.arrayContaining([
      ["installation_id", installationId],
      ["authority_id", authorityId],
      ["credential_hash", credentialHash],
    ]));
  });
});
