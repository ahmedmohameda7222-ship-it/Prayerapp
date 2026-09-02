const DEFAULT_WEB_PUSH_HOSTS = new Set([
  "fcm.googleapis.com",
  "android.googleapis.com",
  "push.services.mozilla.com",
  "updates.push.services.mozilla.com",
]);

function configuredWebPushHosts() {
  return new Set(
    (process.env.WEB_PUSH_ALLOWED_HOSTS || "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isAppleWebPushHost(hostname: string) {
  const suffix = ".push.apple.com";
  return hostname.endsWith(suffix) && hostname.length > suffix.length;
}

function isWindowsWebPushHost(hostname: string) {
  const root = "notify.windows.com";
  return hostname === root || hostname.endsWith(`.${root}`);
}

export function isTrustedWebPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096) return false;

  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    return false;
  }

  if (endpoint.protocol !== "https:") return false;
  if (endpoint.username || endpoint.password) return false;
  if (endpoint.port && endpoint.port !== "443") return false;

  const hostname = endpoint.hostname.toLowerCase();
  if (
    DEFAULT_WEB_PUSH_HOSTS.has(hostname)
    || isAppleWebPushHost(hostname)
    || isWindowsWebPushHost(hostname)
  ) return true;

  return configuredWebPushHosts().has(hostname);
}
