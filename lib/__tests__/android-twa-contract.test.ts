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
    expect(config.host).toBe("donaumoschee.vercel.app");
    expect(config.compileSdkVersion).toBe(36);
    expect(config.targetSdkVersion).toBe(36);
    expect(config.minSdkVersion).toBe(23);
    expect(config.versionCode).toBe(2);
    expect(config.versionName).toBe("1.0.0");
    expect(rootGradle).toContain("com.android.application' version '8.11.1'");
    expect(gradle).toContain("androidbrowserhelper:2.7.3");
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
    expect(manifest).toContain("SCHEDULE_EXACT_ALARM");
    expect(manifest).toContain("androidx.browser.customtabs.PostMessageService");
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
    expect(template).toContain("E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92");
    const forbiddenFingerprintPlaceholder = "REPLACE_WITH_" + "PERMANENT_RELEASE_CERT_SHA256";
    expect(template).not.toContain(forbiddenFingerprintPlaceholder);

    const productionAssetLinks = join(root, "public/.well-known/assetlinks.json");
    expect(existsSync(productionAssetLinks)).toBe(true);
    const published = readFileSync(productionAssetLinks, "utf8");
    expect(published).toContain('"package_name": "de.donaumoschee.app"');
    expect(published).toContain("delegate_permission/common.handle_all_urls");
    expect(published).toContain("delegate_permission/common.use_as_origin");
    expect(published).toContain("E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92");
    expect(published).not.toContain(forbiddenFingerprintPlaceholder);
  });

  it("keeps Android CI pinned and preserves main-only Vercel deployment", () => {
    const workflow = read(".github/workflows/android-twa.yml");
    expect(workflow).toContain("./gradlew");
    expect(workflow).toContain('sdkmanager "platforms;android-36"');
    expect(workflow).toContain(":app:testDebugUnitTest :app:lintDebug :app:assembleDebug");
    expect(workflow).toContain("ANDROID_KEYSTORE_BASE64");
    expect(workflow).toContain(":app:lintRelease :app:testReleaseUnitTest :app:assembleRelease :app:bundleRelease");
    expect(workflow).toContain("apksigner verify --verbose --print-certs");
    expect(workflow).toContain("E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92");
    expect(workflow).toContain("danube-mosque.apk");
    expect(workflow).toContain("danube-mosque.aab");

    const productionWorkflow = read(".github/workflows/android-production-release.yml");
    expect(productionWorkflow).toContain("workflow_dispatch");
    expect(productionWorkflow).toContain("contents: write");
    expect(productionWorkflow).toContain("confirmation");
    expect(productionWorkflow).toContain("PUBLISH_ANDROID_PRODUCTION");
    expect(productionWorkflow).toContain('test "$head_branch" = "main"');
    expect(productionWorkflow).toContain("gh release create");

    const vercel = JSON.parse(read("vercel.json")) as {
      git?: { deploymentEnabled?: Record<string, boolean> };
    };
    expect(vercel.git?.deploymentEnabled?.["**"]).toBe(false);
    expect(vercel.git?.deploymentEnabled?.main).toBe(true);
  });
});
