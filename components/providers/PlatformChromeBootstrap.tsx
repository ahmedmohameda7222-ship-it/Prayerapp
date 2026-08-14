const bootstrap = `(() => {
  try {
    const ua = navigator.userAgent || "";
    const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
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
