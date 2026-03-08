"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const isTasks = pathname.startsWith("/tasks");

  return (
    <aside className="sidebar-shell">
      <Link href="/" className="sidebar-logo" aria-label="Derby Digital home">
        Derby Digital
      </Link>

      <nav className="sidebar-nav" aria-label="Primary">
        <Link href="/tasks" className={`sidebar-item ${isTasks ? "active" : ""}`}>
          <CheckSquare size={16} />
          <span>Tasks</span>
        </Link>
      </nav>
    </aside>
  );
}
