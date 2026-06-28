"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { BellRing, Download, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { useTranslation } from "@/lib/i18n/use-translation";

const STORAGE_KEY = "masjid-el-rahman-notification-opt-in-v1";
const SNOOZE_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

interface StoredPromptPreference {
  dismissedUntil?: string;
  permanentlyDismissed?: boolean;
}

function hasActiveDismissal(): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as StoredPromptPreference | null;
    if (stored?.permanentlyDismissed) return true;
    if (!stored?.dismissedUntil) return false;

    const dismissedUntil = Date.parse(stored.dismissedUntil);
    return Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
  } catch {
    return false;
  }
}

function subscribeToPromptPreference() {
  return () => undefined;
}

function getClientPromptSnapshot() {
  return !hasActiveDismissal();
}

function getServerPromptSnapshot() {
  return false;
}

export function NotificationOptInPrompt() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { pushStatus, permission, busy, enableNotifications } = useAppPreferences();
  const storageAllowsPrompt = useSyncExternalStore(
    subscribeToPromptPreference,
    getClientPromptSnapshot,
    getServerPromptSnapshot
  );
  const [dismissed, setDismissed] = useState(false);

  const snoozePrompt = useCallback(() => {
    const preference: StoredPromptPreference = {
      dismissedUntil: new Date(Date.now() + SNOOZE_DURATION_MS).toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
    } catch {
      // Keep the prompt closed for this session even when storage is unavailable.
    }
    setDismissed(true);
  }, []);

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isIosInstallPrompt = pushStatus === "ios-install-required";
  const canOfferNotifications =
    (pushStatus === "disabled" || pushStatus === "error") &&
    permission !== "denied" &&
    permission !== "unsupported";
  const shouldShow =
    storageAllowsPrompt && !dismissed && !isAdminRoute && (isIosInstallPrompt || canOfferNotifications);

  if (!shouldShow) return null;

  const titleId = "notification-opt-in-title";
  const descriptionId = "notification-opt-in-description";
  const Icon = isIosInstallPrompt ? Download : BellRing;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[94px] z-[60] px-4 sm:bottom-[98px]">
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-live="polite"
        className="pointer-events-auto relative mx-auto max-w-lg overflow-hidden rounded-[24px] border border-[var(--color-gold)]/45 bg-[var(--color-card)] p-5 shadow-[0_20px_60px_rgba(6,43,38,0.3)]"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--color-emerald)] via-[var(--color-gold)] to-[var(--color-emerald)]" />

        <button
          type="button"
          onClick={snoozePrompt}
          aria-label={t("notificationPrompt.close")}
          className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full text-[var(--color-muted)] transition hover:bg-[var(--color-emerald-soft)] hover:text-[var(--color-emerald)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex items-start gap-4 pe-8">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 text-start">
            <h2 id={titleId} className="font-brand text-xl font-semibold text-[var(--color-emerald)]">
              {t(isIosInstallPrompt ? "notificationPrompt.iosTitle" : "notificationPrompt.title")}
            </h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              {t(isIosInstallPrompt ? "notificationPrompt.iosBody" : "notificationPrompt.body")}
            </p>
          </div>
        </div>

        {isIosInstallPrompt ? (
          <>
            <p className="mt-4 rounded-2xl bg-[var(--color-cream)] px-4 py-3 text-center text-sm font-bold text-[var(--color-emerald)]">
              {t("notificationPrompt.iosSteps")}
            </p>
            <Button type="button" className="mt-4 w-full" onClick={snoozePrompt}>
              {t("notificationPrompt.gotIt")}
            </Button>
          </>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button type="button" disabled={busy} onClick={() => void enableNotifications()}>
              <BellRing className="h-4 w-4" aria-hidden="true" />
              {t(busy ? "notificationPrompt.enabling" : "notificationPrompt.enable")}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={snoozePrompt}>
              {t("notificationPrompt.later")}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
