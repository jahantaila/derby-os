"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  Briefcase,
  Brain,
  Building2,
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  Command,
  FileText,
  FolderKanban,
  HandCoins,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  Target,
  Users,
  UserSquare2,
  X,
} from "lucide-react";

type CommandCategory = "Pages" | "Actions";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  category: CommandCategory;
  keywords: string[];
};

const PAGE_ITEMS: CommandItem[] = [
  {
    id: "page-dashboard",
    label: "Dashboard",
    description: "Mission control overview",
    href: "/",
    icon: LayoutDashboard,
    category: "Pages",
    keywords: ["home", "overview", "mission control"],
  },
  {
    id: "page-tasks",
    label: "Tasks",
    description: "Track execution across the team",
    href: "/tasks",
    icon: CheckSquare,
    category: "Pages",
    keywords: ["todo", "work", "assignments"],
  },
  {
    id: "page-agents",
    label: "Agents",
    description: "Browse AI operators and staff",
    href: "/agents",
    icon: Users,
    category: "Pages",
    keywords: ["team", "operators", "people"],
  },
  {
    id: "page-finance",
    label: "Finance",
    description: "Revenue, spend, and performance",
    href: "/finance",
    icon: CircleDollarSign,
    category: "Pages",
    keywords: ["money", "budget", "revenue"],
  },
  {
    id: "page-calendar",
    label: "Calendar",
    description: "Timeline, events, and scheduling",
    href: "/calendar",
    icon: CalendarDays,
    category: "Pages",
    keywords: ["schedule", "events", "dates"],
  },
  {
    id: "page-memory",
    label: "Memory",
    description: "Persistent notes and recall",
    href: "/memory",
    icon: Brain,
    category: "Pages",
    keywords: ["notes", "knowledge", "archive"],
  },
  {
    id: "page-settings",
    label: "Settings",
    description: "Configure workspace behavior",
    href: "/settings",
    icon: Settings,
    category: "Pages",
    keywords: ["preferences", "config", "options"],
  },
  {
    id: "page-office",
    label: "Office",
    description: "Immersive office environment",
    href: "/office",
    icon: Building2,
    category: "Pages",
    keywords: ["workspace", "hq", "room"],
  },
  {
    id: "page-notifications",
    label: "Notifications",
    description: "Recent alerts and updates",
    href: "/notifications",
    icon: Bell,
    category: "Pages",
    keywords: ["alerts", "activity", "inbox"],
  },
  {
    id: "page-clients",
    label: "Clients",
    description: "Customer records and onboarding",
    href: "/clients",
    icon: Briefcase,
    category: "Pages",
    keywords: ["accounts", "customers", "crm"],
  },
  {
    id: "page-projects",
    label: "Projects",
    description: "Delivery pipeline and status",
    href: "/projects",
    icon: FolderKanban,
    category: "Pages",
    keywords: ["roadmap", "workstreams", "delivery"],
  },
  {
    id: "page-documents",
    label: "Documents",
    description: "Shared docs and knowledge base",
    href: "/documents",
    icon: FileText,
    category: "Pages",
    keywords: ["docs", "files", "wiki"],
  },
  {
    id: "page-intel",
    label: "Intel",
    description: "Competitive and market intelligence",
    href: "/intel",
    icon: Target,
    category: "Pages",
    keywords: ["research", "signals", "insights"],
  },
  {
    id: "page-employees",
    label: "Employees",
    description: "Internal team directory",
    href: "/employees",
    icon: UserSquare2,
    category: "Pages",
    keywords: ["staff", "directory", "people"],
  },
  {
    id: "page-rolodex",
    label: "Rolodex",
    description: "Contacts, relationships, and network",
    href: "/rolodex",
    icon: Users,
    category: "Pages",
    keywords: ["contacts", "relationships", "network"],
  },
  {
    id: "page-invoices",
    label: "Invoices",
    description: "Billing records and payment status",
    href: "/invoices",
    icon: HandCoins,
    category: "Pages",
    keywords: ["billing", "payments", "accounts receivable"],
  },
  {
    id: "page-spothopper",
    label: "SpotHopper",
    description: "SpotHopper client workspace",
    href: "/spothopper",
    icon: Sparkles,
    category: "Pages",
    keywords: ["client", "restaurant", "campaigns"],
  },
];

const ACTION_ITEMS: CommandItem[] = PAGE_ITEMS.map((item) => ({
  ...item,
  id: item.id.replace("page-", "action-"),
  label: item.href === "/" ? "Go to Dashboard" : `Open ${item.label}`,
  description: item.description,
  category: "Actions",
  keywords: [...item.keywords, "open", "go", "navigate", item.label.toLowerCase()],
}));

const COMMAND_ITEMS = [...PAGE_ITEMS, ...ACTION_ITEMS];
const GROUP_ORDER: CommandCategory[] = ["Pages", "Actions"];

function fuzzyScore(item: CommandItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return item.category === "Pages" ? 200 : 100;
  }

  const haystacks = [item.label, item.description ?? "", item.href, ...item.keywords].map((value) =>
    value.toLowerCase(),
  );

  let bestScore = -1;

  for (const value of haystacks) {
    if (!value) {
      continue;
    }

    if (value === normalizedQuery) {
      bestScore = Math.max(bestScore, 1200);
      continue;
    }

    if (value.startsWith(normalizedQuery)) {
      bestScore = Math.max(bestScore, 900 - (value.length - normalizedQuery.length));
      continue;
    }

    const containsIndex = value.indexOf(normalizedQuery);
    if (containsIndex >= 0) {
      bestScore = Math.max(bestScore, 720 - containsIndex * 4);
    }

    let queryIndex = 0;
    let gapPenalty = 0;

    for (let valueIndex = 0; valueIndex < value.length && queryIndex < normalizedQuery.length; valueIndex += 1) {
      if (value[valueIndex] === normalizedQuery[queryIndex]) {
        gapPenalty += Math.max(0, valueIndex - queryIndex);
        queryIndex += 1;
      }
    }

    if (queryIndex === normalizedQuery.length) {
      bestScore = Math.max(bestScore, 500 - gapPenalty);
    }
  }

  return bestScore;
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = useMemo(() => {
    const scored = COMMAND_ITEMS.map((item) => ({ item, score: fuzzyScore(item, query) }))
      .filter((entry) => entry.score >= 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        if (left.item.category !== right.item.category) {
          return GROUP_ORDER.indexOf(left.item.category) - GROUP_ORDER.indexOf(right.item.category);
        }

        return left.item.label.localeCompare(right.item.label);
      })
      .slice(0, 12);

    return scored.map((entry) => entry.item);
  }, [query]);

  const groupedResults = useMemo(
    () =>
      GROUP_ORDER.map((category) => ({
        category,
        items: results.filter((item) => item.category === category),
      })).filter((group) => group.items.length > 0),
    [results],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      if (isShortcut) {
        event.preventDefault();
        setIsOpen((current) => !current);
        return;
      }

      if (!isOpen) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => (results.length === 0 ? 0 : (current + 1) % results.length));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => (results.length === 0 ? 0 : (current - 1 + results.length) % results.length));
        return;
      }

      if (event.key === "Enter") {
        const selected = results[selectedIndex];
        if (!selected) {
          return;
        }

        event.preventDefault();
        router.push(selected.href);
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, router, selectedIndex]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedIndex(0);
      resultRefs.current = [];
      return;
    }

    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const selectedResult = resultRefs.current[selectedIndex];
    selectedResult?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) {
    return null;
  }

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pb-6 pt-[12vh] sm:px-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/72 backdrop-blur-md"
        aria-label="Close command palette"
        onClick={() => setIsOpen(false)}
      />

      <div className="glass-surface soft-ring relative z-[101] w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-blue-200/15">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/60 to-transparent" aria-hidden="true" />

        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-blue-100">
            <Search size={18} />
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages and actions..."
            className="h-10 flex-1 border-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            aria-label="Search commands"
          />
          <div className="hidden items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-400 sm:flex">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
              <Command size={12} />
              K
            </span>
            <span>to close</span>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-blue-300/30 hover:text-white"
            onClick={() => setIsOpen(false)}
            aria-label="Close command palette"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[26rem] overflow-y-auto px-3 py-3 sm:px-4">
          {groupedResults.length > 0 ? (
            <div className="space-y-4">
              {groupedResults.map((group) => (
                <section key={group.category}>
                  <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {group.category}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      flatIndex += 1;
                      const itemIndex = flatIndex;
                      const isSelected = itemIndex === selectedIndex;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          ref={(node) => {
                            resultRefs.current[itemIndex] = node;
                          }}
                          type="button"
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          onClick={() => {
                            router.push(item.href);
                            setIsOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                            isSelected
                              ? "border-blue-300/25 bg-blue-400/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_30px_rgba(32,147,255,0.14)]"
                              : "border-transparent bg-white/[0.03] text-slate-200 hover:border-white/10 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${
                              isSelected
                                ? "border-blue-300/25 bg-blue-400/15 text-blue-50"
                                : "border-white/10 bg-white/5 text-slate-300"
                            }`}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">{item.label}</span>
                              <span className="hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-400 sm:inline-flex">
                                {item.category}
                              </span>
                            </div>
                            {item.description ? (
                              <p className="mt-1 truncate text-xs text-slate-400">{item.description}</p>
                            ) : null}
                          </div>
                          <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
                            <span className="font-mono">{item.href}</span>
                            <ArrowRight size={14} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-slate-300">
                <Search size={22} />
              </div>
              <p className="text-sm font-medium text-white">No matching commands</p>
              <p className="mt-2 max-w-sm text-xs leading-6 text-slate-400">
                Try a page name, route, or intent like dashboard, settings, clients, or finance.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
