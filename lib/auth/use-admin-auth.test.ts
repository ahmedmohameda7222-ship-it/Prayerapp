import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminAuth } from "./use-admin-auth";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  verifyAdminAction: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: mocks.getSession,
      signOut: mocks.signOut,
      signInWithPassword: vi.fn(),
    },
  }),
}));

vi.mock("./admin-actions", () => ({
  verifyAdminAction: mocks.verifyAdminAction,
}));

function Consumer({ label }: { label: string }) {
  const { isAdmin, loading } = useAdminAuth();
  return React.createElement(
    "div",
    { "data-testid": label },
    loading ? "loading" : String(isAdmin),
  );
}

describe("useAdminAuth shared bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "stable-admin-token",
          user: { id: "admin-1", email: "admin@example.com" },
        },
      },
      error: null,
    });
    mocks.verifyAdminAction.mockResolvedValue({ allowed: true, email: "admin@example.com" });
  });

  it("bootstraps and verifies one stable session only once for multiple admin consumers", async () => {
    render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(Consumer, { label: "first" }),
        React.createElement(Consumer, { label: "second" }),
        React.createElement(Consumer, { label: "third" }),
      ),
    );

    await waitFor(() => {
      expect(screen.getByTestId("first")).toHaveTextContent("true");
      expect(screen.getByTestId("second")).toHaveTextContent("true");
      expect(screen.getByTestId("third")).toHaveTextContent("true");
    });

    expect(mocks.getSession).toHaveBeenCalledTimes(1);
    expect(mocks.verifyAdminAction).toHaveBeenCalledTimes(1);
    expect(mocks.verifyAdminAction).toHaveBeenCalledWith("stable-admin-token");
  });
});
