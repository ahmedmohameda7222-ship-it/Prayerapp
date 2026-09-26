"use server";

import { requireAllowedAdminIdentity } from "@/lib/auth/admin-server";
import { getRuntimePrayerTimezone } from "@/lib/data/prayer-settings";
import { todayIso } from "@/lib/date-utils";
import { adminActionError } from "@/lib/security/admin-audit";

export type AdminRuntimeDateActionResult = {
  success: boolean;
  data?: {
    today: string;
    timezone: string;
  };
  error?: string;
};

export async function loadAdminRuntimeDateAction(
  token: string,
): Promise<AdminRuntimeDateActionResult> {
  try {
    await requireAllowedAdminIdentity(token);
    const timezone = await getRuntimePrayerTimezone();
    return {
      success: true,
      data: {
        today: todayIso(new Date(), timezone),
        timezone,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Unable to load mosque runtime date"),
    };
  }
}
