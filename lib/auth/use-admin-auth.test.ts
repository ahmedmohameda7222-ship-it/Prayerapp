import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAuthProvider, useAdminAuth } from "./use-admin-auth";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  signOut: vi.fn(),
  signInWithPassword: vi.fn(),
  verifyAdminAction: vi.fn(),
  establishAdminSessionAction: vi.fn(),
  push: vi.fn(),
  publicAuth: {
    session: null as null | {
      access_token: string;
      user: { id: string; email: string };
    },
    user: null as null | { id: string; email: string },
    loading: false,
    refreshSession: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  usePublicAuth: () => mocks.publicAuth,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: mocks.createClient,
}));

vi.mock("./admin-actions", () => ({
  verifyAdminAction: mocks.verifyAdminAction,
  establishAdminSessionAction: mocks.establishAdminSessionAction,
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
    const user = { id: "admin-1", email: "admin@example.com" };
    mocks.publicAuth.session = {
      access_token: "stable-admin-token",
      user,
    };
    mocks.publicAuth.user = user;
    mocks.publicAuth.loading = false;
    mocks.createClient.mockReturnValue({
      auth: {
        signOut: mocks.signOut,
        signInWithPassword: mocks.signInWithPassword,
      },
    });
    mocks.verifyAdminAction.mockResolvedValue({ allowed: true, email: "admin@example.com" });
  });

  it("verifies one stable session only once for multiple admin consumers", async () => {
    render(
      React.createElement(
        AdminAuthProvider,
        null,
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Consumer, { label: "first" }),
          React.createElement(Consumer, { label: "second" }),
          React.createElement(Consumer, { label: "third" }),
        ),
      ),
    );

    await waitFor(() => {
      expect(screen.getByTestId("first")).toHaveTextContent("true");
      expect(screen.getByTestId("second")).toHaveTextContent("true");
      expect(screen.getByTestId("third")).toHaveTextContent("true");
    });

    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.verifyAdminAction).toHaveBeenCalledTimes(1);
    expect(mocks.verifyAdminAction).toHaveBeenCalledWith("stable-admin-token");
  });
});
