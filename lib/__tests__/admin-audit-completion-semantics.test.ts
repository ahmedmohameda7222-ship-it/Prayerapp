import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const beginAdminAudit = vi.fn();
const finishAdminAudit = vi.fn();
const updatePayloads: unknown[] = [];

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/push/web-push", () => ({ sendAdminContentPush: vi.fn() }));
vi.mock("@/lib/security/admin-audit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/security/admin-audit")>("@/lib/security/admin-audit");
  return {
    ...actual,
    beginAdminAudit,
    finishAdminAudit,
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    from: () => ({
      update: (payload: unknown) => {
        updatePayloads.push(payload);
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
    beginAdminAudit.mockReset();
    finishAdminAudit.mockReset();
    updatePayloads.length = 0;
    beginAdminAudit.mockResolvedValue({ auditId: "audit-1" });
  });

  it("does not report a committed privileged mutation as failed when final audit completion fails", async () => {
    finishAdminAudit.mockRejectedValue(new Error("audit completion unavailable"));

    const result = await togglePublishAnnouncementAction(
      "valid-admin-token",
      "3f81289b-06dc-4d4f-b4a9-c900165cc147",
      false,
    );

    expect(updatePayloads).toEqual([{ published: false }]);
    expect(result).toEqual({
      success: true,
      auditIncomplete: true,
      warning: "admin.errors.auditIncomplete",
    });
  });

  it("requires every privileged admin action family to use shared truthful completion semantics", () => {
    for (const file of adminFiles) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source, file).not.toContain('if (result.success) return { success: false, error: "admin.errors.auditUnavailable" }');
      expect(source, file).not.toContain('catch { return { success: false, error: "admin.errors.auditUnavailable" }; }');
      expect(source, file).toContain("completeAdminAudit");
    }
  });
});
