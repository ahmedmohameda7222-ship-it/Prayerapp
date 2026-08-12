import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children, surface = "default" }: { children: ReactNode; surface?: "default" | "home" }) {
  const surfaceClass = surface === "home" ? " home-page-shell" : "";
  return (
    <main className={`page-shell public-desktop-frame${surfaceClass}`}>
      <div className="app-container">{children}</div>
      <BottomNav />
    </main>
  );
}
