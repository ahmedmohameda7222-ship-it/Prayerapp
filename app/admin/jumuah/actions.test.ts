import { beforeEach, describe, expect, it, vi } from "vitest";
import { togglePublishJumuahAction } from "./actions";

const mocks = vi.hoisted(() => ({
  primary: { date: "2026-11-13", dhuhr: "12:18" },
  extra: {
    id: "11111111-1111-4111-8111-111111111111",
    date: "2026-11-13",
    prayer_time: "12:10",
    published: false,
    location_name: "Test Mosque",
  },
  update: vi.fn(),
  sendPush: vi.fn(async () => undefined),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/jumuah", () => ({ invalidateJumuahPublicCache: vi.fn() }));
vi.mock("@/lib/push/web-push", () => ({ sendAdminContentPush: mocks.sendPush }));
vi.mock("@/lib/security/admin-audit", () => ({
  beginAdminAudit: vi.fn(async () => ({ requestId: "test" })),
  completeAdminAudit: vi.fn(async (_audit: unknown, result: unknown) => result),
  adminActionError: vi.fn(() => "admin.errors.invalidInput"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      if (table === "prayer_times") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: mocks.primary, error: null }),
            }),
          }),
        };
      }
      if (table === "jumuah_times") {
        return {
          select: () => ({
            eq: (column: string) => {
              if (column === "id") {
                return { maybeSingle: async () => ({ data: { ...mocks.extra }, error: null }) };
              }
              if (column === "date") {
                return Promise.resolve({
                  data: [{ id: mocks.extra.id, prayer_time: mocks.extra.prayer_time }],
                  error: null,
                });
              }
              throw new Error(`Unexpected Jumuah query column: ${column}`);
            },
          }),
          update: (change: { published: boolean }) => {
            mocks.update(change);
            return {
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: { ...mocks.extra, ...change },
                    error: null,
                  }),
                }),
              }),
            };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

describe("Additional Jumuah Admin publish behavior", () => {
  beforeEach(() => {
    mocks.extra.prayer_time = "12:10";
    mocks.extra.published = false;
    mocks.primary.dhuhr = "12:18";
    mocks.update.mockClear();
    mocks.sendPush.mockClear();
  });

  it("rejects publishing an invalid legacy extra instead of announcing a hidden service", async () => {
    const result = await togglePublishJumuahAction("test-token", mocks.extra.id, true);

    expect(result).toMatchObject({ success: false });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.sendPush).not.toHaveBeenCalled();
  });

  it("still publishes a valid additional prayer after Primary", async () => {
    mocks.extra.prayer_time = "13:30";

    const result = await togglePublishJumuahAction("test-token", mocks.extra.id, true);

    expect(result).toMatchObject({ success: true });
    expect(mocks.update).toHaveBeenCalledWith({ published: true });
    expect(mocks.sendPush).toHaveBeenCalledOnce();
  });

  it("allows unpublishing an invalid legacy row safely", async () => {
    const result = await togglePublishJumuahAction("test-token", mocks.extra.id, false);

    expect(result).toMatchObject({ success: true });
    expect(mocks.update).toHaveBeenCalledWith({ published: false });
    expect(mocks.sendPush).not.toHaveBeenCalled();
  });
});
