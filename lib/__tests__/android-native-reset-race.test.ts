import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android native reset race hardening", () => {
  it("deletes revoked native authority rows so an in-flight stale heartbeat cannot reactivate them", () => {
    const heartbeat = source("app/api/android/native-authority/heartbeat/route.ts");
    const deleteHandler = heartbeat.slice(heartbeat.indexOf("export async function DELETE"));
    expect(deleteHandler).toContain('.from("native_prayer_installations")');
    expect(deleteHandler).toContain(".delete()");
    expect(deleteHandler).toContain('.eq("installation_id", installationId)');
    expect(deleteHandler).not.toContain("native_ready: false");
  });
});
