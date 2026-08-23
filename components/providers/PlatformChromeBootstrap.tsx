const bootstrap = `(() => {
  const NATIVE_BRIDGE_KEY = "__DANUBE_NATIVE_BRIDGE_BOOTSTRAP__";
  const NATIVE_ORIGIN = "https://donaumoschee.vercel.app";

  function captureNativeBridge(event) {
    try {
      if (event.origin !== "https://donaumoschee.vercel.app" || !event.ports[0] || window[NATIVE_BRIDGE_KEY]) return;
      const initial = typeof event.data === "string" ? JSON.parse(event.data) : null;
      if (!initial || initial.version !== 1 || initial.type !== "native.ready" || !initial.payload || typeof initial.payload !== "object") return;
      window[NATIVE_BRIDGE_KEY] = {
        origin: NATIVE_ORIGIN,
        data: event.data,
        port: event.ports[0],
      };
      window.removeEventListener("message", captureNativeBridge);
    } catch {}
  }

  window.addEventListener("message", captureNativeBridge);

  try {
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const touchPoints = navigator.maxTouchPoints || 0;
    const appleWebKitTouch = /AppleWebKit/i.test(ua) && touchPoints > 1 && !/Android/i.test(ua);
    const ios = /iPhone|iPad|iPod/i.test(ua)
      || (platform === "MacIntel" && touchPoints > 1)
      || (/Macintosh/i.test(ua) && touchPoints > 1)
      || appleWebKitTouch;
    const android = /Android/i.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    const root = document.documentElement;
    root.dataset.platform = ios ? "ios" : android ? "android" : "other";
    root.dataset.displayMode = standalone ? "standalone" : "browser";
  } catch {
    document.documentElement.dataset.platform = "other";
    document.documentElement.dataset.displayMode = "browser";
  }
})();`;

export function PlatformChromeBootstrap() {
  return <script dangerouslySetInnerHTML={{ __html: bootstrap }} />;
}
