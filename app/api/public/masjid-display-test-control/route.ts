import { getMasjidDisplayTestState } from "@/lib/data/masjid-display-test-state";
import { getMosqueSettings } from "@/lib/data/mosque-settings";
import { validatePublicAppUrl } from "@/lib/masjid-display/public-app-url";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function json(body: unknown) {
  return Response.json(body, { headers: NO_STORE_HEADERS });
}

export async function GET() {
  const state = await getMasjidDisplayTestState();
  if (
    !state?.enabled
    || !state.scenario
    || !state.payload
    || !state.startedAt
    || !state.expiresAt
    || new Date(state.expiresAt).getTime() <= Date.now()
  ) {
    return json({ active: false });
  }

  const mosque = await getMosqueSettings();
  let publicAppUrl: string | null = null;
  try {
    publicAppUrl = validatePublicAppUrl(mosque.publicAppUrl);
  } catch {
    // Test Mode is independent of QR configuration. Omit the QR when
    // the canonical Prayerapp URL is missing or invalid.
  }

  return json({
    active: true,
    scenario: state.scenario,
    startedAt: state.startedAt,
    expiresAt: state.expiresAt,
    publicAppUrl,
    payload: state.payload,
  });
}
