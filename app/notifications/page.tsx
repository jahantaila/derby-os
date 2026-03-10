"use client";

import { useMemo, useState } from "react";
import { Bell, Bot, CalendarDays, CheckCheck, CircleDot, CreditCard, FileText, Funnel, Inbox } from "lucide-react";

type NotificationType = "agent" | "pipeline" | "finance" | "document" | "calendar";
type NotificationFilter = "all" | "agent" | "pipeline" | "finance" | "document";
type NotificationRecord = {
  id: string;
  title: string;
  timestamp: string;
  type: NotificationType;
  read: boolean;
};

const INITIAL_NOTIFICATIONS: NotificationRecord[] = [
  { id: "n1", title: "Kevin completed: Tasks page overhaul", timestamp: "2 hours ago", type: "agent", read: false },
  { id: "n2", title: "New lead: Chappells Nashville", timestamp: "4 hours ago", type: "pipeline", read: false },
  { id: "n3", title: "Finance data synced for March", timestamp: "6 hours ago", type: "finance", read: true },
  { id: "n4", title: "Sabri generated Bluegrass ad copy", timestamp: "8 hours ago", type: "document", read: false },
  { id: "n5", title: "Calendar: Team sync meeting tomorrow", timestamp: "12 hours ago", type: "calendar", read: true },
];

const FILTERS: Array<{ key: NotificationFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "agent", label: "Agents" },
  { key: "pipeline", label: "Pipeline" },
  { key: "finance", label: "Finance" },
  { key: "document", label: "Documents" },
];

const TYPE_META: Record<NotificationType, { label: string; icon: typeof Bell; iconClass: string }> = {
  agent: { label: "Agent", icon: Bot, iconClass: "text-blue-100 bg-blue-500/12 border-blue-400/30" },
  pipeline: { label: "Pipeline", icon: Funnel, iconClass: "text-cyan-100 bg-cyan-500/12 border-cyan-400/30" },
  finance: { label: "Finance", icon: CreditCard, iconClass: "text-emerald-100 bg-emerald-500/12 border-emerald-400/30" },
  document: { label: "Document", icon: FileText, iconClass: "text-indigo-100 bg-indigo-500/12 border-indigo-400/30" },
  calendar: { label: "Calendar", icon: CalendarDays, iconClass: "text-sky-100 bg-sky-500/12 border-sky-400/30" },
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => filter === "all" || notification.type === filter),
    [filter, notifications],
  );

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  function markAllAsRead() {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }

  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="glass-panel page-header p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Inbox</p>
            <h1 className="page-title mt-2">Notifications</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Agent completions, pipeline alerts, finance syncs, and document activity in one stream.</p>
          </div>
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.2),rgba(0,38,255,0.18))] px-4 py-2 text-sm font-semibold text-blue-50 transition hover:border-blue-300/60 hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]"
          >
            <CheckCheck size={16} />
            Mark all as read
          </button>
        </div>
      </div>

      <div className="glass-panel p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                filter === item.key ? "border-blue-300/45 bg-blue-500/15 text-blue-50" : "border-white/12 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {visibleNotifications.length ? (
            visibleNotifications.map((notification, index) => {
              const meta = TYPE_META[notification.type];
              const Icon = meta.icon;

              return (
                <article
                  key={notification.id}
                  className="glass-card animate-enter flex items-start gap-4 rounded-2xl p-4"
                  style={{ animationDelay: `${100 + index * 60}ms` }}
                >
                  <div className={`rounded-2xl border p-3 ${meta.iconClass}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-white">{notification.title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                          <span>{meta.label}</span>
                          <span className="text-slate-600">•</span>
                          <span>{notification.timestamp}</span>
                        </div>
                      </div>
                      <CircleDot size={12} className={notification.read ? "text-slate-600" : "text-[#2093FF]"} />
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="glass-card flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-300">
                <Inbox size={22} />
              </div>
              <div>
                <h2 className="heading-font text-2xl font-normal uppercase tracking-[0.04em] text-white">No Notifications</h2>
                <p className="mt-2 text-sm text-slate-400">There are no notifications in the current filter.</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 text-xs uppercase tracking-[0.16em] text-slate-500">
          {unreadCount} unread across all notifications
        </div>
      </div>
    </section>
  );
}
