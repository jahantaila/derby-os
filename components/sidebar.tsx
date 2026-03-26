"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookUser, Brain, Building2, CalendarDays, CheckSquare, DollarSign, Settings, Target, Users } from "lucide-react";

const PRIMARY_NAV_ITEMS = [
  { href: "/office", label: "Office", icon: Building2 },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },

  { href: "/rolodex", label: "Rolodex", icon: BookUser },
  { href: "/spothopper", label: "Intel", icon: Target },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/finance", label: "Finance", icon: DollarSign },

] as const;

const SECONDARY_NAV_ITEMS = [{ href: "/settings", label: "Settings", icon: Settings }] as const;
const NAV_ITEMS = [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS] as const;

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const currentHref =
    NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href ?? "/agents";

  return (
    <aside className="sidebar-shell">
      {/* Mobile: dropdown */}
      <div className="flex items-center justify-between gap-3 md:hidden">
        <Link href="/" className="sidebar-logo bg-[linear-gradient(132deg,#ffffff_0%,#9FD2FF_24%,#2093FF_58%,#0026FF_100%)]" aria-label="Derby Digital home">
          DD
        </Link>
        <label className="block min-w-0">
          <span className="sr-only">Navigate to page</span>
          <select
            value={currentHref}
            onChange={(event) => router.push(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/85 px-3 py-2.5 text-sm font-medium text-slate-100 outline-none transition focus:border-blue-400/60"
            aria-label="Primary navigation"
          >
            {NAV_ITEMS.map((item) => (
              <option key={item.href} value={item.href}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Desktop: icon rail */}
      <div className="hidden md:flex md:flex-col md:items-center md:h-full">
        {/* Logo mark */}
        <Link
          href="/"
          className="sidebar-logo-mark"
          aria-label="Derby Digital home"
        >
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase bg-[linear-gradient(132deg,#ffffff_0%,#9FD2FF_24%,#2093FF_58%,#0026FF_100%)] bg-clip-text text-transparent">
            DD
          </span>
        </Link>

        {/* Primary nav */}
        <nav className="sidebar-rail-nav" aria-label="Primary">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-rail-item ${isActive ? "active" : ""}`}
                aria-label={item.label}
              >
                <Icon size={18} />
                <span className="sidebar-rail-tooltip">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Secondary nav */}
        <nav className="sidebar-rail-nav" aria-label="Secondary">
          <div className="mx-auto mb-2 w-6 h-px bg-white/10" aria-hidden="true" />
          {SECONDARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-rail-item ${isActive ? "active" : ""}`}
                aria-label={item.label}
              >
                <Icon size={18} />
                <span className="sidebar-rail-tooltip">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
