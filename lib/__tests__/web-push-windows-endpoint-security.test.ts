import { describe, expect, it } from "vitest";
import { isTrustedWebPushEndpoint } from "@/lib/security/web-push-endpoint";

describe("Windows Push Notification Service endpoint allowlist", () => {
  it("accepts Microsoft WNS notify.windows.com subdomains without accepting lookalikes", () => {
    expect(isTrustedWebPushEndpoint("https://dm3p.notify.windows.com/w/?token=example")).toBe(true);
    expect(isTrustedWebPushEndpoint("https://wns2-by3p.notify.windows.com/w/?token=example")).toBe(true);

    expect(isTrustedWebPushEndpoint("https://notify.windows.com.evil.example/w/?token=example")).toBe(false);
    expect(isTrustedWebPushEndpoint("https://evilnotify.windows.com/w/?token=example")).toBe(false);
    expect(isTrustedWebPushEndpoint("https://notify.windows.com@evil.example/w/?token=example")).toBe(false);
  });
});
