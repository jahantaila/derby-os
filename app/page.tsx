import Link from "next/link";
import { ClipboardList, Calendar, Target, Brain, FileText, Users, User, RefreshCw, DollarSign, Megaphone, Wallet, Search, UtensilsCrossed, Building2 } from "lucide-react";

const cards = [
  { href: "/tasks", label: "Tasks", icon: ClipboardList, desc: "Kanban board for all tasks", color: "text-blue-400" },
  { href: "/calendar", label: "Calendar", icon: Calendar, desc: "Scheduled jobs & events", color: "text-green-400" },
  { href: "/projects", label: "Projects", icon: Target, desc: "Track all projects", color: "text-purple-400" },
  { href: "/memory", label: "Memory", icon: Brain, desc: "Agent memory & notes", color: "text-pink-400" },
  { href: "/docs", label: "Docs", icon: FileText, desc: "Documents & templates", color: "text-yellow-400" },
  { href: "/team", label: "Team", icon: Users, desc: "Org chart & agents", color: "text-cyan-400" },
  { href: "/clients", label: "Clients", icon: User, desc: "Client management", color: "text-orange-400" },
  { href: "/pipeline", label: "Pipeline", icon: RefreshCw, desc: "Sales pipeline CRM", color: "text-emerald-400" },
  { href: "/revenue", label: "Revenue", icon: DollarSign, desc: "Revenue dashboard", color: "text-green-400" },
  { href: "/ad-templates", label: "Ad Templates", icon: Megaphone, desc: "Ad copy library", color: "text-red-400" },
  { href: "/finance", label: "Finance", icon: Wallet, desc: "P&L & expenses", color: "text-lime-400" },
  { href: "/competitors", label: "Competitors", icon: Search, desc: "Competitor intel", color: "text-amber-400" },
  { href: "/derbyflow", label: "DerbyFlow", icon: UtensilsCrossed, desc: "Platform admin", color: "text-indigo-400" },
  { href: "/office", label: "Office", icon: Building2, desc: "Virtual office", color: "text-violet-400" },
];

export default function Home() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Mission Control</h1>
        <p className="text-muted-foreground">Derby Digital&apos;s command center. Everything you need in one place.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Link key={c.href} href={c.href} className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 hover:bg-accent transition-all group">
            <c.icon className={`${c.color} mb-3 group-hover:scale-110 transition-transform`} size={28} />
            <h3 className="font-semibold mb-1">{c.label}</h3>
            <p className="text-xs text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
