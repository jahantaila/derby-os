"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ClipboardList, Calendar, Target, Brain, FileText, Users, User,
  RefreshCw, DollarSign, Megaphone, Wallet, Search, UtensilsCrossed,
  Building2, ChevronLeft, ChevronRight
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/projects", label: "Projects", icon: Target },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/docs", label: "Docs", icon: FileText },
  { href: "/team", label: "Team", icon: Users },
  { href: "/clients", label: "Clients", icon: User },
  { href: "/pipeline", label: "Pipeline", icon: RefreshCw },
  { href: "/revenue", label: "Revenue", icon: DollarSign },
  { href: "/ad-templates", label: "Ad Templates", icon: Megaphone },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/competitors", label: "Competitors", icon: Search },
  { href: "/derbyflow", label: "DerbyFlow", icon: UtensilsCrossed },
  { href: "/office", label: "Office", icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "h-screen bg-card border-r border-border flex flex-col transition-all duration-200",
      collapsed ? "w-16" : "w-56"
    )}>
      <div className="p-4 flex items-center justify-between border-b border-border">
        {!collapsed && (
          <Link href="/" className="font-bold text-sm text-primary">Derby Digital</Link>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-accent rounded">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 mx-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
