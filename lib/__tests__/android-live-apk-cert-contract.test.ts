import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = () => readFileSync(
  join(process.cwd(), ".github/workflows/android-download-smoke.yml"),
  "utf8",
);

describe("Android live APK certificate contract", () => {
  it("cryptographically verifies the certificate and package identity of the downloaded APK", () => {
    const source = workflow();

    expect(source).toContain("EXPECTED_CERT_SHA256: E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92");
    expect(source).toContain("actions/setup-java@v4");
    expect(source).toContain("android-actions/setup-android@v3");
    expect(source).toContain('sdkmanager "platforms;android-37.0" "build-tools;36.0.0"');
    expect(source).toContain('test "$target_sdk" = "37"');
    expect(source).toContain('test "$min_sdk" = "23"');
    expect(source).toContain("sdkVersion:'$min_sdk'");
    expect(source).toContain("apksigner verify --verbose --print-certs /tmp/danube-mosque.apk");
    expect(source).toContain('test "$actual_cert" = "$EXPECTED_CERT_SHA256"');
    expect(source).toContain('test "$metadata_cert" = "$EXPECTED_CERT_SHA256"');
    expect(source).toContain("aapt dump badging /tmp/danube-mosque.apk");
    expect(source).toContain("versionCode='$version_code' versionName='$version_name'");
    expect(source).toContain("package: name='$package_id'");
  });
});