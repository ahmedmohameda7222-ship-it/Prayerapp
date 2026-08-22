import { describe, expect, it } from "vitest";
import { classifyAndroidUpdate } from "@/lib/android-update";

const release = { versionCode: 4, minimumSupportedVersionCode: 3 };

describe("Android update classification", () => {
  it("never offers a downgrade or reinstall for the current APK", () => {
    expect(classifyAndroidUpdate(5, release)).toBe("current");
    expect(classifyAndroidUpdate(4, release)).toBe("current");
  });

  it("offers a normal update above the supported floor", () => {
    expect(classifyAndroidUpdate(3, release)).toBe("optional");
  });

  it("requires an update only below minimumSupportedVersionCode", () => {
    expect(classifyAndroidUpdate(2, release)).toBe("required");
  });
});
