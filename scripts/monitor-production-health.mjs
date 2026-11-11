import { pathToFileURL } from 'node:url';

const MAX_JSON_BYTES = 160 * 1024;
const MAX_FEED_AGE_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10000;
const PRAYER_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const CLOCK_NAMES = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const CLOCK_HH_MM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
const REVISION_SHA256 = /^[a-f0-9]{64}$/;
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

function validDate(value) {
  if (typeof value !== 'string' || !DATE_YYYY_MM_DD.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validBoundedNumbers(source, keys, min, max) {
  return source && typeof source === 'object' && !Array.isArray(source)
    && keys.every(key => Number.isInteger(source[key]) && source[key] >= min && source[key] <= max);
}

function validMaghribProgram(program) {
  if (program === null) return true;
  return program && typeof program === 'object' && !Array.isArray(program)
    && typeof program.enabled === 'boolean'
    && (program.lessonTitle === null || (typeof program.lessonTitle === 'string' && program.lessonTitle.trim() !== ''))
    && (program.lessonDurationMinutes === null || (Number.isInteger(program.lessonDurationMinutes) && program.lessonDurationMinutes >= 1 && program.lessonDurationMinutes <= 240))
    && (program.combinedIshaTime === null || CLOCK_HH_MM.test(program.combinedIshaTime));
}

function validPrayerDay(day) {
  return day && typeof day === 'object' && !Array.isArray(day)
    && validDate(day.date)
    && CLOCK_NAMES.every(name => typeof day[name] === 'string' && CLOCK_HH_MM.test(day[name]))
    && Boolean(validMaghribProgram(day.maghribProgram));
}

function validOptionalFridayServices(services) {
  if (!Array.isArray(services)) return false;
  const seenIds = new Set();
  for (const service of services) {
    if (!service || typeof service !== 'object' || Array.isArray(service)) return false;
    const keys = Object.keys(service);
    if (keys.length !== 3 || !['id', 'date', 'prayerTime'].every(key => keys.includes(key))) return false;
    if (typeof service.id !== 'string' || service.id.trim().length === 0 || seenIds.has(service.id)) return false;
    if (!validDate(service.date) || typeof service.prayerTime !== 'string' || !CLOCK_HH_MM.test(service.prayerTime)) return false;
    seenIds.add(service.id);
  }
  // No additional Friday services is normal; Primary always comes from Dhuhr.
  return true;
}

function ascendingUniqueDays(schedule) {
  return schedule.every((day, index) => index === 0 || day.date > schedule[index - 1].date);
}

function validFeedCore(value) {
  // These are the core fields the TV's Feed v1 consumer requires for rendering.
  // The root producer remains the authority for the full published DTO contract.
  const prayers = value.prayers;
  const displaySettings = value.displaySettings;
  const mosque = value.mosque;
  return typeof value.snapshotRevision === 'string'
    && REVISION_SHA256.test(value.snapshotRevision)
    && mosque && typeof mosque === 'object' && !Array.isArray(mosque)
    && ['nameAr', 'nameDe', 'address', 'publicAppUrl'].every(key => typeof mosque[key] === 'string' && mosque[key].trim().length > 0)
    && Array.isArray(prayers?.schedule)
    && prayers.schedule.length > 0
    && prayers.schedule.every(validPrayerDay)
    && ascendingUniqueDays(prayers.schedule)
    && validOptionalFridayServices(prayers.additionalJumuah)
    && validBoundedNumbers(prayers.iqamaDelays, PRAYER_NAMES, 0, 180)
    && validBoundedNumbers(displaySettings?.prayerDurations, PRAYER_NAMES, 2, 120)
    && Array.isArray(displaySettings?.azkarPlaylistIds)
    && ['azkar', 'announcements', 'events', 'campaigns'].every(key => Array.isArray(value[key]));
}

function validFeed(value, now, serverDate) {
  if (!value || value.schemaVersion !== 1 || typeof value.timezone !== 'string') return false;
  // Feed generatedAt is a stable logical content revision and can be in year 9999.
  // The forwarded HTTP Date is the correct signal for response freshness.
  if (typeof value.generatedAt !== 'string' || !Number.isFinite(Date.parse(value.generatedAt))) return false;
  const servedAtMs = Date.parse(serverDate ?? '');
  if (!Number.isFinite(servedAtMs) || servedAtMs < now.getTime() - MAX_FEED_AGE_MS || servedAtMs > now.getTime() + 60000) return false;
  const localToday = mosqueLocalDate(now, value.timezone);
  return Boolean(validFeedCore(value)
    && value.prayers.schedule.some(day => day.date === localToday));
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
