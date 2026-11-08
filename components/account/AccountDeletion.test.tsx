import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/lib/i18n/context";
import AccountPage from "@/app/account/page";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(async () => ({ error: null })),
  detachAccount: vi.fn(async () => undefined),
  fetch: vi.fn(),
  getRegistration: vi.fn(),
  getSubscription: vi.fn(),
  unsubscribe: vi.fn(async () => true),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/layout/PageHeader", () => ({ PageHeader: () => null }));
vi.mock("@/components/providers/AuthProvider", () => ({
  usePublicAuth: () => ({
    session: { access_token: "example-access-token" },
    user: { email: "test-user@example.invalid" },
    loading: false,
  }),
}));
vi.mock("@/components/providers/AppPreferencesProvider", () => ({
  useAppPreferences: () => ({ detachAccount: mocks.detachAccount }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: mocks.signOut } }),
}));

function renderAccount() {
  return render(
    <I18nProvider initialLocale="en">
      <AccountPage />
    </I18nProvider>,
  );
}

async function openDeletionDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Delete account" }));
  return screen.getByRole("alertdialog");
}

describe("self-service account deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("masjid-el-rahman-push-v1", JSON.stringify({ browserId: "example-browser" }));
    mocks.fetch.mockResolvedValue({ ok: true });
    mocks.getSubscription.mockResolvedValue({ unsubscribe: mocks.unsubscribe });
    mocks.getRegistration.mockResolvedValue({
      pushManager: { getSubscription: mocks.getSubscription },
    });
    vi.stubGlobal("fetch", mocks.fetch);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistration: mocks.getRegistration },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined });
  });

  it("requires an accessible explicit confirmation and supports cancellation", async () => {
    const user = userEvent.setup();
    renderAccount();

    const dialog = await openDeletionDialog(user);
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveTextContent("This permanently deletes your account");
    expect(mocks.fetch).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("deletes only after confirmation, unsubscribes the current browser and clears its push identity", async () => {
    const user = userEvent.setup();
    renderAccount();

    const dialog = await openDeletionDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Delete account" }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
    expect(mocks.fetch).toHaveBeenCalledWith("/api/account/delete", {
      method: "DELETE",
      headers: { Authorization: "Bearer example-access-token" },
    });
    expect(mocks.getSubscription).toHaveBeenCalledOnce();
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
    expect(localStorage.getItem("masjid-el-rahman-push-v1")).toBeNull();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("keeps the session and device subscription intact when server deletion fails", async () => {
    mocks.fetch.mockResolvedValue({ ok: false, status: 500 });
    const user = userEvent.setup();
    renderAccount();

    const dialog = await openDeletionDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Delete account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The request could not be completed");
    expect(mocks.unsubscribe).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(localStorage.getItem("masjid-el-rahman-push-v1")).not.toBeNull();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("closes the confirmation dialog with Escape without deleting anything", async () => {
    const user = userEvent.setup();
    renderAccount();

    await openDeletionDialog(user);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
