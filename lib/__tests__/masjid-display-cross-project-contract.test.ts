import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const producerPath = "lib/masjid-display/__fixtures__/feed-v1.json";
const consumerPath = "masjid-display/lib/__fixtures__/feed-v1.json";

function readFixture(path: string) {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

describe("Masjid Display producer/consumer Feed v1 contract", () => {
  it("pins both fixtures to schemaVersion 1", () => {
    expect(readFixture(producerPath).schemaVersion).toBe(1);
    expect(readFixture(consumerPath).schemaVersion).toBe(1);
  });

  it("keeps producer and consumer fixtures semantically identical", () => {
    expect(readFixture(consumerPath)).toEqual(readFixture(producerPath));
  });
});
