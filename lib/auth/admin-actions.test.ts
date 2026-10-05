import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

import { verifyAdminAction } from "./admin-actions";

describe("verifyAdminAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAILS = "admin@example.com";
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          user_metadata: { display_name: "Admin" },
        },
      },
      error: null,
    });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ upsert: mocks.upsert });
  });

  it("authenticates a token once and performs no passive admin_users write", async () => {
    await expect(verifyAdminAction("stable-admin-token")).resolves.toEqual({
      allowed: true,
      email: "admin@example.com",
    });

    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    expect(mocks.getUser).toHaveBeenCalledWith("stable-admin-token");
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
