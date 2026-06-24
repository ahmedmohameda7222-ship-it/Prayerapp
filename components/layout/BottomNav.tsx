"use client";

import Link from "next/link";
import { Clock, Home, LayoutGrid, Newspaper } from "lucide-react";
import { usePathname } from "next/navigation";
import { MosqueIcon } from "@/components/ui/MosqueIcon";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/times", label: "Times", icon: Clock },
  { href: "/friday", label: "Friday", icon: MosqueIcon },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/more", label: "More", icon: LayoutGrid },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto h-[82px] max-w-[760px] rounded-t-[28px] bg-gradient-to-br from-[var(--color-emerald-dark)] to-[var(--color-emerald)] px-3 pt-3 shadow-[0_-8px_28px_rgba(6,43,38,0.18)]">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link href={item.href} key={item.href} className={`bottom-nav-link ${active ? "bottom-nav-link-active" : "bottom-nav-link-inactive"}`}>
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
