import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

const read = (p) => readFileSync(p,'utf8');

test('TV README describes only the current feed and has no removed test-control API', () => {
 const x = read('masjid-display/README.md');
 assert.match(x,/\/api\/display-feed/);
 assert.doesNotMatch(x,/\/api\/test-control|Test Mode rendering|Test Control/);
});

test('current operations runbook exists and describes the 120s poll and failure-safe feed', () => {
 const p='docs/masjid-display/current-production-operations.md';
 assert.equal(existsSync(p),true);
 const x=read(p);
 assert.match(x,/120.seconds|120_000|two minutes/i);
 assert.match(x,/\/api\/display-feed/);
 assert.match(x,/\/api\/public\/masjid-display/);
 assert.match(x,/LKG|Last Known Good/);
 assert.doesNotMatch(x,/\/api\/test-control|Admin Test Mode/);
});

test('historical deployment runbook warns about the retired test-control instructions', () => {
 const x=read('docs/masjid-display/deployment.md');
 assert.match(x.slice(0,700),/Historical|Superseded|retired/i);
 assert.match(x.slice(0,700),/current-production-operations\.md/);
});

test('physical TV acceptance does not instruct use of deleted Test Mode', () => {
 const x=read('docs/masjid-display/physical-tv-certification.md');
 assert.doesNotMatch(x,/Admin Test Mode|Campaign Test Mode|Test Mode checklist|test-mode-demo\.md/);
 assert.match(x,/NOT EXECUTED/);
 assert.match(x,/real phone\/camera/i);
});

test('soak procedure is for the current production runtime, never the retired Test Control', () => {
 const x=read('docs/masjid-display/soak-test.md');
 assert.doesNotMatch(x,/Test Mode|Test Control|synthetic Test data/);
 assert.match(x,/24.hour|24 continuous hours/i);
 assert.match(x,/not executed/i);
});
