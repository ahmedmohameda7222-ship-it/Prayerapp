"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

const HIDDEN_PREFIXES = ["/admin"] as const;
const HIDDEN_ROUTES = new Set(["/offline"]);

export function PublicNavigation() {
  const pathname = usePathname();

  if (HIDDEN_ROUTES.has(pathname) || HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  return <BottomNav />;
}
