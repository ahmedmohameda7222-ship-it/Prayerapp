import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

type AppShellSurface = "default" | "home" | "root";

export function AppShell({ children, surface = "default" }: { children: ReactNode; surface?: AppShellSurface }) {
  const surfaceClass = surface === "home"
    ? " home-page-shell"
    : surface === "root"
      ? " root-page-shell"
      : "";

  return (
    <main className={`page-shell public-desktop-frame public-app-shell${surfaceClass}`}>
      <div className="app-container">{children}</div>
      <BottomNav />
    </main>
  );
}
