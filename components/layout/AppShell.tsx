import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="page-shell public-desktop-frame">
      <div className="app-container">{children}</div>
      <BottomNav />
    </main>
  );
}
