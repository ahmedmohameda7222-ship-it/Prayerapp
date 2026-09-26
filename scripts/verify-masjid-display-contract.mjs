import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const producerPath = new URL("../lib/masjid-display/__fixtures__/feed-v1.json", import.meta.url);
const consumerPath = new URL("../masjid-display/lib/__fixtures__/feed-v1.json", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const [producer, consumer] = await Promise.all([
  readJson(producerPath),
  readJson(consumerPath),
]);

assert.equal(producer.schemaVersion, 1, "producer fixture must use schemaVersion 1");
assert.equal(consumer.schemaVersion, 1, "consumer fixture must use schemaVersion 1");
assert.deepStrictEqual(
  consumer,
  producer,
  "Masjid Display producer/consumer Feed v1 fixtures drifted",
);

console.log("Masjid Display Feed v1 producer/consumer contract verified.");
