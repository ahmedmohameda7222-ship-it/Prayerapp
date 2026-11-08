import { pathToFileURL } from 'node:url';

const MAX_JSON_BYTES = 160 * 1024;
const MAX_FEED_AGE_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10000;
const TARGETS = [
  { service: 'web', url: 'https://donaumoschee.vercel.app/api/health' },
  { service: 'tv', url: 'https://donaumoschee-tv.vercel.app/api/display-feed' },
];

async function readBoundedJson(response) {
  const declaredSize = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_JSON_BYTES) throw new Error('oversized');
  if (!response.body) throw new Error('missing_body');
  const reader = response.body.getReader();
  const parts = [];
  let bytes = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_JSON_BYTES) throw new Error('oversized');
      parts.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}

function mosqueLocalDate(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const fields = Object.fromEntries(parts.map(({type, value}) => [type, value]));
  return fields.year + '-' + fields.month + '-' + fields.day;
}

function validFeed(value, now, serverDate) {
  if (!value || value.schemaVersion !== 1 || typeof value.timezone !== 'string') return false;
  // Feed generatedAt is a stable logical content revision and can be in year 9999.
  // The forwarded HTTP Date is the correct signal for response freshness.
  if (typeof value.generatedAt !== 'string' || !Number.isFinite(Date.parse(value.generatedAt))) return false;
  const servedAtMs = Date.parse(serverDate ?? '');
  if (!Number.isFinite(servedAtMs) || servedAtMs < now.getTime() - MAX_FEED_AGE_MS || servedAtMs > now.getTime() + 60000) return false;
  const localToday = mosqueLocalDate(now, value.timezone);
  return Array.isArray(value.prayers?.schedule) && value.prayers.schedule.some(day => day?.date === localToday);
}

export async function checkProductionHealth({fetchImpl = fetch, now = new Date()} = {}) {
  return Promise.all(TARGETS.map(async ({service, url}) => {
    try {
      const response = await fetchImpl(url, {
        method: 'GET', cache: 'no-store', redirect: 'error',
        headers: {accept: 'application/json'}, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status !== 200 || response.redirected) {
        return {service, ok: false, reason: 'http_' + response.status};
      }
      if (!(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
        return {service, ok: false, reason: 'invalid_content_type'};
      }
      const json = await readBoundedJson(response);
      const ok = service === 'web'
        ? json?.status === 'ok' && json?.database === 'ok'
        : validFeed(json, now, response.headers.get('date'));
      return {service, ok, reason: ok ? 'healthy' : 'invalid_health_payload'};
    } catch {
      // Deliberately do not log response bodies, URLs with credentials, or provider errors.
      return {service, ok: false, reason: 'request_or_payload_failure'};
    }
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const checks = await checkProductionHealth();
  for (const check of checks) {
    console.log('[' + (check.ok ? 'OK' : 'FAIL') + '] ' + check.service + ': ' + check.reason);
  }
  if (checks.some(check => !check.ok)) process.exitCode = 1;
}
