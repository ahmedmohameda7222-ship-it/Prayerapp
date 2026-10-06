"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const PublicRuntimeProviders = dynamic(() =>
  import("@/components/providers/PublicRuntimeProviders").then(
    (module) => module.PublicRuntimeProviders,
  ),
);

export function RouteRuntimeBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  return <PublicRuntimeProviders>{children}</PublicRuntimeProviders>;
}
