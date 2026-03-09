"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckSquare, DollarSign, Users } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const isAgents = pathname.startsWith("/agents");
  const isTasks = pathname.startsWith("/tasks");
  const isFinance = pathname.startsWith("/finance");
  const isCalendar = pathname.startsWith("/calendar");

  return (
    <aside className="sidebar-shell">
      <Link href="/" className="sidebar-logo" aria-label="Derby Digital home">
        Derby Digital
      </Link>

      <nav className="sidebar-nav" aria-label="Primary">
        <Link href="/agents" className={`sidebar-item ${isAgents ? "active" : ""}`}>
          <Users size={16} />
          <span>Agents</span>
        </Link>
        <Link href="/tasks" className={`sidebar-item ${isTasks ? "active" : ""}`}>
          <CheckSquare size={16} />
          <span>Tasks</span>
        </Link>
        <Link href="/finance" className={`sidebar-item ${isFinance ? "active" : ""}`}>
          <DollarSign size={16} />
          <span>Finance</span>
        </Link>
        <Link href="/calendar" className={`sidebar-item ${isCalendar ? "active" : ""}`}>
          <CalendarDays size={16} />
          <span>Calendar</span>
        </Link>
      </nav>
    </aside>
  );
}
