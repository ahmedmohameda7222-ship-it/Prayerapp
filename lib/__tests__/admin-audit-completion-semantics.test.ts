import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditRpc: vi.fn(),
  updatePayloads: [] as unknown[],
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-request-id": "audit-completion-regression" })),
}));
vi.mock("@/lib/auth/admin-server", () => ({
  requireAllowedAdminIdentity: vi.fn(async () => ({
    userId: "00000000-0000-4000-8000-000000000901",
    email: "security-test@local.invalid",
  })),
}));
vi.mock("@/lib/push/web-push", () => ({ sendAdminContentPush: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    rpc: mocks.auditRpc,
    from: () => ({
      update: (payload: unknown) => {
        mocks.updatePayloads.push(payload);
        return {
          eq: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: "3f81289b-06dc-4d4f-b4a9-c900165cc147",
                  title: "Announcement",
                  is_urgent: false,
                  published: false,
                },
                error: null,
              }),
            }),
          }),
        };
      },
    }),
  }),
}));

import { togglePublishAnnouncementAction } from "@/app/admin/announcements/actions";

const adminFiles = [
  "app/admin/announcements/actions.ts",
  "app/admin/donations/actions.ts",
  "app/admin/events/actions.ts",
  "app/admin/jumuah/actions.ts",
  "app/admin/jumuah/khutbah-actions.ts",
  "app/admin/prayer-times/actions.ts",
  "app/admin/ramadan/actions.ts",
  "app/admin/settings/actions.ts",
];

describe("admin audit completion semantics", () => {
  beforeEach(() => {
    mocks.auditRpc.mockReset();
    mocks.updatePayloads.length = 0;
  });

  it("does not report a committed privileged mutation as failed when final audit completion fails", async () => {
    mocks.auditRpc
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "audit completion unavailable" } });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const result = await togglePublishAnnouncementAction(
        "valid-admin-token",
        "3f81289b-06dc-4d4f-b4a9-c900165cc147",
        false,
      );

      expect(mocks.updatePayloads).toEqual([{ published: false }]);
      expect(mocks.auditRpc).toHaveBeenCalledTimes(2);
      expect(mocks.auditRpc.mock.calls[0]?.[1]).toMatchObject({
        p_outcome: "attempt",
        p_request_id: "audit-completion-regression",
      });
      expect(mocks.auditRpc.mock.calls[1]?.[1]).toMatchObject({
        p_outcome: "success",
        p_request_id: "audit-completion-regression",
      });
      expect(result).toEqual({
        success: true,
        auditIncomplete: true,
        warning: "admin.errors.auditIncomplete",
      });
      expect(consoleError).toHaveBeenCalledWith(
        "[admin audit] terminal outcome unavailable",
        expect.objectContaining({
          action: "announcement.publish",
          requestId: "audit-completion-regression",
          mutationSucceeded: true,
        }),
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("requires every privileged admin action family to use shared truthful completion semantics", () => {
    for (const file of adminFiles) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source, file).toContain("beginAdminAudit");
      expect(source, file).toContain("completeAdminAudit");
      expect(source, file).not.toContain("finishAdminAudit");
      expect(source, file).not.toContain('if (result.success) return { success: false, error: "admin.errors.auditUnavailable" }');
      expect(source, file).not.toContain('catch { return { success: false, error: "admin.errors.auditUnavailable" }; }');
    }
  });
});
