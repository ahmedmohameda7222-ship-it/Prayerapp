import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function collectFiles(path: string, out: string[] = []) {
  for (const name of readdirSync(path)) {
    const full = join(path, name);
    if (statSync(full).isDirectory()) collectFiles(full, out);
    else out.push(full);
  }
  return out;
}

describe("long-term Android TWA contract", () => {
  it("pins the permanent Android identity and current API-36 toolchain", () => {
    const config = JSON.parse(read("android-twa/twa-manifest.json")) as Record<string, unknown>;
    const gradle = read("android-twa/app/build.gradle");
    const rootGradle = read("android-twa/build.gradle");

    expect(config.packageId).toBe("de.donaumoschee.app");
    expect(config.host).toBe("masjidelrahman.vercel.app");
    expect(config.compileSdkVersion).toBe(36);
    expect(config.targetSdkVersion).toBe(36);
    expect(config.minSdkVersion).toBe(23);
    expect(rootGradle).toContain("com.android.application' version '8.11.1'");
    expect(gradle).toContain("androidbrowserhelper:2.7.2");
  });

  it("keeps localized Android launcher names and verified-origin wiring", () => {
    expect(read("android-twa/app/src/main/res/values/strings.xml")).toContain("Danube Mosque");
    expect(read("android-twa/app/src/main/res/values-ar/strings.xml")).toContain("مسجد الدوناو");
    expect(read("android-twa/app/src/main/res/values-de/strings.xml")).toContain("Donau-Moschee");
    expect(read("android-twa/app/src/main/res/values-tr/strings.xml")).toContain("Tuna Camii");

    const manifest = read("android-twa/app/src/main/AndroidManifest.xml");
    expect(manifest).toContain('android:autoVerify="true"');
    expect(manifest).toContain("android.support.customtabs.trusted.DEFAULT_URL");
    expect(manifest).toContain("TRUSTED_WEB_ACTIVITY_SERVICE");
    expect(manifest).toContain("POST_NOTIFICATIONS");
  });

  it("never tracks Android signing secrets and leaves production Asset Links explicit", () => {
    const files = collectFiles(join(root, "android-twa"));
    const forbidden = files
      .map((file) => relative(root, file))
      .filter((file) => /\.(?:jks|keystore)$/u.test(file) || file.endsWith("/signing.properties"));

    expect(forbidden).toEqual([]);
    const ignores = read(".gitignore");
    expect(ignores).toContain("/android-twa/signing.properties");
    expect(ignores).toContain("/android-twa/*.jks");

    const template = read("android-twa/assetlinks.template.json");
    expect(template).toContain('"package_name": "de.donaumoschee.app"');
    expect(template).toContain("REPLACE_WITH_PERMANENT_RELEASE_CERT_SHA256");

    const productionAssetLinks = join(root, "public/.well-known/assetlinks.json");
    if (existsSync(productionAssetLinks)) {
      const published = readFileSync(productionAssetLinks, "utf8");
      expect(published).toContain('"package_name": "de.donaumoschee.app"');
      expect(published).not.toContain("REPLACE_WITH_PERMANENT_RELEASE_CERT_SHA256");
    }
  });

  it("keeps Android CI pinned and preserves main-only Vercel deployment", () => {
    const workflow = read(".github/workflows/android-twa.yml");
    expect(workflow).toContain('gradle-version: "8.13"');
    expect(workflow).toContain('sdkmanager "platforms;android-36"');
    expect(workflow).toContain(":app:lintDebug :app:assembleDebug");

    const vercel = JSON.parse(read("vercel.json")) as {
      git?: { deploymentEnabled?: Record<string, boolean> };
    };
    expect(vercel.git?.deploymentEnabled?.["**"]).toBe(false);
    expect(vercel.git?.deploymentEnabled?.main).toBe(true);
  });
});
