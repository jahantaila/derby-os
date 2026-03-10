"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, CheckSquare, DollarSign, FileText, FolderKanban, Funnel, Settings, UserRound, Users } from "lucide-react";

const PRIMARY_NAV_ITEMS = [
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/employees", label: "Employees", icon: UserRound },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/finance", label: "Finance", icon: DollarSign },
  { href: "/clients", label: "Clients", icon: BriefcaseBusiness },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/pipeline", label: "Pipeline", icon: Funnel },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/documents", label: "Documents", icon: FileText },
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
      <div className="flex items-center justify-between gap-3 md:block">
        <Link href="/" className="sidebar-logo bg-[linear-gradient(132deg,#ffffff_0%,#9FD2FF_24%,#2093FF_58%,#0026FF_100%)]" aria-label="Derby Digital home">
          Derby Digital
        </Link>

        <label className="block min-w-0 md:hidden">
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

      <nav className="sidebar-nav hidden md:grid" aria-label="Primary">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link key={item.href} href={item.href} className={`sidebar-item overflow-hidden ${isActive ? "active" : ""}`}>
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <div className="mx-1 my-2 h-px bg-white/10" aria-hidden="true" />
        {SECONDARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link key={item.href} href={item.href} className={`sidebar-item overflow-hidden ${isActive ? "active" : ""}`}>
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
