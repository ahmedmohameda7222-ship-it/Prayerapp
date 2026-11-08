import test from 'node:test';
import assert from 'node:assert/strict';
import { checkProductionHealth } from './monitor-production-health.mjs';

const now = new Date('2026-11-08T12:00:00Z');
const today = '2026-11-08';
function feed(extra = {}) {
  return { schemaVersion: 1, timezone: 'Europe/Berlin', generatedAt: now.toISOString(), prayers: { schedule: [{date: today}] }, ...extra };
}
function json(value, status = 200, init = {}) {
  return new Response(JSON.stringify(value), { status, headers: {'content-type':'application/json', ...init} });
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

test('rejects an outdated TV snapshot even if the clock date still matches', async () => {
  const {fetchImpl} = mockFetch(undefined,json(feed({generatedAt:'2026-11-08T11:00:00Z'})));
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
