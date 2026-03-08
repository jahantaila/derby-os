"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ComponentType } from "react";
import {
  CalendarDays,
  ChartSpline,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Gauge,
  Megaphone,
  Settings,
  Users,
  Building2,
  FileText,
  Landmark,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
};

const navSections: NavItem[][] = [
  [{ href: "/", label: "Dashboard", icon: Gauge }],
  [
    { href: "/team", label: "Team", icon: Users },
    { href: "/clients", label: "Clients", icon: Building2 },
    { href: "/tasks", label: "Tasks", icon: ClipboardList },
  ],
  [
    { href: "/campaigns", label: "Campaigns", icon: Megaphone },
    { href: "/reports", label: "Reports", icon: FileText },
    { href: "/costs", label: "Costs", icon: CircleDollarSign },
  ],
  [
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/revenue", label: "Revenue", icon: ChartSpline },
    { href: "/derbyflow", label: "DerbyFlow", icon: Workflow },
  ],
  [{ href: "/settings", label: "Settings", icon: Settings }],
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "glass-surface relative flex h-[calc(100vh-1.5rem)] shrink-0 flex-col rounded-3xl transition-all duration-300",
        collapsed ? "w-[5.35rem]" : "w-[16.5rem]",
      )}
    >
      <div className="absolute inset-y-5 left-0 w-[3px] rounded-r-full derby-gradient opacity-90" />

      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        {!collapsed ? (
          <Link href="/" className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.32em] text-blue-200/80">Derby Digital</p>
            <p className="bg-gradient-to-r from-[#F5F9FF] via-[#7CB8FF] to-[#2093FF] bg-clip-text text-lg font-semibold text-transparent">
              Mission Control
            </p>
          </Link>
        ) : (
          <Link
            href="/"
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-blue-100"
          >
            <Landmark size={16} />
          </Link>
        )}

        <button
          onClick={() => setCollapsed((value) => !value)}
          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-blue-100 transition hover:border-white/25 hover:bg-white/15"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {navSections.map((section, sectionIndex) => (
          <div key={`section-${sectionIndex}`} className="space-y-1">
            {section.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm transition-all duration-300",
                    collapsed && "justify-center px-2",
                    active
                      ? "bg-white/12 text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
                      : "text-slate-300 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-y-1 left-1 w-1 rounded-full transition-all duration-300",
                      active ? "derby-gradient opacity-100" : "opacity-0 group-hover:opacity-70 derby-gradient",
                    )}
                  />
                  <item.icon
                    size={17}
                    className={cn("shrink-0 transition-transform duration-300", active && "scale-105 text-blue-200")}
                  />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );
            })}

            {sectionIndex < navSections.length - 1 ? <div className="mx-2 border-t border-white/10 pt-2" /> : null}
          </div>
        ))}
      </nav>
    </aside>
  );
}
