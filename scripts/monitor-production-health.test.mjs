import test from 'node:test';
import assert from 'node:assert/strict';
import { checkProductionHealth } from './monitor-production-health.mjs';

const now = new Date('2026-11-08T12:00:00Z');
const today = '2026-11-08';
function feed(extra = {}) {
  const delays = {fajr:20, dhuhr:15, asr:15, maghrib:5, isha:10};
  const durations = {fajr:10, dhuhr:10, asr:10, maghrib:10, isha:10};
  return {
    schemaVersion: 1,
    snapshotRevision: 'a'.repeat(64),
    timezone: 'Europe/Berlin',
    generatedAt: now.toISOString(),
    mosque: {
      nameAr: 'مسجد', nameDe: 'Moschee', address: 'Deggendorf',
      publicAppUrl: 'https://donaumoschee.vercel.app',
    },
    prayers: {
      schedule: [{
        date: today, fajr:'05:30', sunrise:'07:10', dhuhr:'12:10',
        asr:'14:45', maghrib:'16:55', isha:'18:25', maghribProgram:null,
      }],
      iqamaDelays: delays,
      additionalJumuah: [],
    },
    displaySettings: {prayerDurations: durations, azkarPlaylistIds: []},
    azkar: [], announcements: [], events: [], campaigns: [],
    ...extra,
  };
}
function json(value, status = 200, init = {}) {
  return new Response(JSON.stringify(value), { status, headers: {'content-type':'application/json', date: now.toUTCString(), ...init} });
}
const root = 'https://donaumoschee.vercel.app/api/health';
const tv = 'https://donaumoschee-tv.vercel.app/api/display-feed';
function mockFetch(rootResponse = json({status:'ok',database:'ok'}), tvResponse = json(feed())) {
  const seen = [];
  return {seen, fetchImpl: async (url, options) => {
    seen.push({url, options});
    return url === root ? rootResponse : tvResponse;
  }};
}

test('monitors root health and real TV feed independently without caching or following redirects', async () => {
  const {fetchImpl, seen} = mockFetch();
  const result = await checkProductionHealth({fetchImpl, now});
  assert.deepEqual(result.map(({service, ok}) => ({service, ok})), [{service:'web',ok:true},{service:'tv',ok:true}]);
  assert.deepEqual(seen.map(x=>x.url), [root,tv]);
  for(const {options} of seen){ assert.equal(options.cache,'no-store'); assert.equal(options.redirect,'error'); assert.equal(options.headers.accept,'application/json'); }
});

test('returns failure for successful HTTP with degraded root database', async () => {
  const {fetchImpl} = mockFetch(json({status:'degraded',database:'unavailable'}));
  const result = await checkProductionHealth({fetchImpl, now});
  assert.equal(result[0].ok,false);
  assert.equal(result[1].ok,true);
});

test('detects TV feed HTTP 503 without exposing returned body', async () => {
  const {fetchImpl} = mockFetch(undefined,json({error:'internal_secret_placeholder'},503));
  const result = await checkProductionHealth({fetchImpl, now});
  assert.equal(result[1].ok,false);
  assert.ok(!JSON.stringify(result).includes('internal_secret_placeholder'));
});

test('rejects unsupported TV schema', async () => {
  const {fetchImpl} = mockFetch(undefined,json(feed({schemaVersion:2})));
  assert.equal((await checkProductionHealth({fetchImpl,now}))[1].ok,false);
});

test('rejects a missing current-day prayer schedule', async () => {
  const {fetchImpl} = mockFetch(undefined,json(feed({prayers:{schedule:[{date:'2026-11-07'}]}})));
  assert.equal((await checkProductionHealth({fetchImpl,now}))[1].ok,false);
});



test('rejects a nominally dated current-day prayer row that is missing required times', async () => {
  const payload = feed();
  payload.prayers.schedule = [{date: today}];
  const {fetchImpl} = mockFetch(undefined, json(payload));
  assert.equal((await checkProductionHealth({fetchImpl, now}))[1].ok, false);
});

test('rejects an invalid required current-day prayer clock value', async () => {
  const payload = feed();
  payload.prayers.schedule[0].fajr = '24:99';
  const {fetchImpl} = mockFetch(undefined, json(payload));
  assert.equal((await checkProductionHealth({fetchImpl, now}))[1].ok, false);
});

test('rejects a missing or invalid Iqama delay for the daily prayers', async () => {
  const payload = feed();
  payload.prayers.iqamaDelays.maghrib = undefined;
  const {fetchImpl} = mockFetch(undefined, json(payload));
  assert.equal((await checkProductionHealth({fetchImpl, now}))[1].ok, false);
});

test('rejects a feed missing mandatory TV display settings and content arrays', async () => {
  const payload = feed({displaySettings: null, events: null});
  const {fetchImpl} = mockFetch(undefined, json(payload));
  assert.equal((await checkProductionHealth({fetchImpl, now}))[1].ok, false);
});

test('accepts a stable source-version generatedAt when the response Date is fresh', async () => {
  const {fetchImpl} = mockFetch(undefined,json(feed({generatedAt:'2026-11-01T11:00:00Z'})));
  assert.equal((await checkProductionHealth({fetchImpl,now}))[1].ok,true);
});

test('accepts a logical source-version generatedAt in year 9999 with current HTTP Date', async () => {
  const {fetchImpl} = mockFetch(undefined,json(feed({generatedAt:'9999-01-01T00:00:00Z'})));
  assert.equal((await checkProductionHealth({fetchImpl,now}))[1].ok,true);
});

test('rejects a stale HTTP Date even when generatedAt happens to be near now', async () => {
  const {fetchImpl} = mockFetch(undefined,json(feed(),200,{date:'Sun, 08 Nov 2026 11:00:00 GMT'}));
  assert.equal((await checkProductionHealth({fetchImpl,now}))[1].ok,false);
});

test('rejects missing HTTP Date rather than inventing a freshness signal', async () => {
  const {fetchImpl} = mockFetch(undefined,json(feed(),200,{date:''}));
  assert.equal((await checkProductionHealth({fetchImpl,now}))[1].ok,false);
});

test('rejects impossible future HTTP Date', async () => {
  const {fetchImpl} = mockFetch(undefined,json(feed(),200,{date:'Sun, 08 Nov 2026 13:00:00 GMT'}));
  assert.equal((await checkProductionHealth({fetchImpl,now}))[1].ok,false);
});

test('handles malformed JSON as a failure on only that target', async () => {
  const {fetchImpl} = mockFetch(new Response('{broken',{status:200,headers:{'content-type':'application/json'}}));
  const r = await checkProductionHealth({fetchImpl,now});
  assert.equal(r[0].ok,false);
  assert.equal(r[1].ok,true);
});

test('rejects oversized JSON before trusting it', async () => {
  const {fetchImpl} = mockFetch(undefined,new Response('x'.repeat(200000),{status:200,headers:{'content-type':'application/json'}}));
  assert.equal((await checkProductionHealth({fetchImpl,now}))[1].ok,false);
});

test('treats network exceptions as failures and still checks the next service', async () => {
  let calls = 0;
  const r = await checkProductionHealth({fetchImpl:async (_url) => {calls++; if(calls===1) throw new Error('secret failure'); return json(feed());},now});
  assert.equal(r[0].ok,false); assert.equal(r[1].ok,true); assert.ok(!JSON.stringify(r).includes('secret failure'));
});

test('rejects invalid optional Friday extra without requiring any extra Jumuah rows', async () => {
  const baseline = feed();
  const {fetchImpl: validFetch} = mockFetch(undefined, json(baseline));
  assert.equal((await checkProductionHealth({fetchImpl: validFetch, now}))[1].ok, true);

  const invalid = feed();
  invalid.prayers.additionalJumuah = [{
    id: 'extra-1', date: '2026-11-13', prayerTime: '25:99',
  }];
  const {fetchImpl} = mockFetch(undefined, json(invalid));
  const result = await checkProductionHealth({fetchImpl, now});
  assert.equal(result[1].ok, false);
});

test('rejects duplicate prayer schedule dates that the TV Feed v1 consumer refuses', async () => {
  const invalid = feed();
  invalid.prayers.schedule.push({...invalid.prayers.schedule[0]});
  const {fetchImpl} = mockFetch(undefined, json(invalid));
  assert.equal((await checkProductionHealth({fetchImpl, now}))[1].ok, false);
});
