"use server";

import { revalidatePath } from "next/cache";
import { requireAllowedAdminIdentity } from "@/lib/auth/admin-server";
import { getPrayerSettings, savePrayerSettings } from "@/lib/data/prayer-settings";
import {
  calibrateAgainstHistoricalSchedule,
  commitFutureRecalculation,
  commitScheduleExtension,
  previewFutureRecalculation,
  previewScheduleExtension,
} from "@/lib/prayer-engine/server";
import type { PrayerScheduleDiff, PrayerSchedulePreview } from "@/lib/prayer-engine/generate";
import type { PrayerCalculationSettings } from "@/lib/prayer-engine/types";
import { validatePrayerCalculationSettings } from "@/lib/prayer-engine/validate-settings";
import {
  PRODUCTION_PRAYER_PROFILE_APPROVED,
  PRODUCTION_PRAYER_PROFILE_APPROVAL_REASON,
} from "@/lib/prayer-engine/production-approval";
import { adminActionError, beginAdminAudit, completeAdminAudit } from "@/lib/security/admin-audit";

export type PrayerEngineActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function requireAdmin(token: string) {
  await requireAllowedAdminIdentity(token);
}

export async function loadPrayerEngineSettingsAction(
  token: string,
): Promise<PrayerEngineActionResult<PrayerCalculationSettings | null>> {
  try {
    await requireAdmin(token);
    return { success: true, data: await getPrayerSettings() };
  } catch (error) {
    return { success: false, error: adminActionError(error, "admin.errors.unauthorized") };
  }
}

export async function savePrayerEngineSettingsAction(
  token: string,
  input: unknown,
): Promise<PrayerEngineActionResult<PrayerCalculationSettings>> {
  let audit;
  try {
    audit = await beginAdminAudit(token, {
      action: "prayer_engine.settings.update",
      entityType: "prayer_settings",
      entityId: "1",
    });
  } catch (error) {
    return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") };
  }

  let result: PrayerEngineActionResult<PrayerCalculationSettings>;
  try {
    const validated = validatePrayerCalculationSettings(input);
    const saved = await savePrayerSettings(validated);
    revalidatePath("/admin/prayer-engine");
    result = { success: true, data: saved };
  } catch (error) {
    result = { success: false, error: error instanceof Error ? error.message : "admin.errors.invalidInput" };
  }
  return completeAdminAudit(audit, result);
}

export async function calibratePrayerEngineAction(
  token: string,
  startDate: string,
  endDate: string,
) {
  try {
    await requireAdmin(token);
    const report = await calibrateAgainstHistoricalSchedule(startDate, endDate);
    return { success: true, data: report } as const;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Calibration failed" } as const;
  }
}

export async function previewPrayerScheduleExtensionAction(
  token: string,
): Promise<PrayerEngineActionResult<PrayerSchedulePreview>> {
  try {
    await requireAdmin(token);
    return { success: true, data: await previewScheduleExtension() };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Preview failed" };
  }
}

export async function commitPrayerScheduleExtensionAction(
  token: string,
  preview: PrayerSchedulePreview,
): Promise<PrayerEngineActionResult<number>> {
  if (!PRODUCTION_PRAYER_PROFILE_APPROVED) {
    return { success: false, error: PRODUCTION_PRAYER_PROFILE_APPROVAL_REASON };
  }
  let audit;
  try {
    audit = await beginAdminAudit(token, {
      action: "prayer_engine.schedule.extend",
      entityType: "prayer_times",
      metadata: { startDate: preview.startDate, endDate: preview.endDate, settingsRevision: preview.settingsRevision },
    });
  } catch (error) {
    return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") };
  }

  let result: PrayerEngineActionResult<number>;
  try {
    const count = await commitScheduleExtension(preview);
    revalidatePath("/admin/prayer-engine");
    revalidatePath("/admin/prayer-times");
    revalidatePath("/times");
    revalidatePath("/");
    result = { success: true, data: count };
  } catch (error) {
    result = { success: false, error: error instanceof Error ? error.message : "Schedule extension failed" };
  }
  return completeAdminAudit(audit, result);
}

export async function previewPrayerRecalculationAction(
  token: string,
  startDate: string,
  endDate: string,
): Promise<PrayerEngineActionResult<PrayerScheduleDiff>> {
  try {
    await requireAdmin(token);
    return { success: true, data: await previewFutureRecalculation(startDate, endDate) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Preview failed" };
  }
}

export async function commitPrayerRecalculationAction(
  token: string,
  preview: PrayerScheduleDiff,
): Promise<PrayerEngineActionResult<number>> {
  if (!PRODUCTION_PRAYER_PROFILE_APPROVED) {
    return { success: false, error: PRODUCTION_PRAYER_PROFILE_APPROVAL_REASON };
  }
  let audit;
  try {
    audit = await beginAdminAudit(token, {
      action: "prayer_engine.schedule.recalculate",
      entityType: "prayer_times",
      metadata: {
        startDate: preview.startDate,
        endDate: preview.endDate,
        settingsRevision: preview.settingsRevision,
        changedRowCount: preview.changedRowCount,
      },
    });
  } catch (error) {
    return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") };
  }

  let result: PrayerEngineActionResult<number>;
  try {
    const count = await commitFutureRecalculation(preview);
    revalidatePath("/admin/prayer-engine");
    revalidatePath("/admin/prayer-times");
    revalidatePath("/times");
    revalidatePath("/");
    result = { success: true, data: count };
  } catch (error) {
    result = { success: false, error: error instanceof Error ? error.message : "Recalculation failed" };
  }
  return completeAdminAudit(audit, result);
}
